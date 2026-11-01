# Test phân quyền (RBAC)

Hai bộ test, không cần Docker hay MySQL:

**1. Gateway (31 test)** - dùng service giả lập trả lại header mà nó nhận được.
```bash
npm init -y && npm i express jsonwebtoken cors http-proxy-middleware@2 sequelize sqlite3 bcryptjs
node echo.js &
JWT_SECRET=test-secret PORT=8090 USER_SERVICE_URL=http://localhost:5101 TRIP_SERVICE_URL=http://localhost:5101 \
BOOKING_SERVICE_URL=http://localhost:5101 TICKET_SERVICE_URL=http://localhost:5101 node ../../gateway/index.js &
node gw_test.js        # kỳ vọng: 31 pass, 0 fail
```
Kiểm tra: vai trò nào gọi được route nào, route nội bộ (`/api/payments`, `POST /api/tickets/issue`) bị chặn, header `x-user-role` giả mạo bị ghi đè.

**2. User + Ticket Service (19 test)**
```bash
node make-test-build.js
export JWT_SECRET=dev-secret-change-in-production ADMIN_EMAIL=admin@benve.local ADMIN_PASSWORD=Admin@12345 DB_NAME=x DB_USER=x DB_PASS=x DB_HOST=x
PORT=4005 node user_t.js &
PORT=4004 node ticket_t.js &
node svc_test.js       # kỳ vọng: 19 pass, 0 fail
```
