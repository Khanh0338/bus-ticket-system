const express = require("express");
const { Sequelize, DataTypes, Op } = require("sequelize");
const { createClient } = require("redis");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
  dialectOptions: { charset: "utf8mb4" },
  define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" }
});

const Booking = sequelize.define("Booking", {
  id: { type: DataTypes.STRING, primaryKey: true },
  trip_id: DataTypes.INTEGER,
  seat_numbers: DataTypes.STRING, // CSV
  user_id: DataTypes.STRING,
  contact_name: DataTypes.STRING,
  contact_phone: DataTypes.STRING,
  contact_email: DataTypes.STRING,
  total_amount: DataTypes.DECIMAL(10, 2),
  status: DataTypes.STRING, // PENDING_PAYMENT | CONFIRMED | CANCELLED | EXPIRED
  expires_at: DataTypes.DATE
}, { tableName: "bookings", timestamps: true });

const redisClient = createClient({ url: `redis://${process.env.REDIS_HOST}:6379` });
redisClient.on("error", (err) => console.error("Redis error:", err));

const HOLD_TTL_SECONDS = 300; // 5 phút
const TRIP_URL = process.env.TRIP_SERVICE_URL;
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL;
const TICKET_URL = process.env.TICKET_SERVICE_URL;
const USER_URL = process.env.USER_SERVICE_URL;
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL;

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function seatKey(tripId, seat) {
  return `hold:trip:${tripId}:seat:${seat}`;
}


// Tập ghế đã bán của một chuyến (các booking CONFIRMED)
async function getSoldSeats(tripId) {
  const confirmed = await Booking.findAll({ where: { trip_id: tripId, status: "CONFIRMED" } });
  const sold = new Set();
  confirmed.forEach((b) => b.seat_numbers.split(",").forEach((x) => sold.add(x)));
  return sold;
}

// Tập ghế đang được giữ tạm (khóa Redis còn hiệu lực) của một chuyến
async function getHeldSeats(tripId) {
  const prefix = `hold:trip:${tripId}:seat:`;
  const held = [];
  for await (const key of redisClient.scanIterator({ MATCH: prefix + "*", COUNT: 100 })) {
    // redis v4 có thể trả mảng hoặc chuỗi tùy phiên bản, chuẩn hóa về chuỗi
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach((k) => held.push(k.slice(prefix.length)));
  }
  return held;
}

/**
 * GET /bookings/trips/:tripId/seat-status
 * Trả về ghế đã bán + ghế đang được giữ để frontend tô xám trên sơ đồ ghế.
 * Công khai (Gateway không yêu cầu đăng nhập) vì chỉ lộ số ghế, không lộ người đặt.
 */
app.get("/bookings/trips/:tripId/seat-status", async (req, res) => {
  const sold = [...(await getSoldSeats(req.params.tripId))];
  const held = await getHeldSeats(req.params.tripId);
  res.json({ data: { sold, held } });
});

/**
 * GET /bookings/mine - lịch sử đặt vé của người dùng đang đăng nhập
 */
app.get("/bookings/mine", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return errorResponse(res, 401, "NO_USER", "Vui lòng đăng nhập");
  const bookings = await Booking.findAll({ where: { user_id: userId }, order: [["createdAt", "DESC"]] });
  res.json({ data: bookings });
});

/**
 * POST /bookings/hold
 * body: { tripId, seatNumbers: [], userId }
 * Dùng SETNX (redis: client.set với NX) để đảm bảo chỉ 1 request giữ được 1 ghế.
 * Nếu bất kỳ ghế nào đã bị giữ -> rollback các ghế đã giữ thành công trong cùng request, trả 409.
 */
