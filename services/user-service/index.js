const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
  dialectOptions: { charset: "utf8mb4" },
  define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" }
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

const User = sequelize.define("User", {
  full_name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  phone: DataTypes.STRING,
  password_hash: DataTypes.STRING
}, { tableName: "users", timestamps: true });

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, fullName: user.full_name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !password) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu họ tên, email hoặc mật khẩu");
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return errorResponse(res, 409, "EMAIL_TAKEN", "Email đã được đăng ký");
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ full_name: fullName, email, phone, password_hash });
  const token = signToken(user);
  res.status(201).json({ data: { token, user: { id: user.id, fullName: user.full_name, email: user.email } } });
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu email hoặc mật khẩu");
  }
  const user = await User.findOne({ where: { email } });
  if (!user) return errorResponse(res, 401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return errorResponse(res, 401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");

  const token = signToken(user);
  res.json({ data: { token, user: { id: user.id, fullName: user.full_name, email: user.email } } });
});

// GET /auth/me  (dùng để Gateway / service khác xác thực token)
app.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return errorResponse(res, 401, "NO_TOKEN", "Thiếu token xác thực");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ data: { userId: payload.sub, email: payload.email, fullName: payload.fullName } });
  } catch (err) {
    errorResponse(res, 401, "INVALID_TOKEN", "Token không hợp lệ hoặc đã hết hạn");
  }
});

// GET /users/:id (gọi nội bộ bởi các service khác - VD Booking Service cần email để gửi thông báo)
app.get("/users/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return errorResponse(res, 404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
  res.json({ data: { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone } });
});

const PORT = process.env.PORT || 4005;

// Thử kết nối MySQL với cơ chế retry (đề phòng MySQL container chưa sẵn sàng
// hoàn toàn dù healthcheck đã báo "healthy" - tăng độ ổn định khi khởi động
// đồng thời nhiều container trên môi trường Docker Desktop / Windows).
async function startWithRetry(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      app.listen(PORT, () => console.log("User Service running on port " + PORT));
      return;
    } catch (err) {
      console.log(`[startup] Chưa kết nối được MySQL (lần ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

startWithRetry();
