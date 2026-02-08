import React from "react";
import { RajneetiEvent } from "../types/rajneeti";

type Props = {
  event: RajneetiEvent | null;
  onClose: () => void;
};

export const RajneetiImpactPopup: React.FC<Props> = ({ event, onClose }) => {
  if (!event) return null;

  const isPositive = event.delta > 0;
  const accent = isPositive ? "text-emerald-400" : event.delta < 0 ? "text-red-400" : "text-slate-300";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <span className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
            Impact
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex gap-4">
          <div className={`w-14 h-14 rounded-full border-2 border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.7)] flex items-center justify-center ${event.avatarColor}`}>
            <span className="w-8 h-8 rounded-full bg-black/40 border border-white/40" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white mb-1">
              {event.stateName}:{" "}
              <span className={accent}>
                {event.delta > 0 ? `+${event.delta}` : event.delta} {event.partyName}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mb-3">
              Candidate: <span className="text-slate-200">{event.politicianName}</span>
            </div>

            <div className="text-xs font-semibold text-emerald-400 mb-1">
              Summary
            </div>
            <p className="text-[11px] leading-snug text-slate-300 mb-4">
              {event.summary}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
              >
                <span className="w-4 h-4 rounded-full border border-emerald-400 flex items-center justify-center text-[9px]">
                  ↗
                </span>
                Share link
              </button>
              <a
                href={event.shareUrl}
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
              >
                Play this event in game →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
