const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;

// Bật CORS: frontend (localhost:5173) và gateway (localhost:8081) là 2 origin khác nhau
// khi chạy trên trình duyệt, nên bắt buộc phải cho phép cross-origin request ở đây,
// nếu không trình duyệt sẽ chặn request trước khi nó gửi đi (lỗi CORS policy).
app.use(cors({
  origin: true, // phản chiếu lại origin gọi tới - phù hợp cho môi trường dev/demo đồ án
  credentials: true
}));

// Middleware xác thực JWT: kiểm tra token tại Gateway, không cần mỗi service tự verify lại
// (đúng nguyên tắc kiểm soát truy cập tập trung tại tầng cổng vào - API Gateway pattern)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: "NO_TOKEN", message: "Thiếu token xác thực, vui lòng đăng nhập" } });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    // gắn userId đã xác thực vào header để service phía sau tin tưởng, không cần verify lại
    req.headers["x-user-id"] = String(payload.sub);
    next();
  } catch (err) {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" } });
  }
}

// Auth routes - không cần token (đăng ký/đăng nhập)
app.use("/api/auth", createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/auth": "/auth" }
}));

// Trips - công khai, không cần đăng nhập để duyệt/tra cứu
app.use("/api/trips", createProxyMiddleware({
  target: process.env.TRIP_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/trips": "/trips" }
}));

// Trạng thái ghế của một chuyến - công khai (chỉ lộ số ghế, không lộ người đặt).
// PHẢI đặt trước route /api/bookings bên dưới, vì Express khớp theo thứ tự khai báo.
app.use("/api/bookings/trips", createProxyMiddleware({
  target: process.env.BOOKING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/bookings/trips": "/bookings/trips" }
}));

// Bookings - bắt buộc đăng nhập (giữ ghế, xác nhận thanh toán)
app.use("/api/bookings", requireAuth, createProxyMiddleware({
  target: process.env.BOOKING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/bookings": "/bookings" }
}));

app.use("/api/payments", createProxyMiddleware({
  target: process.env.PAYMENT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/payments": "/payments" }
}));

app.use("/api/tickets", createProxyMiddleware({
  target: process.env.TICKET_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/tickets": "/tickets" }
}));

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
