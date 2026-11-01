# Hệ thống đặt vé xe khách trực tuyến — Kiến trúc hướng dịch vụ

MVP triển khai 4 dịch vụ cốt lõi + API Gateway, đúng theo báo cáo phân tích/thiết kế:

| Service | Port (qua Gateway) | Chức năng |
|---|---|---|
| Trip Service | /api/trips | Quản lý tuyến, chuyến, sơ đồ ghế (công khai) |
| User Service | /api/auth | Đăng ký, đăng nhập, cấp JWT (công khai) |
| Booking Service | /api/bookings | Giữ ghế (Redis), điều phối SAGA (**yêu cầu đăng nhập**) |
| Payment Service | (nội bộ, không qua Gateway) | Mô phỏng thanh toán, chỉ Booking Service gọi |
| Ticket Service | /api/tickets (chỉ vài route) | Xuất vé (nội bộ), tra cứu vé, soát vé |
| Notification Service | (nội bộ, không qua Gateway) | Gửi email/SMS xác nhận — stateless |
| API Gateway | :8081 | Điểm vào duy nhất, xác thực JWT tập trung |
| **Frontend (React + Vite + Tailwind)** | **:5173** | **Giao diện tìm chuyến, chọn ghế, thanh toán, xem vé** |

Tất cả 6 dịch vụ backend + frontend trong thiết kế ban đầu đã được cài đặt đầy đủ.

## Xác thực (JWT)

Gateway xác thực token tại tầng cổng vào (API Gateway pattern) — Booking Service tin tưởng header `x-user-id` do Gateway gắn vào, không cần tự verify JWT lần nữa. Route `/api/trips` và `/api/auth` không yêu cầu đăng nhập; route `/api/bookings` bắt buộc có `Authorization: Bearer <token>`.

**Đăng ký:**
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Dương Quốc Khánh","email":"khanh@example.com","password":"123456"}'
```
Lưu lại `token` trả về.

**Đăng nhập:**
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"khanh@example.com","password":"123456"}'
```

## Vai trò và phân quyền

| Vai trò | Làm được |
|---|---|
| Khách vãng lai (chưa đăng nhập) | Xem chuyến, xem sơ đồ ghế, tra cứu vé theo mã, đăng ký / đăng nhập |
| `CUSTOMER` Khách hàng | Như trên, cộng giữ ghế, thanh toán, xem vé của mình |
| `STAFF` Nhân viên soát vé | Như khách hàng, cộng soát vé lên xe (`/staff/check-in`) |
| `OPERATOR` Nhà xe | Như nhân viên, cộng tạo chuyến xe (`/operator/trips`) |
| `ADMIN` Quản trị viên | Toàn quyền, cộng xem người dùng và đổi vai trò (`/admin/users`) |

- Đăng ký luôn tạo `CUSTOMER`. Chỉ `ADMIN` mới nâng quyền người khác; không thể tự hạ quyền của chính mình.
- Tài khoản quản trị đầu tiên được tạo từ biến môi trường `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `docker-compose.yml` (mặc định `admin@benve.local` / `Admin@12345`). **Đổi mật khẩu này trước khi triển khai thật.**
- Vai trò nằm trong JWT (hạn 1 ngày): sau khi bị đổi quyền, người dùng cần đăng nhập lại.
- Gateway kiểm tra vai trò và gắn `x-user-id`, `x-user-role`; header do client tự gửi luôn bị xóa. Payment, Notification và `POST /tickets/issue` là nội bộ nên không mở qua Gateway. Các service không còn publish cổng ra máy host, chỉ Gateway (8081) và frontend (5173).
- Test: `tests/rbac/README.md`.

## Chạy dự án

⚠️ **Bản này đổi cấu trúc bảng `trips` (thêm cột `bus_type`) và dữ liệu mẫu, nên BẮT BUỘC reset volume MySQL**, nếu không Trip Service sẽ lỗi `Unknown column 'bus_type'`:
```bash
docker compose down -v
```
Bản này còn thêm cột vai trò (`users.role`), thông tin liên hệ (`bookings.contact_*`) và trạng thái vé (`tickets.status`), nên reset volume là bắt buộc.
Dữ liệu mẫu giờ sinh theo *hôm nay* (giờ Việt Nam), nên chuyến xe luôn nằm ở tương lai mỗi khi khởi tạo DB mới.

⚠️ **Nếu bạn đã chạy phiên bản trước và gặp lỗi hiển thị tiếng Việt (VD: "Đà Lạt" hiện thành "ÄÂ Lá°¡t")**: dữ liệu cũ trong volume MySQL đã bị lưu sai encoding, đổi cấu hình không tự sửa được dữ liệu đã lưu. Cần xóa volume cũ để MySQL khởi tạo lại từ đầu với charset đúng:
```bash
docker compose down -v
```
Cờ `-v` sẽ xóa cả volume `mysql_data` — an toàn vì đây là dữ liệu demo.

```bash
docker compose up --build
```

Đợi tất cả container start xong (đặc biệt MySQL cần healthcheck pass trước).
- Gateway (API): `http://localhost:8081`
- **Giao diện web: `http://localhost:5173`**

