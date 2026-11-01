const jwt = require("jsonwebtoken");
const S = "test-secret";
const tok = (role) => jwt.sign({ sub: 7, role }, S);
const base = "http://localhost:8090";
const req = async (method, path, role, headers = {}) => {
  const h = { ...headers }; if (role) h.authorization = "Bearer " + tok(role);
  const r = await fetch(base + path, { method, headers: h });
  let b = null; try { b = await r.json(); } catch {}
  return { s: r.status, b };
};
let pass = 0, fail = 0;
const ck = (name, got, want) => { const ok = got === want; ok ? pass++ : fail++; console.log((ok ? "PASS" : "FAIL") + " - " + name + (ok ? "" : `  (được ${got}, mong ${want})`)); };
(async () => {
  ck("GET /api/trips công khai", (await req("GET", "/api/trips")).s, 200);
  ck("POST /api/trips không token", (await req("POST", "/api/trips")).s, 401);
  for (const [role, want] of [["CUSTOMER", 403], ["STAFF", 403], ["OPERATOR", 200], ["ADMIN", 200]]) ck(`POST /api/trips vai trò ${role}`, (await req("POST", "/api/trips", role)).s, want);
  ck("GET /api/admin/users không token", (await req("GET", "/api/admin/users")).s, 401);
  for (const [role, want] of [["CUSTOMER", 403], ["STAFF", 403], ["OPERATOR", 403], ["ADMIN", 200]]) ck(`GET /api/admin/users vai trò ${role}`, (await req("GET", "/api/admin/users", role)).s, want);
  ck("admin/users được ghi lại đường dẫn nội bộ /users", (await req("GET", "/api/admin/users", "ADMIN")).b.path, "/users");
  ck("POST /api/tickets/issue bị chặn kể cả ADMIN", (await req("POST", "/api/tickets/issue", "ADMIN")).s, 403);
  ck("POST /api/payments không còn mở ra ngoài", (await req("POST", "/api/payments", "ADMIN")).s, 404);
  ck("GET /api/payments/x không còn mở ra ngoài", (await req("GET", "/api/payments/x", "ADMIN")).s, 404);
  ck("GET /api/tickets/lookup công khai", (await req("GET", "/api/tickets/lookup?code=Q")).s, 200);
  ck("GET /api/tickets/by-booking/abc không token", (await req("GET", "/api/tickets/by-booking/abc")).s, 401);
  ck("GET /api/tickets/by-booking/abc có token", (await req("GET", "/api/tickets/by-booking/abc", "CUSTOMER")).s, 200);
  ck("GET /api/tickets/5 (theo id) bị chặn", (await req("GET", "/api/tickets/5", "ADMIN")).s, 403);
  ck("check-in không token", (await req("POST", "/api/tickets/QR-1/check-in")).s, 401);
  for (const [role, want] of [["CUSTOMER", 403], ["STAFF", 200], ["OPERATOR", 200], ["ADMIN", 200]]) ck(`check-in vai trò ${role}`, (await req("POST", "/api/tickets/QR-1/check-in", role)).s, want);
  ck("check-in chuyển đúng đường dẫn nội bộ", (await req("POST", "/api/tickets/QR-1/check-in", "STAFF")).b.path, "/tickets/QR-1/check-in");
  ck("GET /api/bookings/x không token", (await req("GET", "/api/bookings/x")).s, 401);
  ck("seat-status công khai", (await req("GET", "/api/bookings/trips/1/seat-status")).s, 200);
  let r = await req("GET", "/api/bookings/x", "CUSTOMER", { "x-user-role": "ADMIN", "x-user-id": "999" });
  ck("giả mạo header x-user-role/x-user-id bị ghi đè bằng JWT (role)", r.b.role, "CUSTOMER");
  ck("giả mạo header x-user-id bị ghi đè bằng JWT (id)", r.b.uid, "7");
  r = await req("GET", "/api/trips", null, { "x-user-role": "ADMIN", "x-user-id": "999" });
  ck("route công khai: header danh tính giả bị xóa (role)", r.b.role, null);
  ck("route công khai: header danh tính giả bị xóa (id)", r.b.uid, null);
  console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
})();
