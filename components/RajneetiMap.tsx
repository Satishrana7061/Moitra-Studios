import React, { useEffect, useState, useMemo, useRef } from 'react';
import { STATE_INTEL, DEFAULT_STATE_DATA, StateData } from './stateIntel';
import BreakingNewsTicker from './BreakingNewsTicker';
import { fetchBreakingNews, BreakingNewsEvent } from '../services/newsService';
import { X } from 'lucide-react';

interface GeoJSONFeature {
    type: string;
    geometry: {
        type: string;
        coordinates: any[];
    };
    properties: {
        [key: string]: any;
    };
}

interface GeoJSONData {
    type: string;
    features: GeoJSONFeature[];
}

const RajneetiMap: React.FC = () => {
    const [countryData, setCountryData] = useState<GeoJSONData | null>(null);
    const [stateData, setStateData] = useState<GeoJSONData | null>(null);
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [hoveredState, setHoveredState] = useState<string | null>(null);
    const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
    const [selectedNewsEvent, setSelectedNewsEvent] = useState<BreakingNewsEvent | null>(null);
    const [allEvents, setAllEvents] = useState<BreakingNewsEvent[]>([]);

    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const paths = [
                    '/Moitra-Studios/india_country_FINAL_game.geojson',
                    '/india_country_FINAL_game.geojson',
                    './india_country_FINAL_game.geojson'
                ];

                let countryJson: any = null;
                for (const path of paths) {
                    try {
                        const res = await fetch(path);
                        if (res.ok) {
                            countryJson = await res.json();
                            break;
                        }
                    } catch (e) { }
                }

                const statePaths = [
                    '/Moitra-Studios/india_states_FINAL_game.geojson',
                    '/india_states_FINAL_game.geojson',
                    './india_states_FINAL_game.geojson'
                ];

                let statesJson: any = null;
                for (const path of statePaths) {
                    try {
                        const res = await fetch(path);
                        if (res.ok) {
                            statesJson = await res.json();
                            break;
                        }
                    } catch (e) { }
                }

                if (countryJson && statesJson) {
                    setCountryData(countryJson);
                    setStateData(statesJson);
                }
            } catch (err) {
                console.error("Error loading map data:", err);
            }
        };
        const loadEvents = async () => {
            const news = await fetchBreakingNews();
            setAllEvents(news);
        };
        fetchMapData();
        loadEvents();
        const interval = setInterval(loadEvents, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // SEO: Update page title based on active news
    useEffect(() => {
        if (selectedNewsEvent) {
            document.title = `${selectedNewsEvent.mainPhrase} | Rajneeti Live News`;
        } else if (selectedState) {
            document.title = `${selectedState} Strategy | Rajneeti`;
        } else {
            document.title = "Rajneeti | Indian Political Strategy Game";
        }
    }, [selectedNewsEvent, selectedState]);

    const viewBox = useMemo(() => {
        if (!countryData) return "0 0 1000 1000";
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        countryData.features.forEach(feature => {
            const processCoords = (coords: any) => {
                if (typeof coords[0] === 'number') {
                    minX = Math.min(minX, coords[0]);
                    minY = Math.min(minY, coords[1]);
                    maxX = Math.max(maxX, coords[0]);
                    maxY = Math.max(maxY, coords[1]);
                } else { coords.forEach(processCoords); }
            };
            processCoords(feature.geometry.coordinates);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const margin = Math.max(width, height) * 0.05;
        return `${minX - margin} ${minY - margin} ${width + margin * 2} ${height + margin * 2}`;
    }, [countryData]);

    const getPath = (feature: GeoJSONFeature) => {
        const { coordinates, type } = feature.geometry;
        const renderPolygon = (poly: any[]) => "M" + poly.map((ring: any[]) => ring.map(p => `${p[0]},${p[1]}`).join("L")).join("Z");
        if (type === "Polygon") return renderPolygon(coordinates);
        else if (type === "MultiPolygon") return coordinates.map(poly => renderPolygon(poly)).join(" ");
        return "";
    };

    const getStateColor = (stateId: string) => {
        const colors = ['#FFD700', '#4CAF50', '#FF6B00', '#00BEFF', '#9D4EDD', '#E63946'];
        let hash = 0;
        for (let i = 0; i < stateId.length; i++) {
            hash = stateId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const handleStateClick = (e: React.MouseEvent, stateId: string) => {
        e.stopPropagation();
        setClickPos({ x: e.clientX, y: e.clientY });

        if (selectedState === stateId) {
            setSelectedState(null);
            setSelectedNewsEvent(null);
            return;
        }

        setSelectedState(stateId);

        // Find the most recent news event for this state
        const matchingEvent = allEvents.find(ev =>
            ev.stateName.toLowerCase() === stateId.toLowerCase() ||
            ev.stateCode.toLowerCase() === stateId.toLowerCase()
        );

        if (matchingEvent) {
            setSelectedNewsEvent(matchingEvent);
        } else {
            setSelectedNewsEvent(null);
        }
    };

    const currentIntel: StateData = (selectedState && STATE_INTEL[selectedState]) || DEFAULT_STATE_DATA;

    const sentimentConfig = {
        positive: { text: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]", popupText: "text-emerald-500" },
        negative: { text: "text-rose-400", bg: "bg-red-500/20", border: "border-rose-500/30", glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]", popupText: "text-rose-500" },
        neutral: { text: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/30", glow: "", popupText: "text-slate-500" },
    };

    const getSentimentConfig = (delta: any) => {
        const numDelta = Number(delta);
        if (numDelta < 0) return sentimentConfig.negative;
        return sentimentConfig.positive;
    };

    if (!countryData || !stateData) {
        return <div className="fixed inset-0 bg-slate-950"></div>;
    }

    // ── State highlight from news click ────────────────────────
    const handleNewsStateSelect = (event: any) => {
        if (!stateData) return;

        setSelectedNewsEvent(event);

        for (const f of stateData.features) {
            const code = f.properties.ST_CODE || f.properties.state_code || '';
            const name = f.properties.State_Name || '';

            if (code === event.stateCode || name.toLowerCase().includes(event.stateCode.toLowerCase())) {
                setSelectedState(name);
                break;
            }
        }
    };

    // Helper to stop propagation when clicking on panels
    const stopBubbling = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className={`relative w-full h-full bg-slate-950 select-none flex flex-col ${selectedState ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-hidden'}`}>
            {/* SECTION 1: Map & Overlays (Viewport height on mobile/ipad) */}
            <div className={`relative flex-shrink-0 w-full flex flex-col items-center justify-center transition-all duration-500 ${selectedState ? 'h-[70vh] lg:h-full' : 'h-full'}`}>
                {/* India Map Background */}
                <div
                    className="absolute inset-0 z-0 flex items-center justify-center pt-[110px] md:pt-0"
                    onClick={() => {
                        setSelectedState(null);
                        setSelectedNewsEvent(null);
                    }}
                >
                    <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
                        <svg
                            ref={svgRef}
                            viewBox={viewBox}
                            className="w-full h-full drop-shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-all duration-700 ease-out"
                            onClick={stopBubbling}
                        >
                            <defs>
                                <filter id="stateGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="15000" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="metallicGold" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
                                    <stop offset="50%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: '#92400e', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>

                            {(() => {
                                const vb = viewBox.split(' ').map(Number);
                                const centerY = vb[1] + vb[3] / 2;
                                return (
                                    <g transform={`scale(1, -1) translate(0, -${centerY * 2})`}>
                                        <g className="country-layer">
                                            {countryData.features.map((f, i) => (
                                                <path key={`country-${i}`} d={getPath(f)} fill="#050a1d" stroke="url(#metallicGold)" strokeWidth="3000" strokeOpacity="0.3" />
                                            ))}
                                        </g>
                                        <g className="state-layer">
                                            {stateData.features.map((f, i) => {
                                                const stateId = f.properties.State_Name || i.toString();
                                                const isSelected = selectedState === stateId;
                                                const isHovered = hoveredState === stateId;

                                                return (
                                                    <path
                                                        key={`state-${stateId}`}
                                                        d={getPath(f)}
                                                        fill={isSelected ? "#1e40af" : (isHovered ? "#ffffff22" : getStateColor(stateId))}
                                                        stroke="#000"
                                                        strokeWidth={isSelected ? "5000" : (isHovered ? "3000" : "800")}
                                                        strokeOpacity={isSelected || isHovered ? 0.8 : 0.3}
                                                        className="cursor-pointer transition-all duration-300"
                                                        style={{
                                                            opacity: 0.9,
                                                            transform: isSelected ? 'translate(0, 40000)' : (isHovered ? 'translate(0, 10000)' : 'none'),
                                                        }}
                                                        onMouseEnter={() => !selectedState && setHoveredState(stateId)}
                                                        onMouseLeave={() => setHoveredState(null)}
                                                        onClick={(e) => handleStateClick(e, stateId)}
                                                    />
                                                );
                                            })}
                                        </g>
                                    </g>
                                );
                            })()}
                        </svg>


                        {/* VOTE IMPACT BADGE (Appears on top of map for ALL screens) */}
                        {selectedState && selectedNewsEvent && (
                            <div
                                className="fixed pointer-events-none z-[150] animate-pop-3d"
                                style={{
                                    left: `${clickPos.x}px`,
                                    top: `${clickPos.y}px`,
                                    transform: 'translate(-50%, -100%) translateY(-20px)'
                                }}
                            >
                                <div className="relative flex items-center bg-black/95 border border-white/20 rounded-full py-1.5 px-3 md:py-2 md:px-4 shadow-2xl backdrop-blur-md">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 ${getSentimentConfig(selectedNewsEvent.delta).border} mr-2 md:mr-3 bg-slate-800`}>
                                        <img
                                            src={getLeaderAvatar(selectedNewsEvent.politicianName, selectedNewsEvent.stateName)}
                                            className="w-full h-full object-cover"
                                            alt="Leader"
                                            onError={(e) => (e.currentTarget.src = "/Avaters/NARENDRA MODI (PM).png")}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedState}</span>
                                        <div className="flex items-center gap-1 md:gap-2">
                                            <span className="text-[10px] md:text-sm font-black text-white uppercase tracking-tight">
                                                {selectedNewsEvent.mainPhrase}
                                            </span>
                                            <span className={`${getSentimentConfig(selectedNewsEvent.delta).bg} ${getSentimentConfig(selectedNewsEvent.delta).text} ${getSentimentConfig(selectedNewsEvent.delta).border} text-[9px] md:text-xs font-black px-1.5 py-0.5 rounded ml-0.5 border`}>
                                                {Number(selectedNewsEvent.delta) > 0 ? '+' : ''}{selectedNewsEvent.delta}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/20"></div>
                                </div>
                            </div>
                        )}

                        {/* FLOATING IMPACT POPUP (Desktop/Large Screen Only) */}
                        {selectedNewsEvent && (
                            <div
                                className="hidden lg:block fixed md:absolute md:left-[310px] lg:left-[340px] left-1/2 md:translate-x-0 -translate-x-1/2 top-1/2 -translate-y-[120%] md:-translate-y-[120%] z-[160] w-[90%] max-w-[340px] bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-3xl p-5 md:p-6 animate-pop-3d"
                                onClick={stopBubbling}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-white text-lg md:text-xl font-bold font-cinzel tracking-tight">Impact Analysis</h3>
                                    <button
                                        onClick={() => setSelectedNewsEvent(null)}
                                        className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-5">
                                    {(() => {
                                        const sc = getSentimentConfig(selectedNewsEvent.delta);
                                        return (
                                            <>
                                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 ${sc.border} ${sc.glow} bg-slate-800`}>
                                                    <img
                                                        src={getLeaderAvatar(selectedNewsEvent.politicianName, selectedNewsEvent.stateName)}
                                                        className="w-full h-full object-cover"
                                                        alt=""
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-base md:text-lg leading-tight truncate max-w-[180px]">
                                                        {selectedNewsEvent.stateName}
                                                    </span>
                                                    <span className={`${sc.text} font-black text-lg md:text-xl uppercase`}>
                                                        {Number(selectedNewsEvent.delta) > 0 ? '+' : ''}{selectedNewsEvent.delta}% {selectedNewsEvent.partyName}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-2.5">
                                    <h4 className={`${getSentimentConfig(selectedNewsEvent.delta).popupText} font-bold text-[10px] uppercase tracking-[0.2em]`}>Live Summary</h4>
                                    <p className="text-slate-200 text-sm leading-relaxed font-medium">
                                        {selectedNewsEvent.summary}
                                    </p>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest italic font-cinzel">Moitra Intelligence</span>
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 cursor-pointer hover:bg-white/10">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION 2: Intelligence Card (Scrolls on mobile/ipad, Absolute on desktop) */}
            {selectedState && (
                <div
                    className="relative lg:fixed lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:z-[70] w-full lg:w-auto h-auto flex items-center justify-center py-10 lg:py-0 bg-slate-950 lg:bg-transparent"
                    onClick={stopBubbling}
                >
                    <div className="relative w-[360px] h-[480px] animate-card-slide pointer-events-auto">
                        {/* Card Background Asset */}
                        <div
                            className="absolute inset-0 z-0 bg-no-repeat bg-[length:100%_100%] bg-center drop-shadow-[0_20px_50px_rgba(0,0,0,1)]"
                            style={{ backgroundImage: "url('Popup.png')" }}
                        ></div>

                        <div className="relative z-20 w-full h-full flex flex-col px-8 text-white pt-8 pb-8">
                            {/* Close Button (Mostly useful on desktop now, but keep for consistency) */}
                            <button
                                onClick={() => setSelectedState(null)}
                                className="absolute top-10 right-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-all border border-white/10"
                            >
                                <X size={16} />
                            </button>

                            <div className="text-center mb-12">
                                <h2 className="font-cinzel font-black uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight mb-2 text-sm">
                                    {selectedState}
                                </h2>
                                <div className="font-cinzel text-[9px] tracking-[0.25em] uppercase font-bold border-b border-yellow-400/40 pb-5 mx-auto w-4/5" style={{ color: '#FFD700', textShadow: '0 0 12px #FFD700' }}>
                                    {currentIntel.strategicTitle}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-8 text-center">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] uppercase tracking-widest font-black mb-1.5 text-orange-500">Role</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none">{currentIntel.role}</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-r border-white/10 px-1">
                                    <span className="text-[9px] uppercase tracking-widest font-black mb-1.5 text-purple-400">DIFF</span>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className={`w-2 h-2 rotate-45 ${i < (currentIntel.difficulty || 1) ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-slate-700'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] uppercase tracking-widest font-black mb-1.5 text-cyan-400">Impact</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none">{currentIntel.impact}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-auto px-2">
                                {[
                                    { label: "Mood", val: currentIntel.powerMeters?.neighborhoodMood, color: "#22d3ee" },
                                    { label: "Media", val: currentIntel.powerMeters?.mediaInfluence, color: "#fb923c" },
                                    { label: "Alliance", val: currentIntel.powerMeters?.alliancePower, color: "#34d399" }
                                ].map((meter, idx) => {
                                    const radius = 24;
                                    const circ = 2 * Math.PI * radius;
                                    const offset = circ - (((meter.val || 50) / 100) * circ);
                                    return (
                                        <div key={idx} className="flex flex-col items-center">
                                            <div className="relative w-16 h-16">
                                                <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                                                    <circle cx="30" cy="30" r={radius} stroke="#1e293b" strokeWidth="3" fill="none" />
                                                    <circle cx="30" cy="30" r={radius} stroke={meter.color} strokeWidth="3" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black">{meter.val}%</div>
                                            </div>
                                            <span className="text-[9px] uppercase tracking-tighter mt-1 text-slate-400 font-bold">{meter.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-[11px] text-sky-100 italic font-serif leading-relaxed text-center px-4 mb-6 mt-4">
                                "{currentIntel.flavorText}"
                            </p>

                            <a href="https://play.google.com/store/apps/details?id=com.rajneeti" target="_blank" rel="noopener noreferrer" className="block w-full">
                                <div className="bg-gameOrange hover:bg-orange-600 transition-all duration-300 py-3 text-center rounded font-cinzel font-black text-[10px] tracking-widest text-white shadow-lg active:scale-95">
                                    ENTER THE CAMPAIGN
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                    @keyframes card-slide { 
                      from { transform: translateY(50px); opacity: 0; } 
                      to { transform: translateY(0); opacity: 1; } 
                    }
                    @media (min-width: 1024px) {
                        @keyframes card-slide { 
                          from { transform: translateX(100%); opacity: 0; } 
                          to { transform: translateX(0); opacity: 1; } 
                        }
                    }
                    .animate-card-slide { animation: card-slide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                    @keyframes pop-3d { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                    .animate-pop-3d { animation: pop-3d 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>


            <div className="relative z-10 w-full flex justify-center py-6 mt-auto">
                <a
                    href="https://play.google.com/store/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 group"
                >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a2.203 2.203 0 01-.61-1.511V3.325c0-.573.22-1.092.61-1.511zM14.502 12.71l2.583 2.583-9.524 5.49a2.189 2.189 0 01-1.353.284l8.294-8.357zM17.839 12.427L20.8 10.71c.73-.418.73-1.482 0-1.9L17.84 7.093l-3.34 3.341 3.339 1.993zM14.502 11.29l-8.293-8.357a2.189 2.189 0 011.353.284l9.524 5.49-2.584 2.583z" />
                    </svg>
                    <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Get it on</span>
                        <span className="text-[15px] font-black text-white tracking-tight">Google Play</span>
                    </div>
                </a>
            </div>

            <BreakingNewsTicker onSelectState={handleNewsStateSelect} events={allEvents} />
        </div>
    );
};

// Helper inside file for now - should be shared or mapped properly
function getLeaderAvatar(name: string, stateName?: string): string {
    const map: Record<string, string> = {
        "Narendra Modi": "/Avaters/NARENDRA MODI (PM).png",
        "Rahul Gandhi": "/Avaters/RAHUL GANDHI.png",
        "Arvind Kejriwal": "/Avaters/ARVIND KEJRIWAL.png",
        "Mamata Banerjee": "/Avaters/MAMTA BENRJEE.png",
        "Yogi Adityanath": "/Avaters/YOGI ADITYANATH.png",
        "M.K. Stalin": "/Avaters/M K STALIN.png",
        "Regional Front": "/Avaters/MAMTA BENRJEE.png",
        "National Front": "/Avaters/NARENDRA MODI (PM).png",
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
    };

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

    if (map[name]) return map[name];
    for (const [key, val] of Object.entries(map)) {
        if (lowerName.includes(key.toLowerCase().split(" ")[0])) return val;
    }
    return "/Avaters/NARENDRA MODI (PM).png";
}

export default RajneetiMap;

