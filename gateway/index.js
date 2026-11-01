const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;

// Frontend (localhost:5173) và Gateway là 2 origin khác nhau nên phải bật CORS (môi trường dev/demo).
app.use(cors({ origin: true, credentials: true }));

// KHÔNG BAO GIỜ tin header danh tính do client gửi: xóa trước, chỉ Gateway mới được gắn sau khi verify JWT.
app.use((req, res, next) => {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];
  next();
});

function deny(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Xác thực: verify JWT rồi gắn x-user-id, x-user-role cho service phía sau (đã nằm trong mạng nội bộ).
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return deny(res, 401, "NO_TOKEN", "Thiếu token xác thực, vui lòng đăng nhập");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.headers["x-user-id"] = String(payload.sub);
    req.headers["x-user-role"] = payload.role || "CUSTOMER";
    next();
  } catch (err) {
    deny(res, 401, "INVALID_TOKEN", "Token không hợp lệ hoặc đã hết hạn");
  }
}

// Phân quyền: phải đăng nhập VÀ có một trong các vai trò được liệt kê.
function requireRole(...roles) {
  return (req, res, next) =>
    requireAuth(req, res, () =>
      roles.includes(req.headers["x-user-role"])
        ? next()
        : deny(res, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này")
    );
}

const proxy = (target, from, to) =>
  createProxyMiddleware({ target, changeOrigin: true, pathRewrite: { ["^" + from]: to } });

// --- Đăng ký / đăng nhập: công khai ---
app.use("/api/auth", proxy(process.env.USER_SERVICE_URL, "/api/auth", "/auth"));

// --- Quản trị người dùng: chỉ ADMIN ---
app.use("/api/admin/users", requireRole("ADMIN"), proxy(process.env.USER_SERVICE_URL, "/api/admin/users", "/users"));

// --- Chuyến xe: ai cũng xem được; tạo/sửa chỉ OPERATOR, ADMIN ---
app.use(
  "/api/trips",
  (req, res, next) => (req.method === "GET" ? next() : requireRole("OPERATOR", "ADMIN")(req, res, next)),
  proxy(process.env.TRIP_SERVICE_URL, "/api/trips", "/trips")
);

// --- Trạng thái ghế: công khai (chỉ lộ số ghế, không lộ người đặt). Phải khai báo trước /api/bookings. ---
app.use("/api/bookings/trips", proxy(process.env.BOOKING_SERVICE_URL, "/api/bookings/trips", "/bookings/trips"));

// --- Đặt vé: phải đăng nhập (service tự kiểm tra chủ đơn qua x-user-id) ---
app.use("/api/bookings", requireAuth, proxy(process.env.BOOKING_SERVICE_URL, "/api/bookings", "/bookings"));

// --- Vé: chỉ mở đúng các route cần thiết, còn lại chặn (POST /tickets/issue là nội bộ) ---
app.use(
  "/api/tickets",
  (req, res, next) => {
    if (req.method === "GET" && req.path === "/lookup") return next(); // tra cứu công khai theo mã vé
    if (req.method === "GET" && /^\/by-booking\/[^/]+$/.test(req.path)) return requireAuth(req, res, next);
    if (req.method === "POST" && /^\/[^/]+\/check-in$/.test(req.path)) {
      return requireRole("STAFF", "OPERATOR", "ADMIN")(req, res, next); // soát vé
    }
    return deny(res, 403, "FORBIDDEN_ROUTE", "Route này không được phép truy cập từ bên ngoài");
  },
  proxy(process.env.TICKET_SERVICE_URL, "/api/tickets", "/tickets")
);

// Payment và Notification là dịch vụ NỘI BỘ: chỉ Booking Service gọi, không mở ra qua Gateway.

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
