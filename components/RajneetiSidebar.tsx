import React, { useEffect, useMemo, useState } from "react";
import { RAJNEETI_EVENTS } from "./RajneetiMockData";
import { RajneetiEvent } from "../types/rajneeti";
import { MockIndiaMap } from "./MockIndiaMap";
import { RajneetiImpactPopup } from "./RajneetiImpactPopup";

export const RajneetiSidebar: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(RAJNEETI_EVENTS[0]?.id ?? null);
  const [tickerIndex, setTickerIndex] = useState(0);

  const activeEvent: RajneetiEvent | null = useMemo(
    () => RAJNEETI_EVENTS.find((e) => e.id === activeId) ?? null,
    [activeId]
  );

  // auto-rotate ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % RAJNEETI_EVENTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const tickerEvent = RAJNEETI_EVENTS[tickerIndex];

  const handleSelect = (id: string) => {
    setActiveId(id);
  };

  const handleBadgeClick = (id: string) => {
    setActiveId(id);
  };

  return (
    <div className="flex h-[600px] w-full gap-4 text-white">
      {/* LEFT SIDEBAR */}
      <aside className="w-[340px] rounded-3xl bg-slate-950/95 border border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-sky-500 border border-white/30 flex items-center justify-center text-xs">
              🇮🇳
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-200">
                Rajneeti News
              </span>
              <span className="text-[10px] text-slate-400">
                Live impact from Indian politics
              </span>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="px-4 py-2 border-b border-slate-800 bg-gradient-to-r from-emerald-500/10 via-slate-900 to-red-500/10">
          <div className="flex items-center gap-2 text-[11px] overflow-hidden">
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] uppercase tracking-wide font-semibold">
              Live
            </span>
            <div className="relative flex-1 h-5 overflow-hidden">
              <div
                key={tickerEvent.id}
                className="absolute inset-0 animate-[tickerSlide_8s_linear_infinite]"
              >
                <span className="whitespace-nowrap">
                  {tickerEvent.stateName} · {tickerEvent.politicianName} ·{" "}
                  {tickerEvent.delta > 0 ? `+${tickerEvent.delta}` : tickerEvent.delta}{" "}
                  {tickerEvent.partyName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
          {RAJNEETI_EVENTS.map((ev) => {
            const selected = ev.id === activeId;
            const isPositive = ev.delta > 0;
            const accent =
              isPositive ? "text-emerald-400" : ev.delta < 0 ? "text-red-400" : "text-slate-300";

            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => handleSelect(ev.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-900/60 border border-transparent hover:border-emerald-400/50 transition ${
                  selected
                    ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]"
                    : "shadow-sm"
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${ev.avatarColor} flex items-center justify-center`}>
                  <span className="w-7 h-7 rounded-full bg-black/40 border border-white/30" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold text-white truncate">
                    {ev.politicianName}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className={accent}>
                      {ev.delta > 0 ? `+${ev.delta}` : ev.delta} · {ev.partyName}
                    </span>
                    <span className="text-slate-500">· {ev.stateName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-300">+{ev.score}</span>
                  <span className="px-2 py-[2px] rounded-full bg-slate-800 text-[9px] uppercase tracking-wide text-slate-200">
                    {ev.statusLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom avatars (simple placeholders) */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-3 bg-slate-950">
          {["bg-emerald-500", "bg-red-500", "bg-sky-500", "bg-amber-500"].map((c) => (
            <div key={c} className={`w-8 h-8 rounded-full ${c} flex items-center justify-center`}>
              <span className="w-6 h-6 rounded-full bg-black/40 border border-white/40" />
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT: MAP + POPUP */}
      <div className="flex-1 relative">
        <MockIndiaMap
          activeEvents={activeEvent ? [activeEvent] : []}
          onBadgeClick={handleBadgeClick}
        />
        <RajneetiImpactPopup event={activeEvent} onClose={() => setActiveId(null)} />
      </div>
    </div>
  );
};
