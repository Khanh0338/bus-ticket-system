CREATE DATABASE IF NOT EXISTS trips_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS bookings_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS payments_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tickets_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS users_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Trip Service: dữ liệu mẫu
USE trips_db;
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time DATETIME NOT NULL,
  bus_plate VARCHAR(20),
  bus_type VARCHAR(30) DEFAULT 'Limousine',
  total_seats INT NOT NULL DEFAULT 40,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ngày chuyến xe tính từ HÔM NAY theo giờ Việt Nam (UTC+7), để dữ liệu mẫu luôn nằm ở tương lai.
SET @today = DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR);

INSERT INTO trips (origin, destination, departure_time, bus_plate, bus_type, total_seats, price) VALUES
  ('TP.HCM', 'Đà Lạt',    TIMESTAMP(DATE_ADD(@today, INTERVAL 1 DAY), '22:00:00'), '51B-123.45', 'Giường nằm', 40, 280000),
  ('TP.HCM', 'Đà Lạt',    TIMESTAMP(DATE_ADD(@today, INTERVAL 2 DAY), '08:00:00'), '51B-123.46', 'Limousine',  36, 330000),
  ('TP.HCM', 'Nha Trang', TIMESTAMP(DATE_ADD(@today, INTERVAL 1 DAY), '21:00:00'), '51B-678.90', 'Giường nằm', 40, 320000),
  ('TP.HCM', 'Vũng Tàu',  TIMESTAMP(DATE_ADD(@today, INTERVAL 1 DAY), '07:30:00'), '51B-234.56', 'Limousine',  36, 150000),
  ('TP.HCM', 'Cần Thơ',   TIMESTAMP(DATE_ADD(@today, INTERVAL 1 DAY), '09:00:00'), '51B-345.67', 'Ghế ngồi',   32, 180000),
  ('TP.HCM', 'Phan Thiết',TIMESTAMP(DATE_ADD(@today, INTERVAL 2 DAY), '06:30:00'), '51B-456.78', 'Limousine',  36, 170000),
  ('Đà Lạt', 'TP.HCM',    TIMESTAMP(DATE_ADD(@today, INTERVAL 2 DAY), '20:00:00'), '49B-123.45', 'Giường nằm', 40, 280000),
  ('Đà Lạt', 'Nha Trang', TIMESTAMP(DATE_ADD(@today, INTERVAL 3 DAY), '07:00:00'), '49B-234.56', 'Ghế ngồi',   32, 160000),
  ('Đà Lạt', 'Đà Nẵng',   TIMESTAMP(DATE_ADD(@today, INTERVAL 3 DAY), '18:00:00'), '49B-345.67', 'Giường nằm', 40, 480000),
  ('Cần Thơ','TP.HCM',    TIMESTAMP(DATE_ADD(@today, INTERVAL 1 DAY), '14:00:00'), '65B-123.45', 'Ghế ngồi',   32, 180000),
  ('Cần Thơ','Cà Mau',    TIMESTAMP(DATE_ADD(@today, INTERVAL 2 DAY), '10:00:00'), '65B-234.56', 'Ghế ngồi',   32, 130000),
  ('Cần Thơ','Long Xuyên',TIMESTAMP(DATE_ADD(@today, INTERVAL 1 DAY), '16:30:00'), '65B-345.67', 'Limousine',  36, 100000);
