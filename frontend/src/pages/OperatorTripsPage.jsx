import React, { useEffect, useState } from "react";
import { tripApi, unwrapError } from "../api.js";

const empty = { origin: "", destination: "", departure: "", bus_type: "Giường nằm", total_seats: 40, price: "", bus_plate: "" };
const inputCls = "mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber";

export default function OperatorTripsPage() {
  const [form, setForm] = useState(empty);
  const [trips, setTrips] = useState([]);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const load = () => tripApi.search({}).then(setTrips);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault(); setMsg(null); setError(null);
    try {
      await tripApi.create({
        origin: form.origin.trim(), destination: form.destination.trim(),
        departure_time: `${form.departure}:00+07:00`, // giờ Việt Nam
        bus_type: form.bus_type, total_seats: Number(form.total_seats), price: Number(form.price), bus_plate: form.bus_plate.trim()
      });
      setMsg("Đã tạo chuyến xe."); setForm(empty); load();
    } catch (err) { setError(unwrapError(err).message); }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Nhà xe</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Quản lý chuyến xe</h1>
      <form onSubmit={submit} className="bg-paper border border-ink/10 rounded-2xl p-5 grid gap-4 md:grid-cols-3">
        <label className="text-sm">Điểm đi<input required value={form.origin} onChange={set("origin")} className={inputCls} /></label>
        <label className="text-sm">Điểm đến<input required value={form.destination} onChange={set("destination")} className={inputCls} /></label>
        <label className="text-sm">Giờ khởi hành<input required type="datetime-local" value={form.departure} onChange={set("departure")} className={inputCls} /></label>
        <label className="text-sm">Loại xe
          <select value={form.bus_type} onChange={set("bus_type")} className={inputCls}>
            <option>Giường nằm</option><option>Limousine</option><option>Ghế ngồi</option>
          </select>
        </label>
        <label className="text-sm">Số ghế (chẵn, 8-60)<input required type="number" value={form.total_seats} onChange={set("total_seats")} className={inputCls} /></label>
        <label className="text-sm">Giá vé (đồng)<input required type="number" value={form.price} onChange={set("price")} className={inputCls} /></label>
        <label className="text-sm">Biển số xe<input value={form.bus_plate} onChange={set("bus_plate")} className={inputCls} /></label>
        <div className="md:col-span-2 flex items-end gap-4">
          <button className="bg-amber text-ink font-medium rounded-lg px-6 py-2.5 text-sm hover:bg-amber-dark transition-colors">Tạo chuyến</button>
          {msg && <span className="text-teal text-sm">{msg}</span>}
          {error && <span className="text-coral text-sm">{error}</span>}
        </div>
      </form>

      <h2 className="font-display text-lg font-semibold mt-8 mb-3">Chuyến sắp khởi hành ({trips.length})</h2>
      <div className="space-y-2">
        {trips.map((t) => (
          <div key={t.id} className="flex justify-between gap-4 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm">
            <span><b>{t.origin} → {t.destination}</b> <span className="text-ink-60 font-mono">· {t.bus_type}</span></span>
            <span className="font-mono text-ink-60">{new Date(t.departure_time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })} · {Number(t.price).toLocaleString("vi-VN")}đ</span>
          </div>
        ))}
      </div>
    </div>
  );
}
