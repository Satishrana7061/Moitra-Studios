import React, { useEffect, useState, useCallback } from "react";
import { fetchBreakingNews, BreakingNewsEvent } from "../services/newsService";
import { ChevronUp, ChevronDown, RefreshCw } from "lucide-react";

interface Props {
    onSelectState?: (event: BreakingNewsEvent) => void;
    events?: BreakingNewsEvent[];
}

const POLL_INTERVAL = 60_000;

const LEADER_AVATARS: Record<string, string> = {
    "Narendra Modi": "/Avaters/NARENDRA MODI (PM).png",
    "Rahul Gandhi": "/Avaters/RAHUL GANDHI.png",
    "Arvind Kejriwal": "/Avaters/ARVIND KEJRIWAL.png",
    "Mamata Banerjee": "/Avaters/MAMTA BENRJEE.png",
    "Yogi Adityanath": "/Avaters/YOGI ADITYANATH.png",
    "M.K. Stalin": "/Avaters/M K STALIN.png",
    "Akhilesh Yadav": "/Avaters/AKHILESH YADAV.png",
    "Nitish Kumar": "/Avaters/NITISH KUMAR.png",
    "Uddhav Thackeray": "/Avaters/UDDAV THACKREAY.png",
    "Amit Shah": "/Avaters/AMIT SHAH.png",
    "Priyanka Gandhi": "/Avaters/PRIYANKA GANDHI.png",
    "Rajnath Singh": "/Avaters/RAJNATH SINGH.png",
    "Bhagwant Mann": "/Avaters/BHAGWANT MANN.png",
    "Lalu Prasad Yadav": "/Avaters/LALU PRASAD YADAV.png",
    "Smriti Irani": "/Avaters/SMRITI IRANI.png",
    "Mayawati": "/Avaters/MAYAWATI.png",
    "Nirmala Sitharaman": "/Avaters/NIRMALA SITHARAMAN.png",
    "N. Chandrababu Naidu": "/Avaters/N. CHANDRABABU NAIDU.png",
    "Pinarayi Vijayan": "/Avaters/PINARAYI VIJAYAN.png",
    "Prashant Kishor": "/Avaters/PRASHANT KISHOR.png",
    "Tejaswi Yadav": "/Avaters/TEJASWI YADAV.png",
    "Mallikarjun Kharge": "/Avaters/MALLIKARJUN KHARGE.png",
    "Regional Front": "/Avaters/MAMTA BENRJEE.png",
    "National Front": "/Avaters/NARENDRA MODI (PM).png",
};

function getLeaderAvatar(name: string, stateName?: string): string {
    if (LEADER_AVATARS[name]) return LEADER_AVATARS[name];

    const lowerName = name.toLowerCase();
    const lowerState = stateName?.toLowerCase();

    // Regional Fallbacks
    if (lowerState === "west bengal" && (lowerName.includes("regional") || lowerName.includes("front"))) {
        return "/Avaters/MAMTA BENRJEE.png";
    }
    if (lowerState === "tamil nadu" && (lowerName.includes("regional") || lowerName.includes("front"))) {
        return "/Avaters/M K STALIN.png";
    }
    if (lowerState === "delhi" && (lowerName.includes("regional") || lowerName.includes("front"))) {
        return "/Avaters/ARVIND KEJRIWAL.png";
    }

    for (const [key, val] of Object.entries(LEADER_AVATARS)) {
        if (lowerName.includes(key.toLowerCase().split(" ")[0])) return val;
    }
    return "/Avaters/NARENDRA MODI (PM).png";
}

