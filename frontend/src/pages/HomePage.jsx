import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tripApi } from "../api.js";
import { QrFake } from "../components/TicketStub.jsx";

const money = (v) => Number(v).toLocaleString("vi-VN") + "đ";
const todayStr = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD theo giờ máy

function timeUntil(departureTime) {
  const diffMs = new Date(departureTime) - new Date();
  if (diffMs <= 0) return "Đã khởi hành";
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `Còn ${days} ngày nữa`;
  return `Còn ${Math.max(hours, 1)} giờ nữa`;
}

const STEPS = [
  { n: "01", title: "Tìm chuyến", text: "Chọn điểm đi, điểm đến và ngày khởi hành." },
  { n: "02", title: "Chọn ghế", text: "Chọn trực tiếp trên sơ đồ xe, thấy ngay ghế nào còn trống." },
  { n: "03", title: "Giữ chỗ 5 phút", text: "Ghế được giữ tạm để bạn thanh toán mà không bị người khác đặt trùng." },
  { n: "04", title: "Nhận vé điện tử", text: "Vé có mã tra cứu, xem lại bất cứ lúc nào trong mục Vé của tôi." }
];

const FAQ = [
  { q: "Ghế được giữ trong bao lâu?", a: "Sau khi chọn ghế, hệ thống giữ chỗ tạm thời trong 5 phút. Hết thời gian mà chưa thanh toán, ghế tự động mở lại cho người khác." },
  { q: "Nếu thanh toán thất bại thì sao?", a: "Đơn đặt vé sẽ bị hủy và ghế được nhả ngay, bạn có thể chọn lại hoặc đặt ghế khác." },
  { q: "Hai người cùng chọn một ghế thì ai được?", a: "Người gửi yêu cầu giữ ghế trước sẽ giữ được. Người còn lại nhận thông báo ghế đã có người giữ và chọn ghế khác." },
  { q: "Làm sao xem lại vé đã đặt?", a: "Vào mục Vé của tôi (sau khi đăng nhập), hoặc dùng Tra cứu vé với mã vé trong email xác nhận." }
];

