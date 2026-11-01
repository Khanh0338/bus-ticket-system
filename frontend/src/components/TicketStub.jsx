import React from "react";

// Sinh mã "QR giả" từ chuỗi qr_code để mỗi vé có hoa văn riêng, không dùng thư viện QR thật
// (đủ dùng cho mục đích demo trực quan trong đồ án).
function pseudoQrCells(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const cells = [];
  for (let i = 0; i < 64; i++) {
    cells.push((hash >> (i % 24)) & 1);
  }
  return cells;
}

export function QrFake({ seed }) {
  const cells = pseudoQrCells(seed || "TICKET");
  return (
    <div className="qr-fake">
      {cells.map((on, i) => (
        <span key={i} style={{ opacity: on ? 1 : 0.08 }} />
      ))}
    </div>
  );
}

export default function TicketStub({ trip, seatNumbers, qrCode, status = "PENDING", passengerName }) {
  const stampLabel = status === "USED" ? "ĐÃ SỬ DỤNG" : status === "CONFIRMED" ? "ĐÃ XÁC NHẬN" : null;
  return (
    <div className="flex rounded-2xl overflow-hidden shadow-lg shadow-ink/10 border border-ink/10 bg-paper relative">
      <div className="flex-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-60">Vé xe khách</span>
          {stampLabel && (
            <span className="stamp font-display text-xs font-bold text-teal border-2 border-teal rounded px-2 py-0.5">
              {stampLabel}
            </span>
          )}
        </div>
        <p className="font-display text-2xl font-semibold leading-tight">
          {trip.origin} <span className="text-amber">→</span> {trip.destination}
        </p>
        <p className="text-ink-60 text-sm mt-1">
          {new Date(trip.departure_time).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" })}
        </p>
        <div className="flex gap-6 mt-4 font-mono text-sm">
          <div>
            <p className="text-ink-60 text-xs uppercase">Ghế</p>
            <p className="font-semibold text-base">{Array.isArray(seatNumbers) ? seatNumbers.join(", ") : seatNumbers}</p>
          </div>
          {passengerName && (
            <div>
              <p className="text-ink-60 text-xs uppercase">Hành khách</p>
              <p className="font-semibold text-base">{passengerName}</p>
            </div>
          )}
        </div>
      </div>
      <div className="ticket-perf w-px shrink-0" />
      <div className="w-32 shrink-0 bg-ink text-paper flex flex-col items-center justify-center gap-2 p-3">
        {qrCode ? <QrFake seed={qrCode} /> : <div className="w-16 h-16 rounded border border-dashed border-paper/30" />}
        <p className="font-mono text-[10px] text-paper/60 text-center break-all">{qrCode || "Chưa xuất vé"}</p>
      </div>
    </div>
  );
}
