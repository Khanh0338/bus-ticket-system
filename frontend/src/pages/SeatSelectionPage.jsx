import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { tripApi, bookingApi, unwrapError } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import SeatMap from "../components/SeatMap.jsx";

const money = (v) => Number(v).toLocaleString("vi-VN") + "đ";

export default function SeatSelectionPage() {
  const { tripId } = useParams();
  const [query] = useSearchParams();
  const maxSeats = Math.min(Math.max(parseInt(query.get("qty"), 10) || 6, 1), 6);
  const [seats, setSeats] = useState([]);
  const [price, setPrice] = useState(0);
  const [selected, setSelected] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [error, setError] = useState(null);
  const [holding, setHolding] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    tripApi.getSeats(tripId).then((data) => {
      setSeats(data.seats);
      setPrice(data.price);
    });
  }, [tripId]);

  // Lấy trạng thái ghế thật (đã bán + đang bị giữ) và làm mới định kỳ,
  // để người dùng thấy ghế người khác vừa giữ mà không phải thử rồi mới biết.
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const status = await bookingApi.seatStatus(tripId);
        if (!active) return;
        const taken = [...status.sold, ...status.held];
        setUnavailable(taken);
        setSelected((prev) => prev.filter((s) => !taken.includes(s)));
      } catch {
        /* lỗi mạng tạm thời: giữ nguyên trạng thái hiện tại */
      }
    }
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [tripId]);

  function toggleSeat(seat) {
    setError(null);
    if (!selected.includes(seat) && selected.length >= maxSeats) {
      setError(`Bạn đã chọn đủ ${maxSeats} ghế. Bỏ chọn một ghế để đổi sang ghế khác.`);
      return;
    }
    setSelected((prev) => (prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]));
  }

  async function handleHold() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (selected.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ghế");
      return;
    }
    setHolding(true);
    setError(null);
    try {
      const booking = await bookingApi.hold({ tripId: Number(tripId), seatNumbers: selected });
      navigate(`/checkout/${booking.id}`);
    } catch (err) {
      const apiError = unwrapError(err);
      // Nếu ghế đã bị giữ bởi người khác -> đánh dấu ghế đó unavailable, bỏ khỏi selection
      if (apiError.code === "SEAT_ALREADY_HELD" || apiError.code === "SEAT_ALREADY_SOLD") {
        const takenSeat = selected.find((s) => apiError.message.includes(s));
        if (takenSeat) {
          setUnavailable((prev) => [...prev, takenSeat]);
          setSelected((prev) => prev.filter((s) => s !== takenSeat));
        }
      }
      setError(apiError.message);
    } finally {
      setHolding(false);
    }
  }

  const total = selected.length * price;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Bước 1/2</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Chọn ghế của bạn</h1>

      {seats.length === 0 ? (
        <p className="text-ink-60 text-sm">Đang tải sơ đồ ghế...</p>
      ) : (
        <>
          <SeatMap seats={seats} selected={selected} unavailable={unavailable} onToggle={toggleSeat} />

          <div className="mt-6 flex items-center justify-between bg-ink text-paper rounded-2xl p-5">
            <div>
              <p className="text-paper/60 text-xs font-mono uppercase">
                Đã chọn {selected.length} ghế{selected.length > 0 && `: ${selected.join(", ")}`}
              </p>
              <p className="font-display text-2xl font-semibold mt-1">{money(total)}</p>
            </div>
            <button
              onClick={handleHold}
              disabled={holding || selected.length === 0}
              className="bg-amber text-ink font-medium rounded-lg px-6 py-2.5 text-sm hover:bg-amber-dark transition-colors disabled:opacity-40"
            >
              {holding ? "Đang giữ ghế..." : "Giữ ghế & tiếp tục"}
            </button>
          </div>
          {error && <p className="text-coral text-sm mt-3">{error}</p>}
          <p className="text-ink-60 text-xs mt-3">Chọn tối đa {maxSeats} ghế. Ghế được giữ tạm thời trong 5 phút để bạn hoàn tất thanh toán.</p>
        </>
      )}
    </div>
  );
}
