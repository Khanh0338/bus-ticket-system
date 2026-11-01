import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { tripApi, bookingApi, unwrapError } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import SeatMap from "../components/SeatMap.jsx";

const money = (v) => Number(v).toLocaleString("vi-VN") + "đ";
const fmt = (d) => new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

function Card({ title, children, className = "" }) {
  return (
    <section className={`bg-paper border border-ink/10 rounded-2xl p-5 shadow-sm ${className}`}>
      {title && <h2 className="font-display text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm">{label} <span className="text-coral">*</span></span>
      {children}
    </label>
  );
}

function Line({ label, value, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-ink-60">{label}</span>
      <span className={`text-right ${strong ? "text-amber-dark font-display text-base" : "font-medium"}`}>{value}</span>
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber";

export default function BookingPage() {
  const { tripId } = useParams();
  const [query] = useSearchParams();
  const maxSeats = Math.min(Math.max(parseInt(query.get("qty"), 10) || 6, 1), 6);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [trip, setTrip] = useState(null);
  const [layout, setLayout] = useState(null);
  const [selected, setSelected] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [contact, setContact] = useState({ name: user?.fullName || "", phone: user?.phone || "", email: user?.email || "" });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    tripApi.get(tripId).then(setTrip);
    tripApi.getSeats(tripId).then(setLayout);
  }, [tripId]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const st = await bookingApi.seatStatus(tripId);
        if (!active) return;
        const taken = [...st.sold, ...st.held];
        setUnavailable(taken);
        setSelected((prev) => prev.filter((s) => !taken.includes(s)));
      } catch { /* giữ nguyên trạng thái khi mạng chập chờn */ }
    }
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [tripId]);

  function toggle(seat) {
    setError(null);
    if (!selected.includes(seat) && selected.length >= maxSeats) {
      setError(`Bạn đã chọn đủ ${maxSeats} ghế. Bỏ chọn một ghế để đổi sang ghế khác.`);
      return;
    }
    setSelected((p) => (p.includes(seat) ? p.filter((s) => s !== seat) : [...p, seat]));
  }

  function validate() {
    if (selected.length === 0) return "Vui lòng chọn ít nhất 1 ghế";
    if (!contact.name.trim()) return "Vui lòng nhập họ và tên";
    if (!/^(0|\+84)\d{9}$/.test(contact.phone.replace(/\s/g, ""))) return "Số điện thoại không hợp lệ (VD: 0912345678)";
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) return "Email không hợp lệ";
    if (!agree) return "Vui lòng đồng ý với điều khoản đặt vé";
    return null;
  }

  async function handleContinue() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    const msg = validate();
    if (msg) return setError(msg);
    setHolding(true);
    setError(null);
    try {
      const booking = await bookingApi.hold({
        tripId: Number(tripId),
        seatNumbers: selected,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email
      });
      navigate(`/checkout/${booking.id}`);
    } catch (err) {
      const e = unwrapError(err);
      if (e.code === "SEAT_ALREADY_HELD" || e.code === "SEAT_ALREADY_SOLD") {
        const taken = selected.find((s) => e.message.includes(s));
        if (taken) {
          setUnavailable((p) => [...p, taken]);
          setSelected((p) => p.filter((s) => s !== taken));
        }
      }
      setError(e.message);
    } finally {
      setHolding(false);
    }
  }

  if (!trip || !layout) return <p className="text-ink-60 text-sm max-w-6xl mx-auto px-5 py-10">Đang tải thông tin chuyến...</p>;

  const total = selected.length * Number(layout.price);
  const arrive = new Date(new Date(trip.departure_time).getTime() - 30 * 60000);
  const setC = (k) => (e) => setContact((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Đặt vé</p>
      <h1 className="font-display text-3xl font-semibold mb-6">
        {trip.origin} <span className="text-amber">→</span> {trip.destination}
      </h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-5">
          <Card title="Chọn ghế">
            <SeatMap decks={layout.decks} selected={selected} unavailable={unavailable} onToggle={toggle} />
            <p className="text-ink-60 text-xs mt-4">Chọn tối đa {maxSeats} ghế. Ghế được giữ 5 phút sau khi bạn bấm tiếp tục thanh toán.</p>
          </Card>

          <Card title="Thông tin khách hàng">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Họ và tên"><input value={contact.name} onChange={setC("name")} className={inputCls} /></Field>
              <Field label="Số điện thoại"><input value={contact.phone} onChange={setC("phone")} inputMode="tel" className={inputCls} /></Field>
              <div className="md:col-span-2"><Field label="Email"><input value={contact.email} onChange={setC("email")} type="email" className={inputCls} /></Field></div>
            </div>
            <div className="mt-5 rounded-xl bg-paper-dim/70 p-4 text-sm leading-relaxed space-y-2">
              <p className="font-display font-semibold text-coral uppercase text-xs tracking-wide">Điều khoản và lưu ý</p>
              <p>Quý khách có mặt tại bến xuất phát trước giờ xe chạy ít nhất 30 phút, mang theo mã vé (trong email xác nhận hoặc mục Vé của tôi).</p>
              <p>Ghế được giữ tạm 5 phút. Hết thời gian mà chưa thanh toán, ghế tự động mở lại cho người khác.</p>
              <p>Mỗi mã vé chỉ được soát một lần. Có thể tra cứu vé bằng mã ở mục Tra cứu vé, không cần đăng nhập.</p>
            </div>
            <label className="flex items-center gap-2 mt-4 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              Tôi đã đọc và đồng ý với điều khoản đặt vé
            </label>
          </Card>

          <Card title="Thông tin đón trả">
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <p className="font-mono text-xs uppercase text-ink-60 mb-1">Điểm đón</p>
                <p className="font-medium">Bến xe {trip.origin}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase text-ink-60 mb-1">Điểm trả</p>
                <p className="font-medium">Bến xe {trip.destination}</p>
              </div>
            </div>
            <p className="text-sm text-ink-60 mt-4">
              Quý khách vui lòng có mặt tại bến xe trước <span className="font-semibold text-coral">{fmt(arrive)}</span> để được kiểm tra thông tin trước khi lên xe.
            </p>
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5">
          <Card title="Thông tin chuyến đi">
            <Line label="Tuyến xe" value={`${trip.origin} - ${trip.destination}`} />
            <Line label="Thời gian xuất bến" value={fmt(trip.departure_time)} />
            <Line label="Loại xe" value={trip.bus_type || "Limousine"} />
            <Line label="Số lượng ghế" value={`${selected.length} ghế`} />
            <Line label="Số ghế" value={selected.length ? selected.join(", ") : "Chưa chọn"} />
          </Card>

          <Card title="Chi tiết giá">
            <Line label="Giá vé lượt đi" value={money(total)} />
            <Line label="Phí thanh toán" value="0đ" />
            <div className="border-t border-ink/10 mt-2 pt-2"><Line label="Tổng tiền" value={money(total)} strong /></div>
            {error && <p className="text-coral text-sm mt-3">{error}</p>}
            {!isAuthenticated && <p className="text-ink-60 text-xs mt-3">Bạn cần đăng nhập để giữ ghế.</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => navigate("/")} className="flex-1 rounded-full border border-ink/20 py-2.5 text-sm hover:border-amber transition-colors">Hủy</button>
              <button onClick={handleContinue} disabled={holding}
                className="flex-[2] rounded-full bg-amber text-ink font-medium py-2.5 text-sm hover:bg-amber-dark transition-colors disabled:opacity-50">
                {holding ? "Đang giữ ghế..." : isAuthenticated ? "Tiếp tục thanh toán" : "Đăng nhập để đặt vé"}
              </button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
