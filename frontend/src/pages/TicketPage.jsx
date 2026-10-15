import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { tripApi, bookingApi, ticketApi } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import TicketStub from "../components/TicketStub.jsx";

export default function TicketPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(location.state || null);
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    async function load() {
      let result = data;
      if (!result) {
        // Mở lại vé từ "Vé của tôi": lấy cả đơn lẫn vé (nếu đã xuất)
        const booking = await bookingApi.get(bookingId);
        let ticket = null;
        if (booking.status === "CONFIRMED") {
          try { ticket = await ticketApi.byBooking(bookingId); } catch { /* chưa có vé */ }
        }
        result = { booking, ticket };
      }
      setData(result);
      const trips = await tripApi.search({});
      const found = trips.find((t) => t.id === result.booking.trip_id);
      setTrip(found || { origin: "?", destination: "?", departure_time: new Date() });
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (!data || !trip) return <p className="text-ink-60 text-sm max-w-md mx-auto mt-16 px-5">Đang tải vé...</p>;

  const seats = data.booking.seat_numbers.split(",");

  return (
    <div className="max-w-lg mx-auto px-5 py-10">
      <div className="text-center mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-teal mb-1">Đặt vé thành công</p>
        <h1 className="font-display text-3xl font-semibold">Vé của bạn đã sẵn sàng</h1>
      </div>

      <TicketStub
        trip={trip}
        seatNumbers={seats}
        qrCode={data.ticket?.qr_code}
        status={data.booking.status}
        passengerName={user?.fullName}
      />

      <p className="text-ink-60 text-xs text-center mt-4">
        Email xác nhận đã được gửi tới {user?.email}. Xuất trình mã vé khi lên xe.
      </p>

      <Link
        to="/"
        className="block text-center mt-6 text-sm font-medium text-amber-dark hover:text-amber transition-colors"
      >
        ← Đặt thêm chuyến khác
      </Link>
    </div>
  );
}
