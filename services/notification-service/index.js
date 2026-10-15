const express = require("express");

const app = express();
app.use(express.json());

// Notification Service KHÔNG có database (đúng nguyên tắc Service Statelessness
// đã nêu trong thiết kế) - không lưu trạng thái, chỉ nhận yêu cầu và gửi đi ngay,
// giải phóng tài nguyên sau khi xử lý xong mỗi request. Đây cũng là lý do dịch vụ
// này dễ nhân bản (scale-out) khi tải tăng, vì không có state cần đồng bộ giữa
// các instance.

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function isValidEmail(email) {
  return typeof email === "string" && /\S+@\S+\.\S+/.test(email);
}

// POST /notifications/send (gọi nội bộ bởi Booking Service sau khi xuất vé thành công)
// body: { channel: "EMAIL" | "SMS", to, subject?, message }
app.post("/notifications/send", async (req, res) => {
  const { channel, to, subject, message } = req.body;

  if (!channel || !to || !message) {
    return errorResponse(res, 400, "INVALID_INPUT", "Thiếu channel, to hoặc message");
  }
  if (!["EMAIL", "SMS"].includes(channel)) {
    return errorResponse(res, 400, "INVALID_CHANNEL", "channel chỉ hỗ trợ EMAIL hoặc SMS");
  }
  if (channel === "EMAIL" && !isValidEmail(to)) {
    return errorResponse(res, 400, "INVALID_RECIPIENT", "Địa chỉ email không hợp lệ");
  }

  // Mô phỏng gửi đi (thay bằng tích hợp SMTP/Twilio thật ở bản triển khai production).
  // Ghi log ra console để có thể quan sát khi demo/bảo vệ đồ án.
  const notificationId = "NOTI-" + Date.now();
  console.log(`[Notification] channel=${channel} to=${to} subject=${subject || "(no subject)"} message="${message}"`);

  // Trễ giả lập 100ms để mô phỏng độ trễ mạng khi gọi dịch vụ bên thứ 3 (SMTP/SMS gateway)
  await new Promise((resolve) => setTimeout(resolve, 100));

  res.status(202).json({
    data: { notificationId, channel, to, status: "SENT", sentAt: new Date().toISOString() }
  });
});

const PORT = process.env.PORT || 4006;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
