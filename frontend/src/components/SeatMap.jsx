import React from "react";

function Deck({ deck, selected, unavailable, onToggle }) {
  const rows = [];
  for (let i = 0; i < deck.seats.length; i += 4) rows.push(deck.seats.slice(i, i + 4));

  function cls(seat) {
    if (unavailable.includes(seat)) return "bg-ink/10 border-ink/10 text-ink-60/50 cursor-not-allowed";
    if (selected.includes(seat)) return "bg-amber border-amber text-ink font-semibold";
    return "bg-paper border-ink/20 text-ink hover:border-amber hover:text-amber-dark";
  }

  const btn = (seat) => (
    <button
      key={seat}
      type="button"
      disabled={unavailable.includes(seat)}
      onClick={() => onToggle(seat)}
      className={`w-11 h-10 rounded-lg border text-xs font-mono transition-colors ${cls(seat)}`}
    >
      {seat}
    </button>
  );

  return (
    <div>
      <p className="text-center text-sm font-medium mb-3">{deck.name}</p>
      <div className="inline-block bg-paper-dim/60 rounded-xl p-3">
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              {row.slice(0, 2).map(btn)}
              <div className="w-6 shrink-0" />
              {row.slice(2, 4).map(btn)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SeatMap({ decks, selected, unavailable, onToggle }) {
  return (
    <div>
      <div className="flex flex-wrap gap-8 justify-center sm:justify-start">
        {decks.map((d) => (
          <Deck key={d.name} deck={d} selected={selected} unavailable={unavailable} onToggle={onToggle} />
        ))}
      </div>
      <div className="flex gap-5 mt-5 text-xs text-ink-60">
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-ink/10 border border-ink/10 inline-block" />Đã bán / đang giữ</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-paper border border-ink/20 inline-block" />Còn trống</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded bg-amber inline-block" />Đang chọn</span>
      </div>
    </div>
  );
}