app.post("/bookings/hold", async (req, res) => {
  const { tripId, seatNumbers, contactName, contactPhone, contactEmail } = req.body;
  // userId lấy từ header x-user-id do Gateway gắn sau khi đã verify JWT,
  // KHÔNG tin userId trong body (client có thể giả mạo người khác).
  const userId = req.headers["x-user-id"];
  if (!userId) return errorResponse(res, 401, "NO_USER", "Thiếu thông tin người dùng, vui lòng đăng nhập");
  if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu tripId hoặc seatNumbers");
  }
  // Thông tin khách đi xe (có thể khác người đặt: đặt hộ người thân)
  if (!contactName || !String(contactName).trim()) return errorResponse(res, 400, "INVALID_CONTACT", "Vui lòng nhập họ và tên");
  if (!/^(0|\+84)\d{9}$/.test(String(contactPhone || "").replace(/\s/g, ""))) {
    return errorResponse(res, 400, "INVALID_CONTACT", "Số điện thoại không hợp lệ (VD: 0912345678)");
  }
  if (!/^\S+@\S+\.\S+$/.test(String(contactEmail || ""))) return errorResponse(res, 400, "INVALID_CONTACT", "Email không hợp lệ");

  // Ghế đã bán (booking CONFIRMED) không còn khóa Redis nên phải kiểm tra thêm trong DB,
  // nếu không ghế vừa bán xong vẫn bị giữ lại được -> bán trùng ghế.
  const sold = await getSoldSeats(tripId);
  const soldConflict = seatNumbers.find((s) => sold.has(s));
  if (soldConflict) {
    return errorResponse(res, 409, "SEAT_ALREADY_SOLD", `Ghế ${soldConflict} đã được bán, vui lòng chọn ghế khác`);
  }

  const bookingId = uuidv4();
  const heldSeats = [];

  try {
    // Lấy thông tin chuyến để tính tiền
    const tripRes = await axios.get(`${TRIP_URL}/trips/${tripId}`);
    const trip = tripRes.data.data;

    for (const seat of seatNumbers) {
      const key = seatKey(tripId, seat);
      // NX: chỉ set nếu key chưa tồn tại -> tương đương SETNX
      const result = await redisClient.set(key, bookingId, { NX: true, EX: HOLD_TTL_SECONDS });
      if (result === null) {
        // Ghế đã bị người khác giữ -> rollback các ghế vừa giữ thành công
        for (const s of heldSeats) {
          await redisClient.del(seatKey(tripId, s));
        }
        return errorResponse(res, 409, "SEAT_ALREADY_HELD", `Ghế ${seat} đã được người khác giữ, vui lòng chọn ghế khác`);
      }
      heldSeats.push(seat);
    }

    const totalAmount = trip.price * seatNumbers.length;
    const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

    const booking = await Booking.create({
      id: bookingId,
      trip_id: tripId,
      seat_numbers: seatNumbers.join(","),
      user_id: userId,
      contact_name: String(contactName).trim(),
      contact_phone: String(contactPhone).replace(/\s/g, ""),
      contact_email: String(contactEmail).trim(),
      total_amount: totalAmount,
      status: "PENDING_PAYMENT",
      expires_at: expiresAt
    });

    res.status(201).json({ data: booking });
  } catch (err) {
    // rollback nếu lỗi giữa chừng (VD gọi Trip Service thất bại)
    for (const s of heldSeats) {
      await redisClient.del(seatKey(tripId, s));
    }
    console.error(err.message);
    errorResponse(res, 500, "HOLD_FAILED", "Không thể giữ ghế, vui lòng thử lại");
  }
});

/**
 * POST /bookings/:id/confirm
 * Điều phối SAGA (Orchestration): gọi Payment Service.
 *  - Thành công: gọi Ticket Service xuất vé, cập nhật CONFIRMED, giải phóng khóa Redis.
 *  - Thất bại: compensating transaction -> giải phóng khóa Redis, cập nhật CANCELLED.
 * body: { method?, simulateFailure? }  (simulateFailure dùng để demo nhánh thất bại)
 */
