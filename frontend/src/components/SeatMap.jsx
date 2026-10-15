import React from "react";

export default function SeatMap({ seats, selected, unavailable, onToggle }) {
  // Bố trí 2 + lối đi + 2, mỗi hàng 4 ghế -> chia mảng seats thành các hàng
  const rows = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }

  function seatState(seat) {
    if (unavailable.includes(seat)) return "unavailable";
    if (selected.includes(seat)) return "selected";
    return "free";
  }

  const stateClasses = {
    free: "bg-paper border-ink/20 text-ink hover:border-amber hover:text-amber-dark cursor-pointer",
    selected: "bg-amber border-amber text-ink font-semibold cursor-pointer",
    unavailable: "bg-ink/5 border-ink/10 text-ink-60/40 cursor-not-allowed line-through"
  };

  return (
    <div className="bg-paper border border-ink/10 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5 text-ink-60 text-xs font-mono uppercase tracking-wide">
        <div className="w-8 h-5 rounded-t-md border border-ink/30 border-b-0" />
        Đầu xe / tài xế
      </div>
      <div className="space-y-2.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-2.5">
            {row.slice(0, 2).map((seat) => (
              <SeatButton key={seat} seat={seat} state={seatState(seat)} className={stateClasses[seatState(seat)]} onClick={onToggle} />
            ))}
            <div className="w-6 shrink-0" /> {/* lối đi */}
            {row.slice(2, 4).map((seat) => (
              <SeatButton key={seat} seat={seat} state={seatState(seat)} className={stateClasses[seatState(seat)]} onClick={onToggle} />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-5 mt-6 pt-5 border-t border-ink/10 text-xs font-mono">
        <Legend swatch="bg-paper border border-ink/20" label="Còn trống" />
        <Legend swatch="bg-amber border border-amber" label="Đang chọn" />
        <Legend swatch="bg-ink/5 border border-ink/10" label="Đã giữ/đã bán" />
      </div>
    </div>
  );
}

function SeatButton({ seat, state, className, onClick }) {
  return (
    <button
      type="button"
      disabled={state === "unavailable"}
      onClick={() => onClick(seat)}
      className={`flex-1 h-11 rounded-lg border text-sm font-mono transition-colors ${className}`}
    >
      {seat}
    </button>
  );
}

function Legend({ swatch, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3.5 h-3.5 rounded ${swatch}`} />
      {label}
    </div>
  );
}
