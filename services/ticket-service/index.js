const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");
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

const Ticket = sequelize.define("Ticket", {
  booking_id: DataTypes.STRING,
  trip_id: DataTypes.INTEGER,
  seat_numbers: DataTypes.STRING, // lưu dạng CSV: "A1,A2"
  user_id: DataTypes.STRING,
  qr_code: DataTypes.STRING,
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "VALID" }, // VALID | USED
  used_at: DataTypes.DATE,
  checked_by: DataTypes.STRING
}, { tableName: "tickets", timestamps: true });

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// POST /tickets/issue (gọi nội bộ bởi Booking Service sau khi thanh toán thành công)
app.post("/tickets/issue", async (req, res) => {
  const { bookingId, tripId, seatNumbers, userId } = req.body;
  if (!bookingId || !tripId || !seatNumbers) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu dữ liệu để xuất vé");
  }
  const qr_code = "QR-" + uuidv4();
  const ticket = await Ticket.create({
    booking_id: bookingId,
    trip_id: tripId,
    seat_numbers: Array.isArray(seatNumbers) ? seatNumbers.join(",") : seatNumbers,
    user_id: userId,
    qr_code
  });
  res.status(201).json({ data: ticket });
});

// GET /tickets/lookup?code=QR-xxx  (tra cứu công khai bằng mã vé, giống chức năng "Tra cứu vé" của các hãng xe)
// Đặt TRƯỚC /tickets/:id để tránh Express hiểu nhầm "lookup" là một giá trị :id
app.get("/tickets/lookup", async (req, res) => {
  const { code } = req.query;
  if (!code) return errorResponse(res, 400, "INVALID_INPUT", "Vui lòng nhập mã vé");
  const ticket = await Ticket.findOne({ where: { qr_code: code } });
  if (!ticket) return errorResponse(res, 404, "TICKET_NOT_FOUND", "Không tìm thấy vé với mã này, vui lòng kiểm tra lại");
  res.json({ data: ticket });
});

// POST /tickets/:code/check-in - soát vé lên xe (STAFF / OPERATOR / ADMIN, Gateway đã kiểm tra vai trò)
app.post("/tickets/:code/check-in", async (req, res) => {
  const ticket = await Ticket.findOne({ where: { qr_code: req.params.code } });
  if (!ticket) return errorResponse(res, 404, "TICKET_NOT_FOUND", "Không tìm thấy vé với mã này");
  if (ticket.status === "USED") {
    return errorResponse(res, 409, "TICKET_ALREADY_USED", "Vé đã được sử dụng lúc " + new Date(ticket.used_at).toLocaleString("vi-VN"));
  }
  ticket.status = "USED";
  ticket.used_at = new Date();
  ticket.checked_by = req.headers["x-user-id"] || null;
  await ticket.save();
  res.json({ data: ticket });
});

app.get("/tickets/:id", async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 404, "TICKET_NOT_FOUND", "Không tìm thấy vé");
  res.json({ data: ticket });
});

app.get("/tickets/by-booking/:bookingId", async (req, res) => {
  const ticket = await Ticket.findOne({ where: { booking_id: req.params.bookingId } });
  if (!ticket) return errorResponse(res, 404, "TICKET_NOT_FOUND", "Không tìm thấy vé cho đơn này");
  res.json({ data: ticket });
});

const PORT = process.env.PORT || 4004;

// Thử kết nối MySQL với cơ chế retry (đề phòng MySQL container chưa sẵn sàng
// hoàn toàn dù healthcheck đã báo "healthy" - tăng độ ổn định khi khởi động
// đồng thời nhiều container trên môi trường Docker Desktop / Windows).
async function startWithRetry(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      app.listen(PORT, () => console.log("Ticket Service running on port " + PORT));
      return;
    } catch (err) {
      console.log(`[startup] Chưa kết nối được MySQL (lần ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

startWithRetry();
