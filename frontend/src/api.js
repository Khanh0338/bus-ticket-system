import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const api = axios.create({ baseURL: BASE_URL });

// Gắn token vào mọi request nếu đã đăng nhập (đọc từ localStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Chuẩn hóa lỗi trả về từ Gateway: { error: { code, message } }
function unwrapError(err) {
  const apiError = err.response?.data?.error;
  return apiError || { code: "UNKNOWN", message: "Có lỗi xảy ra, vui lòng thử lại" };
}

export const authApi = {
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data.data),
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data.data)
};

export const tripApi = {
  search: (params) => api.get("/trips", { params }).then((r) => r.data.data),
  getSeats: (tripId) => api.get(`/trips/${tripId}/seats`).then((r) => r.data.data)
};

export const ticketApi = {
  lookup: (code) => api.get("/tickets/lookup", { params: { code } }).then((r) => r.data.data),
  byBooking: (bookingId) => api.get(`/tickets/by-booking/${bookingId}`).then((r) => r.data.data)
};

export const bookingApi = {
  hold: (payload) => api.post("/bookings/hold", payload).then((r) => r.data.data),
  confirm: (bookingId, payload) => api.post(`/bookings/${bookingId}/confirm`, payload).then((r) => r.data.data),
  get: (bookingId) => api.get(`/bookings/${bookingId}`).then((r) => r.data.data),
  mine: () => api.get("/bookings/mine").then((r) => r.data.data),
  seatStatus: (tripId) => api.get(`/bookings/trips/${tripId}/seat-status`).then((r) => r.data.data)
};

export { unwrapError };
export default api;
