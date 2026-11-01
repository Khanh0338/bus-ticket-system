# Test tích hợp Booking Service

Kiểm tra logic giữ ghế / SAGA bằng Redis thật + SQLite (thay MySQL) + các service khác giả lập.
Gồm: race condition (15 request cùng giữ 1 ghế), chống bán trùng ghế đã bán, compensating transaction,
phân quyền theo user, lịch sử đặt vé.

```bash
# cần redis-server chạy ở cổng 6379
cd tests/booking-integration
npm init -y && npm i express sequelize sqlite3 redis axios uuid
node make-test-build.js
node mocks.js &                      # giả lập Trip/Payment/Ticket/User/Notification (cổng 5001-5006)
DB_NAME=x DB_USER=x DB_PASS=x DB_HOST=x REDIS_HOST=localhost PORT=4002 \
TRIP_SERVICE_URL=http://localhost:5001 PAYMENT_SERVICE_URL=http://localhost:5003 \
TICKET_SERVICE_URL=http://localhost:5004 USER_SERVICE_URL=http://localhost:5005 \
NOTIFICATION_SERVICE_URL=http://localhost:5006 node booking_under_test.js &
node test.js                         # kỳ vọng: 21 pass, 0 fail
```
