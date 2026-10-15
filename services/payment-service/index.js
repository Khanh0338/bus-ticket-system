const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
  dialectOptions: { charset: "utf8mb4" },
  define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" }
});

const Payment = sequelize.define("Payment", {
  booking_id: DataTypes.STRING,
  amount: DataTypes.DECIMAL(10, 2),
  method: DataTypes.STRING,
  status: DataTypes.STRING,
  transaction_ref: DataTypes.STRING
}, { tableName: "payments", timestamps: true });

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// POST /payments  -> mô phỏng thanh toán
// body: { bookingId, amount, method, simulateFailure? }
app.post("/payments", async (req, res) => {
  const { bookingId, amount, method, simulateFailure } = req.body;
  if (!bookingId || !amount) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu bookingId hoặc amount");
  }

  // Demo: cho phép ép fail để kiểm thử luồng compensating transaction (SAGA)
  const success = !simulateFailure;
  const status = success ? "SUCCESS" : "FAILED";
  const transaction_ref = "TXN-" + Date.now();

  const payment = await Payment.create({
    booking_id: bookingId,
    amount,
    method: method || "MOCK_CARD",
    status,
    transaction_ref
  });

  if (!success) {
    return errorResponse(res, 402, "PAYMENT_FAILED", "Thanh toán thất bại (mô phỏng)");
  }
  res.json({ data: payment });
});

app.get("/payments/:bookingId", async (req, res) => {
  const payment = await Payment.findOne({ where: { booking_id: req.params.bookingId } });
  if (!payment) return errorResponse(res, 404, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch");
  res.json({ data: payment });
});

const PORT = process.env.PORT || 4003;

// Thử kết nối MySQL với cơ chế retry (đề phòng MySQL container chưa sẵn sàng
// hoàn toàn dù healthcheck đã báo "healthy" - tăng độ ổn định khi khởi động
// đồng thời nhiều container trên môi trường Docker Desktop / Windows).
async function startWithRetry(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      app.listen(PORT, () => console.log("Payment Service running on port " + PORT));
      return;
    } catch (err) {
      console.log(`[startup] Chưa kết nối được MySQL (lần ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

startWithRetry();
