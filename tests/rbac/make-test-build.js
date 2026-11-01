// Tạo bản copy User/Ticket Service dùng SQLite in-memory (chỉ để test logic, không cần MySQL).
const fs = require("fs");
for (const [out, svc] of [["user_t.js", "user-service"], ["ticket_t.js", "ticket-service"]]) {
  let s = fs.readFileSync(`../../services/${svc}/index.js`, "utf8");
  const a = s.indexOf("const sequelize = new Sequelize("), b = s.indexOf("});", a) + 3;
  s = s.slice(0, a) + 'const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });' + s.slice(b);
  fs.writeFileSync(out, s);
}
console.log("đã tạo user_t.js, ticket_t.js");
