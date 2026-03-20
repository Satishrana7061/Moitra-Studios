import React, { useEffect, useState, useMemo, useRef } from 'react';
import { STATE_INTEL, DEFAULT_STATE_DATA, StateData } from './stateIntel';
import BreakingNewsTicker from './BreakingNewsTicker';
import { fetchBreakingNews, BreakingNewsEvent } from '../services/newsService';
import InteractiveParticles from './InteractiveParticles';
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
        <div className={`relative w-full min-h-[100dvh] bg-slate-950 select-none flex flex-col ${selectedState ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-hidden'}`}>
            {/* Interactive Particle System — behind map, uses screen blend */}
            <InteractiveParticles />

            {/* SECTION 1: Map & Overlays (Viewport height on mobile/ipad) */}
            <div className={`relative flex-shrink-0 w-full flex flex-col items-center justify-center transition-all duration-500 ${selectedState ? 'h-[70vh] lg:h-[100dvh]' : 'h-[100dvh]'}`}>
                <div
                    className="absolute inset-0 z-0 flex items-center justify-center pb-16 md:pb-0"
                    onClick={() => {
                        setSelectedState(null);
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
                    </div>
                </div>
            </div>

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
                    href="https://play.google.com/store/apps/details?id=com.rajneeti"
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

            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Rajneeti - Indian Political Strategy Game | Master Elections & Build Alliances</h1>

            {/* SEO: About the Game section - visible when scrolling on mobile */}
            <section className="relative z-10 w-full bg-gradient-to-b from-transparent to-slate-950/90 px-4 md:px-8 py-6">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="font-cinzel text-lg md:text-xl font-bold text-white mb-3 normal-case tracking-wide">
                        About Rajneeti
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm leading-relaxed normal-case mb-4">
                        Rajneeti is the ultimate Indian political strategy game where you master election campaigns,
                        build powerful alliances, and navigate the complex world of Indian politics.
                        Play as a political strategist, manage state-level campaigns, and rise to power in this
                        realistic election simulation game.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        <span className="text-[10px] bg-gameOrange/10 text-gameOrange border border-gameOrange/20 px-3 py-1 rounded-full normal-case">Indian Politics Game</span>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full normal-case">Election Simulator</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full normal-case">Strategy & Simulation</span>
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full normal-case">Multiplayer</span>
                    </div>
                </div>
            </section>

            <BreakingNewsTicker events={allEvents} />
        </div>
    );
};

// Helper inside file for now - should be shared or mapped properly
function getLeaderAvatar(name: string, stateName?: string): string {
    const getPath = () => {
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
    };

    const path = getPath();
    return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export default RajneetiMap;

