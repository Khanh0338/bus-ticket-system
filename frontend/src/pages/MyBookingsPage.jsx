import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { bookingApi, tripApi } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const money = (v) => Number(v).toLocaleString("vi-VN") + "đ";

const STATUS = {
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-teal/10 text-teal" },
  PENDING_PAYMENT: { label: "Chờ thanh toán", cls: "bg-amber/10 text-amber-dark" },
  CANCELLED: { label: "Đã hủy", cls: "bg-coral/10 text-coral" },
  EXPIRED: { label: "Hết hạn giữ ghế", cls: "bg-ink/5 text-ink-60" }
};

export default function MyBookingsPage() {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([bookingApi.mine(), tripApi.search({})]).then(([b, t]) => {
      setBookings(b);
      setTrips(t);
    });
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const tripOf = (id) => trips.find((t) => t.id === id);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Lịch sử</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Vé của tôi</h1>

      {bookings === null ? (
        <p className="text-ink-60 text-sm">Đang tải...</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-ink/20 rounded-2xl">
          <p className="text-ink-60 mb-3">Bạn chưa đặt vé nào.</p>
          <Link to="/" className="text-amber-dark font-medium text-sm hover:text-amber">Tìm chuyến xe →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const trip = tripOf(b.trip_id);
            const st = STATUS[b.status] || { label: b.status, cls: "bg-ink/5 text-ink-60" };
            const target = b.status === "PENDING_PAYMENT" ? `/checkout/${b.id}` : `/tickets/${b.id}`;
            const clickable = b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT";
            const inner = (
              <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-paper p-4 hover:shadow-md transition-shadow">
                <div>
                  <p className="font-display font-semibold">
                    {trip ? <>{trip.origin} <span className="text-amber">→</span> {trip.destination}</> : `Chuyến #${b.trip_id}`}
                  </p>
                  <p className="text-ink-60 text-xs font-mono mt-1">
                    Ghế {b.seat_numbers.split(",").join(", ")} · {new Date(b.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-mono font-semibold">{money(b.total_amount)}</p>
                  <span className={`inline-block mt-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
              </div>
            );
            return clickable ? <Link key={b.id} to={target} className="block">{inner}</Link> : <div key={b.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
