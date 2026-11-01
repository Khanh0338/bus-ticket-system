import React, { useState } from "react";
import { ticketApi, unwrapError } from "../api.js";

export default function StaffCheckInPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setResult(null); setError(null);
    if (!code.trim()) return;
    setLoading(true);
    try { setResult(await ticketApi.checkIn(code.trim())); }
    catch (err) { setError(unwrapError(err).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Nhân viên</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Soát vé lên xe</h1>
      <form onSubmit={submit} className="flex gap-3 mb-6">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Nhập hoặc quét mã vé (QR-...)"
          className="flex-1 rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber" />
        <button disabled={loading} className="bg-ink text-paper rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50">{loading ? "..." : "Soát vé"}</button>
      </form>
      {error && <div className="rounded-2xl border border-coral/40 bg-coral/5 p-5 text-coral text-sm">{error}</div>}
      {result && (
        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-5 text-sm">
          <p className="font-display text-lg font-semibold text-teal mb-1">Hợp lệ, cho lên xe</p>
          <p className="font-mono">Chuyến #{result.trip_id} · ghế {result.seat_numbers}</p>
          <p className="text-ink-60 font-mono text-xs mt-1">{result.qr_code}</p>
        </div>
      )}
    </div>
  );
}
