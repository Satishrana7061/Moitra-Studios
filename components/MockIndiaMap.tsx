import React from "react";
import { RajneetiEvent } from "../types/rajneeti";

type Props = {
    activeEvents: RajneetiEvent[];
    onBadgeClick?: (eventId: string) => void;
};

const statePosition: Record<string, { top: string; left: string }> = {
    MH: { top: "58%", left: "37%" },
    UP: { top: "38%", left: "48%" },
    DL: { top: "30%", left: "43%" },
    WB: { top: "40%", left: "63%" },
};

export const MockIndiaMap: React.FC<Props> = ({ activeEvents, onBadgeClick }) => {
    return (
        <div className="relative w-full h-full bg-[url('/india-map-blur.jpg')] bg-cover bg-center rounded-2xl overflow-hidden border border-slate-700">
            <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/30 to-emerald-500/10" />
            {activeEvents.map((ev) => {
                const pos = statePosition[ev.stateCode] ?? { top: "50%", left: "50%" };
                const isPositive = ev.delta > 0;
                const color = isPositive ? "bg-emerald-500" : ev.delta < 0 ? "bg-red-500" : "bg-slate-500";
                const ring = isPositive ? "ring-emerald-400" : ev.delta < 0 ? "ring-red-400" : "ring-slate-400";

                return (
                    <button
                        key={ev.id}
                        type="button"
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 rounded-full ${color} bg-opacity-90 text-white text-xs shadow-lg ring-2 ${ring} backdrop-blur-sm`}
                        style={{ top: pos.top, left: pos.left }}
                        onClick={() => onBadgeClick?.(ev.id)}
                    >
                        <span className="w-7 h-7 rounded-full bg-black/40 border border-white/40" />
                        <span className="font-semibold">
                            {ev.stateName}: {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
