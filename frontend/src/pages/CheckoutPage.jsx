import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi, unwrapError } from "../api.js";

const money = (v) => Number(v).toLocaleString("vi-VN") + "đ";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    bookingApi.get(bookingId).then(setBooking);
  }, [bookingId]);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await bookingApi.confirm(bookingId, { method: "MOCK_CARD", simulateFailure });
      navigate(`/tickets/${result.booking.id}`, { state: result });
    } catch (err) {
      setError(unwrapError(err).message);
    } finally {
      setLoading(false);
    }
  }

  if (!booking) return <p className="text-ink-60 text-sm max-w-md mx-auto mt-16 px-5">Đang tải đơn đặt vé...</p>;

  const seats = booking.seat_numbers.split(",");
  const expiresIn = Math.max(0, Math.round((new Date(booking.expires_at) - now) / 1000));
  const expired = expiresIn === 0;
  const mm = String(Math.floor(expiresIn / 60)).padStart(2, "0");
  const ss = String(expiresIn % 60).padStart(2, "0");

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Bước 2/2</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Xác nhận thanh toán</h1>

      <div className="bg-paper border border-ink/10 rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex justify-between text-sm py-1.5">
          <span className="text-ink-60">Mã đơn</span>
          <span className="font-mono">{booking.id.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between text-sm py-1.5">
          <span className="text-ink-60">Ghế</span>
          <span className="font-mono font-medium">{seats.join(", ")}</span>
        </div>
        <div className="flex justify-between text-sm py-1.5 border-t border-ink/10 mt-1.5 pt-2.5">
          <span className="text-ink-60">Tổng tiền</span>
          <span className="font-display font-semibold text-lg">{money(booking.total_amount)}</span>
        </div>
      </div>

      <div className={`rounded-xl px-4 py-2.5 text-xs font-mono mb-5 border ${expired ? "bg-coral/10 border-coral/30 text-coral" : "bg-amber/10 border-amber/30 text-amber-dark"}`}>
        {expired
          ? "Đã hết thời gian giữ ghế. Vui lòng quay lại chọn ghế."
          : `Ghế được giữ trong ${mm}:${ss} — vui lòng hoàn tất thanh toán trước khi hết hạn.`}
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-60 mb-5 font-mono">
        <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
        Mô phỏng thanh toán thất bại (demo nhánh compensating transaction)
      </label>

      {error && <p className="text-coral text-sm mb-3">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={loading || expired}
        className="w-full bg-ink text-paper font-medium rounded-lg py-3 text-sm hover:bg-ink/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Đang xử lý thanh toán..." : `Thanh toán ${money(booking.total_amount)}`}
      </button>
    </div>
  );
}
