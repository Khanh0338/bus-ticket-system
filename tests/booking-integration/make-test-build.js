// Tạo bản copy của Booking Service dùng SQLite in-memory thay MySQL (chỉ để test logic nghiệp vụ).
const fs = require("fs");
const src = fs.readFileSync("../../services/booking-service/index.js", "utf8");
const start = src.indexOf("const sequelize = new Sequelize(");
const end = src.indexOf("});", start) + 3;
const out = src.slice(0, start) +
  'const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });' + src.slice(end);
fs.writeFileSync("booking_under_test.js", out);
console.log("đã tạo booking_under_test.js");