export default function HomePage() {
  const navigate = useNavigate();
  const resultsRef = useRef(null);
  const [allTrips, setAllTrips] = useState([]);
  const [results, setResults] = useState(null); // null = chưa tìm
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ origin: "", destination: "", date: "", qty: 1 });

  useEffect(() => {
    tripApi.search({}).then(setAllTrips).finally(() => setLoading(false));
  }, []);

  const originOptions = useMemo(() => [...new Set(allTrips.map((t) => t.origin))], [allTrips]);
  const destinationOptions = useMemo(() => [...new Set(allTrips.map((t) => t.destination))], [allTrips]);

  const popular = useMemo(() => {
    const byOrigin = new Map();
    allTrips.forEach((t) => {
      if (!byOrigin.has(t.origin)) byOrigin.set(t.origin, new Map());
      const dests = byOrigin.get(t.origin);
      const cur = dests.get(t.destination);
      if (!cur) dests.set(t.destination, { destination: t.destination, minPrice: Number(t.price), next: t.departure_time, count: 1 });
      else {
        cur.minPrice = Math.min(cur.minPrice, Number(t.price));
        cur.count += 1;
      }
    });
    return [...byOrigin.entries()]
      .map(([origin, dests]) => ({ origin, dests: [...dests.values()].slice(0, 3), total: [...dests.values()].reduce((s, d) => s + d.count, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [allTrips]);

  const stats = useMemo(() => {
    const routes = new Set(allTrips.map((t) => `${t.origin}>${t.destination}`));
    const cities = new Set(allTrips.flatMap((t) => [t.origin, t.destination]));
    return {
      routes: routes.size,
      trips: allTrips.length,
      seats: allTrips.reduce((s, t) => s + Number(t.total_seats || 0), 0),
      cities: cities.size
    };
  }, [allTrips]);

  async function runSearch(params) {
    setSearching(true);
    try {
      const data = await tripApi.search(params);
      setResults(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } finally {
      setSearching(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const params = {};
    if (form.origin.trim()) params.origin = form.origin.trim();
    if (form.destination.trim()) params.destination = form.destination.trim();
    if (form.date) params.date = form.date;
    runSearch(params);
  }

  function pickRoute(origin, destination) {
    setForm((f) => ({ ...f, origin, destination }));
    runSearch({ origin, destination });
  }

  function swap() {
    setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }));
  }

  const list = results ?? allTrips.slice(0, 6);
  const inputCls = "w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber";

  return (
    <div>
      {/* HERO */}
      <section className="bg-ink text-paper overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 pt-14 pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-amber mb-3">Bảng giờ chạy · Đặt vé tức thì</p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight mb-4">
              Lên xe, đến nơi<br />không lo hết vé.
            </h1>
            <p className="text-paper/60 text-sm max-w-md">
              Chọn ghế trực tiếp trên sơ đồ xe, giữ chỗ 5 phút và nhận vé điện tử ngay sau khi thanh toán.
            </p>
          </div>

          {/* Vé minh họa - chỉ để trang trí */}
          <div className="hidden md:block" aria-hidden="true">
            <div className="flex rounded-2xl overflow-hidden bg-paper text-ink shadow-2xl shadow-black/30 rotate-3 max-w-sm ml-auto">
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-60">Vé xe khách</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-dark">Minh họa</span>
                </div>
                <p className="font-display text-xl font-semibold leading-tight">
                  TP.HCM <span className="text-amber">→</span> Đà Lạt
                </p>
                <p className="text-ink-60 text-xs font-mono mt-1">22:00 · Giường nằm</p>
                <div className="mt-4 font-mono">
                  <p className="text-ink-60 text-[10px] uppercase">Ghế</p>
                  <p className="font-semibold">A12, A13</p>
                </div>
              </div>
              <div className="ticket-perf w-px shrink-0" />
              <div className="w-28 shrink-0 bg-paper-dim flex items-center justify-center p-3">
                <QrFake seed="HERO-SAMPLE-TICKET" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORM TÌM VÉ - nổi lên trên hero */}
      <div className="max-w-5xl mx-auto px-5">
        <form
          onSubmit={handleSubmit}
          className="bg-paper border border-ink/10 rounded-2xl shadow-xl shadow-ink/10 p-5 -mt-16 relative z-10"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_110px] items-end">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-60">Điểm đi</span>
              <input list="origin-options" placeholder="VD: TP.HCM" value={form.origin}
                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} className={inputCls + " mt-1"} />
            </label>
            <button type="button" onClick={swap} aria-label="Đổi chiều"
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-amber-dark hover:border-amber transition-colors">
              ⇄
            </button>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-60">Điểm đến</span>
              <input list="destination-options" placeholder="VD: Đà Lạt" value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} className={inputCls + " mt-1"} />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-60">Ngày đi</span>
              <input type="date" min={todayStr()} value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls + " mt-1"} />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-60">Số vé</span>
              <select value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))} className={inputCls + " mt-1"}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <datalist id="origin-options">{originOptions.map((o) => <option key={o} value={o} />)}</datalist>
          <datalist id="destination-options">{destinationOptions.map((d) => <option key={d} value={d} />)}</datalist>

          <div className="mt-4 flex justify-center">
            <button disabled={searching}
              className="bg-amber text-ink font-medium rounded-full px-10 py-2.5 text-sm hover:bg-amber-dark transition-colors disabled:opacity-50">
              {searching ? "Đang tìm..." : "Tìm chuyến xe"}
            </button>
          </div>
        </form>
      </div>

      {/* KẾT QUẢ / CHUYẾN SẮP KHỞI HÀNH */}
      <section ref={resultsRef} className="max-w-5xl mx-auto px-5 pt-12 scroll-mt-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">
              {results ? "Kết quả tìm kiếm" : "Sắp khởi hành"}
            </p>
            <h2 className="font-display text-2xl font-semibold">
              {results ? `${results.length} chuyến phù hợp` : "Chuyến xe sắp chạy"}
            </h2>
          </div>
          {results && (
            <button onClick={() => setResults(null)} className="text-sm text-ink-60 hover:text-amber-dark transition-colors">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-ink-60 text-sm">Đang tải danh sách chuyến...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-ink/20 rounded-2xl">
            <p className="text-ink-60">Không có chuyến phù hợp. Thử đổi điểm đi/đến hoặc ngày khác.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((trip) => (
              <div key={trip.id} className="flex items-stretch rounded-xl overflow-hidden border border-ink/10 bg-paper shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {trip.bus_type && (
                      <span className="text-[10px] font-mono uppercase tracking-wide bg-teal/10 text-teal px-2 py-0.5 rounded-full">{trip.bus_type}</span>
                    )}
                    <span className="text-[10px] font-mono uppercase tracking-wide bg-amber/10 text-amber-dark px-2 py-0.5 rounded-full">
                      {timeUntil(trip.departure_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg font-semibold">
                        {trip.origin} <span className="text-amber">→</span> {trip.destination}
                      </p>
                      <p className="text-ink-60 text-sm font-mono mt-0.5">
                        {new Date(trip.departure_time).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                        {trip.bus_plate ? ` · ${trip.bus_plate}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-mono font-semibold text-lg">{money(trip.price)}</p>
                      <p className="text-ink-60 text-xs">{trip.total_seats} chỗ</p>
                    </div>
                  </div>
                </div>
                <div className="ticket-perf w-px shrink-0" />
                <button onClick={() => navigate(`/trips/${trip.id}/seats?qty=${form.qty}`)}
                  className="w-28 shrink-0 bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors">
                  Chọn ghế
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4 BƯỚC ĐẶT VÉ */}
      <section className="mt-16 bg-paper-dim">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1 text-center">Hướng dẫn</p>
          <h2 className="font-display text-2xl font-semibold text-center mb-8">Đặt vé trong 4 bước</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-paper rounded-2xl border border-ink/10 p-5">
                <p className="font-mono text-3xl font-semibold text-amber">{s.n}</p>
                <p className="font-display font-semibold mt-2 mb-1">{s.title}</p>
                <p className="text-ink-60 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TUYẾN PHỔ BIẾN - lấy từ dữ liệu chuyến thật */}
      {popular.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 py-14">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1 text-center">Điểm đến được yêu thích</p>
          <h2 className="font-display text-2xl font-semibold text-center mb-8">Tuyến phổ biến</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {popular.map((g) => (
              <div key={g.origin} className="rounded-2xl overflow-hidden border border-ink/10 bg-paper shadow-sm">
                <div className="bg-ink text-paper px-5 py-6">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-paper/60">Tuyến xe từ</p>
                  <p className="font-display text-2xl font-semibold">{g.origin}</p>
                </div>
                <div className="divide-y divide-ink/10">
                  {g.dests.map((d) => (
                    <button key={d.destination} onClick={() => pickRoute(g.origin, d.destination)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-paper-dim transition-colors">
                      <div>
                        <p className="font-body font-medium">{d.destination}</p>
                        <p className="text-ink-60 text-xs font-mono mt-0.5">{d.count} chuyến sắp chạy</p>
                      </div>
                      <p className="font-mono text-sm font-semibold text-amber-dark">Từ {money(d.minPrice)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SỐ LIỆU THẬT TỪ HỆ THỐNG */}
      {stats.trips > 0 && (
        <section className="bg-ink text-paper">
          <div className="max-w-5xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              [stats.cities, "Thành phố kết nối"],
              [stats.routes, "Tuyến đang mở bán"],
              [stats.trips, "Chuyến sắp khởi hành"],
              [stats.seats, "Chỗ ngồi"]
            ].map(([n, label]) => (
              <div key={label}>
                <p className="font-display text-4xl font-semibold text-amber">{n.toLocaleString("vi-VN")}</p>
                <p className="text-paper/60 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1 text-center">Giải đáp</p>
        <h2 className="font-display text-2xl font-semibold text-center mb-6">Câu hỏi thường gặp</h2>
        <div className="space-y-2.5">
          {FAQ.map((f) => (
            <details key={f.q} className="group bg-paper border border-ink/10 rounded-xl px-5 py-3.5">
              <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-sm">
                {f.q}
                <span className="text-amber-dark text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-ink-60 text-sm leading-relaxed mt-2.5">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
