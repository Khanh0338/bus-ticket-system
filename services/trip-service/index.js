const express = require("express");
const { Sequelize, DataTypes, Op } = require("sequelize");

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
  timezone: "+07:00", // DATETIME lưu theo giờ Việt Nam, tránh lệch 7 tiếng khi hiển thị
  dialectOptions: { charset: "utf8mb4" },
  define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" }
});

const Trip = sequelize.define("Trip", {
  origin: DataTypes.STRING,
  destination: DataTypes.STRING,
  departure_time: DataTypes.DATE,
  bus_plate: DataTypes.STRING,
  bus_type: { type: DataTypes.STRING, defaultValue: "Limousine" },
  total_seats: DataTypes.INTEGER,
  price: DataTypes.DECIMAL(10, 2),
  status: { type: DataTypes.STRING, defaultValue: "ACTIVE" }
}, { tableName: "trips", timestamps: false });

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// GET /trips?origin=&destination=&date=YYYY-MM-DD
// Chỉ trả các chuyến CHƯA khởi hành; date (giờ VN) lọc theo ngày khởi hành.
app.get("/trips", async (req, res) => {
  const { origin, destination, date } = req.query;
  const where = { status: "ACTIVE", departure_time: { [Op.gte]: new Date() } };
  if (origin) where.origin = origin;
  if (destination) where.destination = destination;
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 400, "INVALID_DATE", "date phải có dạng YYYY-MM-DD");
    }
    const start = new Date(`${date}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    where.departure_time = { [Op.gte]: new Date(Math.max(start, Date.now())), [Op.lt]: end };
  }
  const trips = await Trip.findAll({ where, order: [["departure_time", "ASC"]] });
  res.json({ data: trips });
});

// GET /trips/:id
app.get("/trips/:id", async (req, res) => {
  const trip = await Trip.findByPk(req.params.id);
  if (!trip) return errorResponse(res, 404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến xe");
  res.json({ data: trip });
});

// GET /trips/:id/seats -> sơ đồ ghế. Xe giường nằm có 2 tầng (A = tầng dưới, B = tầng trên), loại khác 1 tầng.
app.get("/trips/:id/seats", async (req, res) => {
  const trip = await Trip.findByPk(req.params.id);
  if (!trip) return errorResponse(res, 404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến xe");
  const n = trip.total_seats;
  const range = (prefix, count) => Array.from({ length: count }, (_, i) => prefix + (i + 1));
  const decks = trip.bus_type === "Giường nằm"
    ? [{ name: "Tầng dưới", seats: range("A", Math.ceil(n / 2)) }, { name: "Tầng trên", seats: range("B", Math.floor(n / 2)) }]
    : [{ name: "Sàn xe", seats: range("A", n) }];
  res.json({ data: { tripId: trip.id, price: trip.price, busType: trip.bus_type, seats: decks.flatMap((d) => d.seats), decks } });
});

// POST /trips (nội bộ - nhà xe tạo chuyến)
app.post("/trips", async (req, res) => {
  const { origin, destination, departure_time, bus_plate, bus_type, total_seats, price } = req.body;
  if (!origin || !destination || !departure_time || !price) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu dữ liệu bắt buộc");
  }
  if (origin === destination) return errorResponse(res, 400, "INVALID_INPUT", "Điểm đi và điểm đến không được trùng nhau");
  if (isNaN(new Date(departure_time)) || new Date(departure_time) <= new Date()) {
    return errorResponse(res, 400, "INVALID_INPUT", "Giờ khởi hành phải ở tương lai");
  }
  if (!(Number(price) > 0)) return errorResponse(res, 400, "INVALID_INPUT", "Giá vé phải lớn hơn 0");
  const seatsCount = Number(total_seats || 40);
  if (!Number.isInteger(seatsCount) || seatsCount < 8 || seatsCount > 60 || seatsCount % 2 !== 0) {
    return errorResponse(res, 400, "INVALID_INPUT", "Số ghế phải là số chẵn từ 8 đến 60");
  }
  const trip = await Trip.create({ origin, destination, departure_time, bus_plate, bus_type: bus_type || "Limousine", total_seats: seatsCount, price });
  res.status(201).json({ data: trip });
});

const PORT = process.env.PORT || 4001;

// Thử kết nối MySQL với cơ chế retry (đề phòng MySQL container chưa sẵn sàng
// hoàn toàn dù healthcheck đã báo "healthy" - tăng độ ổn định khi khởi động
// đồng thời nhiều container trên môi trường Docker Desktop / Windows).
async function startWithRetry(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      app.listen(PORT, () => console.log("Trip Service running on port " + PORT));
      return;
    } catch (err) {
      console.log(`[startup] Chưa kết nối được MySQL (lần ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

startWithRetry();
