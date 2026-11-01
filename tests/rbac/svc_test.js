const jwt = require("jsonwebtoken");
let pass = 0, fail = 0;
const ck = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log((ok ? "PASS" : "FAIL") + " - " + n + (ok ? "" : `  (được ${JSON.stringify(g)}, mong ${JSON.stringify(w)})`)); };
const call = async (port, method, path, body, headers = {}) => {
  const r = await fetch(`http://localhost:${port}${path}`, { method, headers: { "Content-Type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, b: await r.json() };
};
(async () => {
  // ---- User Service (4005) ----
  let r = await call(4005, "POST", "/auth/register", { fullName: "Hacker", email: "h@x.com", password: "123456", role: "ADMIN" });
  ck("đăng ký kèm role=ADMIN vẫn chỉ là CUSTOMER", r.b.data.user.role, "CUSTOMER");
  ck("JWT mang role CUSTOMER", jwt.decode(r.b.data.token).role, "CUSTOMER");
  const hid = r.b.data.user.id;
  r = await call(4005, "POST", "/auth/login", { email: "admin@benve.local", password: "Admin@12345" });
  ck("admin mặc định (từ biến môi trường) đăng nhập được", r.b.data.user.role, "ADMIN");
  const aid = r.b.data.user.id;
  ck("JWT admin mang role ADMIN", jwt.decode(r.b.data.token).role, "ADMIN");
  r = await call(4005, "GET", "/users"); ck("GET /users không có header admin -> 403", r.s, 403);
  r = await call(4005, "GET", "/users", null, { "x-user-role": "CUSTOMER" }); ck("GET /users role CUSTOMER -> 403", r.s, 403);
  r = await call(4005, "GET", "/users", null, { "x-user-role": "ADMIN" }); ck("GET /users role ADMIN -> 200, 2 người dùng", [r.s, r.b.data.length], [200, 2]);
  ck("danh sách không lộ password_hash", Object.keys(r.b.data[0]).includes("password_hash") || JSON.stringify(r.b.data).includes("password_hash"), false);
  const A = { "x-user-role": "ADMIN", "x-user-id": String(aid) };
  r = await call(4005, "PATCH", `/users/${hid}/role`, { role: "SUPERUSER" }, A); ck("role không hợp lệ -> 400", r.b.error.code, "INVALID_ROLE");
  r = await call(4005, "PATCH", `/users/${aid}/role`, { role: "CUSTOMER" }, A); ck("admin tự hạ quyền mình -> 400", r.b.error.code, "CANNOT_DEMOTE_SELF");
  r = await call(4005, "PATCH", "/users/9999/role", { role: "STAFF" }, A); ck("user không tồn tại -> 404", r.s, 404);
  r = await call(4005, "PATCH", `/users/${hid}/role`, { role: "STAFF" }, { "x-user-role": "CUSTOMER", "x-user-id": "5" }); ck("CUSTOMER đổi role -> 403", r.s, 403);
  r = await call(4005, "PATCH", `/users/${hid}/role`, { role: "STAFF" }, A); ck("admin nâng người dùng lên STAFF -> 200", [r.s, r.b.data.role], [200, "STAFF"]);
  r = await call(4005, "POST", "/auth/login", { email: "h@x.com", password: "123456" });
  ck("đăng nhập lại: token mới mang role STAFF", jwt.decode(r.b.data.token).role, "STAFF");

  // ---- Ticket Service (4004): soát vé ----
  r = await call(4004, "POST", "/tickets/issue", { bookingId: "b1", tripId: 1, seatNumbers: ["A1"], userId: "1" });
  const code = r.b.data.qr_code;
  ck("vé mới có status VALID", r.b.data.status, "VALID");
  r = await call(4004, "POST", `/tickets/${code}/check-in`, null, { "x-user-id": "7" });
  ck("check-in lần 1 -> USED", [r.s, r.b.data.status, r.b.data.checked_by], [200, "USED", "7"]);
  r = await call(4004, "POST", `/tickets/${code}/check-in`, null, { "x-user-id": "7" });
  ck("check-in lần 2 -> 409 đã dùng", [r.s, r.b.error.code], [409, "TICKET_ALREADY_USED"]);
  r = await call(4004, "POST", "/tickets/QR-khong-ton-tai/check-in"); ck("mã không tồn tại -> 404", r.s, 404);
  r = await call(4004, "GET", `/tickets/lookup?code=${code}`); ck("tra cứu thấy trạng thái USED", r.b.data.status, "USED");
  console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
})();
