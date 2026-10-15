import React, { useState } from "react";
import { tripApi, ticketApi, unwrapError } from "../api.js";
import TicketStub from "../components/TicketStub.jsx";

export default function TicketLookupPage() {
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState(null);
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup(e) {
    e.preventDefault();
    setError(null);
    setTicket(null);
    if (!code.trim()) {
      setError("Vui lòng nhập mã vé");
      return;
    }
    setLoading(true);
    try {
      const found = await ticketApi.lookup(code.trim());
      setTicket(found);
      const trips = await tripApi.search({});
      const foundTrip = trips.find((t) => t.id === found.trip_id);
      setTrip(foundTrip || { origin: "?", destination: "?", departure_time: new Date() });
    } catch (err) {
      setError(unwrapError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Không cần đăng nhập</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Tra cứu vé</h1>

      <form onSubmit={handleLookup} className="flex gap-3 mb-6">
        <input
          placeholder="Nhập mã vé (VD: QR-xxxxxxxx)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-amber"
        />
        <button
          disabled={loading}
          className="bg-ink text-paper font-medium rounded-lg px-5 py-2 text-sm hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Đang tra..." : "Tra cứu"}
        </button>
      </form>

      {error && (
        <div className="text-center py-10 border border-dashed border-coral/40 rounded-2xl">
          <p className="text-coral text-sm">{error}</p>
        </div>
      )}

      {ticket && trip && (
        <TicketStub
          trip={trip}
          seatNumbers={ticket.seat_numbers.split(",")}
          qrCode={ticket.qr_code}
          status="CONFIRMED"
        />
      )}

      {!ticket && !error && (
        <p className="text-ink-60 text-sm text-center">
          Mã vé được gửi trong email xác nhận sau khi đặt vé thành công.
        </p>
      )}
    </div>
  );
}