const sentimentConfig = {
    positive: { arrow: "▲", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_12px_rgba(52,211,153,0.3)]" },
    negative: { arrow: "▼", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", glow: "shadow-[0_0_12px_rgba(248,113,113,0.3)]" },
    neutral: { arrow: "●", text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", glow: "" },
};

const BreakingNewsTicker: React.FC<Props> = ({ onSelectState, events: propsEvents }) => {
    const [localEvents, setLocalEvents] = useState<BreakingNewsEvent[]>([]);
    const [loading, setLoading] = useState(!propsEvents);
    const [tickerIdx, setTickerIdx] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false); // Mobile Drawer state

    const events = propsEvents || localEvents;

    const loadNews = useCallback(async () => {
        if (propsEvents) return;
        try {
            const data = await fetchBreakingNews();
            setLocalEvents(data);
        } catch { /* keep existing */ } finally {
            setLoading(false);
        }
    }, [propsEvents]);

    useEffect(() => {
        if (propsEvents) {
            setLoading(false);
            return;
        }
        loadNews();
        const id = setInterval(loadNews, POLL_INTERVAL);
        return () => clearInterval(id);
    }, [loadNews, propsEvents]);

    useEffect(() => {
        if (events.length === 0) return;
        const id = setInterval(() => setTickerIdx((p) => (p + 1) % events.length), 6000);
        return () => clearInterval(id);
    }, [events.length]);

    const tickerEvent = events[tickerIdx];

    const handleCardClick = (e: React.MouseEvent, ev: BreakingNewsEvent) => {
        e.stopPropagation();
        setSelectedId(ev.id === selectedId ? null : ev.id);
        onSelectState?.(ev);
        // On mobile, if expanded, we might want to auto-collapse partially, but for now just select
        if (window.innerWidth < 768) {
            // Small delay to let user see selection before potential collapse
        }
    };

    const getSentimentConfig = (delta: any, sentiment: string) => {
        const numDelta = Number(delta);
        if (numDelta < 0) return sentimentConfig.negative;
        return sentimentConfig[sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
    };

    return (
        <div className="contents">
            <style>{`
        @keyframes bnPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes bnTickerScroll { 0%{transform:translateY(20px);opacity:0} 15%{transform:translateY(0);opacity:1} 85%{opacity:1} 100%{transform:translateY(-20px);opacity:0} }
        .ticker-animation { animation: bnTickerScroll 6s ease-in-out infinite; }
      `}</style>

            {/* ── DESKTOP & iPAD SIDE PANEL ────────────────────────── */}
            <div
                className={`hidden md:flex absolute left-0 top-[110px] bottom-0 w-[280px] lg:w-[320px] z-40 flex-col bg-slate-950/95 backdrop-blur-xl border-r border-white/5 shadow-2xl transition-transform duration-500`}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-red-600 rounded text-[10px] font-black tracking-tighter text-white uppercase italic">Breaking</span>
                        <span className="font-cinzel font-bold text-xs tracking-widest text-slate-300 uppercase">News</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444] animate-[bnPulse_2s_infinite]"></span>
                        <span className="text-[10px] font-bold text-red-500 tracking-widest">LIVE</span>
                    </div>
                </div>

                {/* Desktop Ticker Item */}
                {tickerEvent && (
                    <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 overflow-hidden">
                        <div key={tickerEvent.id} className="ticker-animation text-[11px] text-slate-400 font-medium">
                            <span className="text-white font-bold">{tickerEvent.stateName}</span>
                            <span className="mx-2 opacity-30 text-white">•</span>
                            <span>{tickerEvent.politicianName}</span>
                            <span className="ml-2 font-black text-emerald-400">+{tickerEvent.delta}%</span>
                        </div>
                    </div>
                )}

                {/* Scrollable Feed */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Scanning Feeds...</span>
                        </div>
                    ) : events.map((ev) => {
                        const sc = getSentimentConfig(ev.delta, ev.sentiment);
                        const isSelected = ev.id === selectedId;
                        return (
                            <button
                                key={ev.id}
                                onClick={(e) => handleCardClick(e, ev)}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-300 border ${isSelected
                                    ? `${sc.border} ${sc.bg} ${sc.glow} translate-x-1`
                                    : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                                    } flex gap-3 items-start group`}
                            >
                                <div className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 ${isSelected ? 'border-emerald-500' : 'border-white/10 opacity-70 group-hover:opacity-100 transition-opacity'}`}>
                                    <img src={getLeaderAvatar(ev.politicianName, ev.stateName)} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-bold text-slate-50 leading-snug mb-1.5 line-clamp-3">{ev.summary}</h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter shrink-0">{ev.stateName}</span>
                                            <span className="text-[9px] font-medium text-slate-500 truncate italic">by {ev.politicianName}</span>
                                        </div>
                                        <span className={`text-[10px] font-black ${sc.text} shrink-0`}>{ev.delta > 0 ? '+' : ''}{ev.delta}%</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40">
                    <span>{events.length} Active Events</span>
                    <button onClick={loadNews} className="hover:text-emerald-400 transition-colors uppercase italic flex items-center gap-1">
                        <RefreshCw size={10} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── MOBILE BOTTOM DRAWER & TICKER ─────────────────────── */}
            <div
                className={`md:hidden fixed inset-x-0 bottom-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? 'h-[70vh]' : 'h-16'
                    }`}
            >
                {/* Backdrop overlay when expanded */}
                {isExpanded && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10 animate-fade-in"
                        onClick={() => setIsExpanded(false)}
                    />
                )}

                <div className={`h-full w-full bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)] px-4`}>

                    {/* Mobile Handle / Ticker Top Bar */}
                    <div
                        className="h-16 flex-shrink-0 flex items-center justify-between cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="text-[9px] font-black text-red-500 tracking-[0.2em]">LIVE</span>
                            </div>

                            {/* Animated Ticker in Top Bar */}
                            {!isExpanded && tickerEvent && (
                                <div className="ticker-animation text-[12px] font-bold text-white truncate pr-4 max-w-[200px] md:max-w-none">
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1 py-0.5 rounded mr-2 uppercase tracking-tighter">{tickerEvent.stateName}</span>
                                    <span className="leading-none">{tickerEvent.summary}</span>
                                </div>
                            )}
                            {isExpanded && (
                                <span className="font-cinzel font-bold text-xs tracking-widest text-slate-300">POLITICAL INTELLIGENCE</span>
                            )}
                        </div>

                        <button className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>

                    {/* Expanded Content View */}
                    {isExpanded && (
                        <div className="flex-1 overflow-y-auto pb-8 space-y-4 pt-2">
                            <div className="grid grid-cols-1 gap-3">
                                {events.map((ev) => {
                                    const sc = getSentimentConfig(ev.delta, ev.sentiment);
                                    const isSelected = ev.id === selectedId;
                                    return (
                                        <button
                                            key={`mob-${ev.id}`}
                                            onClick={(e) => {
                                                handleCardClick(e, ev);
                                                // Optional: close on selection to see the map action
                                                // setIsExpanded(false);
                                            }}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected
                                                ? `${sc.border} ${sc.bg} ring-1 ring-emerald-500/20`
                                                : 'border-white/5 bg-white/[0.02]'
                                                } flex gap-4 items-center`}
                                        >
                                            <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 ${isSelected ? 'border-emerald-500' : 'border-white/10'}`}>
                                                <img src={getLeaderAvatar(ev.politicianName, ev.stateName)} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[14px] font-bold text-white leading-tight line-clamp-2 mb-1.5">{ev.summary}</h4>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{ev.stateName}</span>
                                                        <span className="text-[9px] font-medium text-slate-500 italic">via {ev.politicianName}</span>
                                                    </div>
                                                    <span className={`text-xs font-black ${sc.text}`}>{ev.delta > 0 ? '+' : ''}{ev.delta}%</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BreakingNewsTicker;