Luồng sử dụng trên giao diện: Trang chủ tìm chuyến → chọn ghế (đăng nhập nếu chưa có tài khoản) → giữ ghế 5 phút → xác nhận thanh toán → nhận vé điện tử có mã QR cách điệu.

## Test luồng nghiệp vụ chính (happy path)

**1. Xem danh sách chuyến (đã có data mẫu):**
```bash
curl http://localhost:8081/api/trips
```

**2. Xem sơ đồ ghế của chuyến id=1:**
```bash
curl http://localhost:8081/api/trips/1/seats
```

**3. Giữ ghế A1, A2 (cần token từ bước đăng ký/đăng nhập ở trên):**
```bash
curl -X POST http://localhost:8081/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"tripId":1,"seatNumbers":["A1","A2"],"userId":"user-001"}'
```
Lưu lại `bookingId` trả về. (Ghi chú: `userId` trong body hiện vẫn do client gửi để đơn giản hóa demo; bản hoàn thiện nên lấy từ header `x-user-id` mà Gateway đã gắn.)

**4. Xác nhận thanh toán (thành công):**
```bash
curl -X POST http://localhost:8081/api/bookings/<bookingId>/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"method":"MOCK_CARD"}'
```
Kết quả trả về `booking` (status=CONFIRMED) và `ticket` (kèm qr_code). Đồng thời Notification Service sẽ ghi log email xác nhận ra console — xem bằng:
```bash
docker compose logs notification-service --tail 10
```

## Test race condition (2 người cùng đặt 1 ghế)

Mở 2 terminal, chạy gần như đồng thời:
```bash
curl -X POST http://localhost:8081/api/bookings/hold -H "Content-Type: application/json" \
  -d '{"tripId":1,"seatNumbers":["A5"],"userId":"user-A"}'

curl -X POST http://localhost:8081/api/bookings/hold -H "Content-Type: application/json" \
  -d '{"tripId":1,"seatNumbers":["A5"],"userId":"user-B"}'
```
Một request sẽ nhận `201` (giữ ghế thành công), request còn lại nhận `409 SEAT_ALREADY_HELD`.

## Test nhánh compensating transaction (thanh toán thất bại)

Giữ ghế trước, sau đó confirm với `simulateFailure: true`:
```bash
curl -X POST http://localhost:8081/api/bookings/<bookingId>/confirm \
  -H "Content-Type: application/json" \
  -d '{"simulateFailure": true}'
```
Kết quả: `402 PAYMENT_FAILED`, booking chuyển sang `CANCELLED`, khóa Redis được giải phóng — ghế A1, A2 có thể đặt lại ngay lập tức.

## Kiểm tra khóa ghế trong Redis (để demo/vấn đáp)

```bash
docker exec -it bus_redis redis-cli
> KEYS hold:*
> TTL hold:trip:1:seat:A1
```

## Cấu trúc thư mục

```
bus-ticket-system/
├── docker-compose.yml
├── init-db/init.sql          # tạo 4 database riêng (Database per Service)
├── gateway/                  # API Gateway
└── services/
    ├── trip-service/
    ├── booking-service/      # có Redis client + logic SAGA
    ├── payment-service/
    └── ticket-service/
```

## Các API bổ sung (qua Gateway)

| Method | Đường dẫn | Đăng nhập | Mô tả |
|---|---|---|---|
| GET | /api/bookings/trips/{tripId}/seat-status | Không | Danh sách ghế `sold` (đã bán) và `held` (đang giữ) của chuyến |
| GET | /api/bookings/mine | Có | Lịch sử đặt vé của người đang đăng nhập |
| GET | /api/tickets/lookup?code=QR-... | Không | Tra cứu vé theo mã |
| GET | /api/trips?origin=&destination=&date=YYYY-MM-DD | Không | Chỉ trả chuyến chưa khởi hành, sắp theo giờ; `date` lọc theo ngày (giờ VN) |

`userId` giờ lấy từ JWT (Gateway gắn header `x-user-id`), không nhận từ body nữa; chỉ chủ đơn mới xem/thanh toán được đơn của mình.

## Kiểm thử

Xem `tests/booking-integration/README.md` — 17 test tích hợp cho Booking Service (race condition, chống bán trùng, compensating transaction, phân quyền).

## Việc còn lại để hoàn thiện đồ án

- Thay Notification Service từ mô phỏng (console.log) sang tích hợp SMTP/Twilio thật khi triển khai production.
- Thay mã QR cách điệu bằng thư viện tạo QR thật (`qrcode.react`) nếu muốn quét được bằng điện thoại.
- Trang "Tra cứu vé" hiện chỉ cần mã vé, chưa xác thực thêm số điện thoại như FUTA.
- Chưa có test tự động cho Trip/Payment/Ticket/User Service và frontend; job chuyển đơn quá hạn sang `EXPIRED` và nhánh `BOOKING_EXPIRED` chưa được test.