app.post("/bookings/:id/confirm", async (req, res) => {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) return errorResponse(res, 404, "BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt vé");
  if (String(booking.user_id) !== String(req.headers["x-user-id"])) {
    return errorResponse(res, 403, "FORBIDDEN", "Bạn không có quyền thao tác trên đơn này");
  }
  if (booking.status !== "PENDING_PAYMENT") {
    return errorResponse(res, 400, "INVALID_STATE", `Đơn đang ở trạng thái ${booking.status}, không thể xác nhận`);
  }

  if (new Date(booking.expires_at) < new Date()) {
    booking.status = "EXPIRED";
    await booking.save();
    return errorResponse(res, 410, "BOOKING_EXPIRED", "Đơn đã hết thời gian giữ ghế, vui lòng chọn lại");
  }

  const seats = booking.seat_numbers.split(",");
  const { method, simulateFailure } = req.body || {};

  try {
    // Bước: gọi Payment Service
    await axios.post(`${PAYMENT_URL}/payments`, {
      bookingId: booking.id,
      amount: booking.total_amount,
      method: method || "MOCK_CARD",
      simulateFailure: !!simulateFailure
    });

    // Thanh toán thành công -> xuất vé
    const ticketRes = await axios.post(`${TICKET_URL}/tickets/issue`, {
      bookingId: booking.id,
      tripId: booking.trip_id,
      seatNumbers: seats,
      userId: booking.user_id
    });

    // Ghi nhận "đã bán" vào DB TRƯỚC, rồi mới giải phóng khóa Redis -
    // đảo ngược sẽ tạo khoảnh khắc ghế không bị khóa mà cũng chưa được đánh dấu đã bán.
    booking.status = "CONFIRMED";
    await booking.save();

    for (const s of seats) {
      await redisClient.del(seatKey(booking.trip_id, s));
    }

    // Bước cuối SAGA: gửi thông báo xác nhận vé. Đây KHÔNG phải bước bắt buộc để
    // giao dịch thành công - nếu gửi thông báo lỗi, chỉ ghi log, không rollback
    // booking/vé đã xuất (khác với bước Payment vốn là bước "critical" của SAGA).
    try {
      await axios.post(`${NOTIFICATION_URL}/notifications/send`, {
        channel: "EMAIL",
        to: booking.contact_email,
        subject: "Xác nhận đặt vé xe khách thành công",
        message: `Chào ${booking.contact_name}, bạn đã đặt vé thành công cho chuyến #${booking.trip_id}, ghế ${seats.join(", ")}. Mã vé: ${ticketRes.data.data.qr_code}`
      });
    } catch (notifyErr) {
      console.error("Gửi thông báo thất bại (không ảnh hưởng giao dịch):", notifyErr.message);
    }

    res.json({ data: { booking, ticket: ticketRes.data.data } });
  } catch (err) {
    // ---- Compensating transaction ----
    for (const s of seats) {
      await redisClient.del(seatKey(booking.trip_id, s));
    }
    booking.status = "CANCELLED";
    await booking.save();

    const reason = err.response?.data?.error?.message || "Thanh toán thất bại";
    errorResponse(res, 402, "PAYMENT_FAILED", `${reason}. Ghế đã được mở lại cho người khác.`);
  }
});

app.get("/bookings/:id", async (req, res) => {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) return errorResponse(res, 404, "BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt vé");
  if (String(booking.user_id) !== String(req.headers["x-user-id"])) {
    return errorResponse(res, 403, "FORBIDDEN", "Bạn không có quyền xem đơn này");
  }
  res.json({ data: booking });
});

const PORT = process.env.PORT || 4002;

// Retry kết nối MySQL - lý do tương tự các service khác (xem ghi chú ở trip-service).
// Redis tự xóa khóa khi hết TTL, nhưng bản ghi trong MySQL vẫn là PENDING_PAYMENT.
// Job này dọn các đơn quá hạn sang EXPIRED để dữ liệu nhất quán với Redis.
function startExpiryJob() {
  setInterval(async () => {
    try {
      const [count] = await Booking.update(
        { status: "EXPIRED" },
        { where: { status: "PENDING_PAYMENT", expires_at: { [Op.lt]: new Date() } } }
      );
      if (count > 0) console.log(`[expiry-job] Đã chuyển ${count} đơn quá hạn sang EXPIRED`);
    } catch (err) {
      console.error("[expiry-job] lỗi:", err.message);
    }
  }, 60 * 1000);
}

async function startWithRetry(retries = 15, delayMs = 3000) {
  await redisClient.connect();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      app.listen(PORT, () => console.log(`Booking Service running on port ${PORT}`));
      startExpiryJob();
      return;
    } catch (err) {
      console.log(`[startup] Chưa kết nối được MySQL (lần ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

startWithRetry();
