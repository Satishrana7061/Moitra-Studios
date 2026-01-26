
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { STATE_INTEL, DEFAULT_STATE_DATA, StateData } from './stateIntel';

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

    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                // Try multiple paths to handle base URL variations
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
        fetchMapData();
    }, []);

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
        e.stopPropagation(); // Prevent click from bubbling to background
        setClickPos({ x: e.clientX, y: e.clientY });
        setSelectedState(selectedState === stateId ? null : stateId);
    };

    const currentIntel: StateData = (selectedState && STATE_INTEL[selectedState]) || DEFAULT_STATE_DATA;

    if (!countryData || !stateData) {
        return <div className="fixed inset-0 bg-slate-950"></div>;
    }

    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-center bg-transparent overflow-hidden select-none"
            onClick={() => selectedState && setSelectedState(null)} // Click outside to close
        >
            {/* Transparent layer to maintain layout without dimming */}
            <div className="absolute inset-0 z-0 bg-transparent"></div>

            {/* Main Map Container */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-12">
                <svg
                    ref={svgRef}
                    viewBox={viewBox}
                    className="w-[85vw] h-[85vh] drop-shadow-[0_0_100px_rgba(0,0,0,1)] filter transition-all duration-1000 ease-out"
                >
                    <defs>
                        <filter id="stateGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="15000" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="stateHover" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="8000" result="blur" />
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
                                        <path key={`country-${i}`} d={getPath(f)} fill="#020617" stroke="url(#metallicGold)" strokeWidth="3000" strokeOpacity="0.4" />
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
                                                fill={isSelected ? "#1e293b" : (isHovered ? "#ffffff33" : getStateColor(stateId))}
                                                stroke="#00000044"
                                                strokeWidth={isSelected ? "6000" : (isHovered ? "4000" : "1000")}
                                                className={`cursor-pointer transition-all duration-300 ease-in-out`}
                                                style={{
                                                    opacity: 1,
                                                    transform: isSelected ? 'translate(0, 60000) scale(1.02)' : (isHovered ? 'translate(0, 15000)' : 'none'),
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

                {/* HUD Header Logo moved to Navbar.tsx for proper alignment */}

                {/* 3D Mini-Card near state - Hanging/Swinging Animation */}
                {selectedState && (
                    <div
                        className="fixed pointer-events-none z-50 animate-pop-3d"
                        style={{ left: `${clickPos.x}px`, top: `${clickPos.y}px` }}
                    >
                        <div className="relative origin-top animate-hinge-swing">
                            <div className="w-20 h-20 bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden rounded-full transform-gpu perspective-1200 rotate-x-4">
                                <div className="h-full w-full overflow-hidden bg-slate-200">
                                    <img
                                        key={currentIntel.avatar || "/Avaters/NARENDRA MODI (PM).png"}
                                        src={currentIntel.avatar ? (currentIntel.avatar.startsWith('/') ? currentIntel.avatar : `/${currentIntel.avatar}`) : "/Avaters/NARENDRA MODI (PM).png"}
                                        alt={selectedState}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "/Avaters/NARENDRA MODI (PM).png";
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main persistent Intel Card */}
                {selectedState && (
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 animate-card-slide z-40">
                        {/* Box Container - Reduced size to avoid map overlap */}
                        <div className="w-[360px] h-[480px] relative flex flex-col items-center p-8">
                            {/* Popup.png Background Layer */}
                            <div
                                className="absolute inset-0 z-0 bg-no-repeat bg-[length:100%_100%] bg-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]"
                                style={{ backgroundImage: "url('Popup.png')" }}
                            ></div>

                            {/* Content Layer - Highly Polished, Inside Box, No External Button */}
                            <div className="relative z-20 w-full h-full flex flex-col px-8 text-white font-sans">

                                {/* 1. HEADER (Perfectly Centered) */}
                                <div className="text-center">
                                    <h2 className="font-cinzel font-black uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight mb-12 text-xs -mt-1.5">
                                        {selectedState}
                                    </h2>
                                    <div className="font-cinzel text-[10px] tracking-[0.2em] uppercase font-bold border-b border-yellow-400/40 pb-7 mx-auto w-3/4" style={{ color: '#FFD700', textShadow: '0 0 12px #FFD700' }}>
                                        {currentIntel.strategicTitle}
                                    </div>
                                </div>

                                {/* 2. STATS ROW (Role | Difficulty | Impact) */}
                                <div className="grid grid-cols-3 gap-3 mb-8 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#FF6B00', textShadow: '0 0 8px #FF6B00' }}>Role</span>
                                        <span className="text-[10px] font-bold uppercase leading-tight font-cinzel tracking-wider" style={{ color: '#FFAB76' }}>{currentIntel.role}</span>
                                    </div>
                                    <div className="flex flex-col items-center px-1 border-l border-r border-white/10">
                                        <span className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#9D4EDD', textShadow: '0 0 8px #9D4EDD' }}>Difficulty</span>
                                        <div className="flex gap-1 mt-1.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`w-2 h-2 rotate-45 ${i < (currentIntel.difficulty || 1) ? 'bg-fuchsia-500 shadow-[0_0_6px_#d946ef]' : 'bg-slate-600'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#00BEFF', textShadow: '0 0 8px #00BEFF' }}>Impact</span>
                                        <span className="text-[10px] font-bold uppercase leading-tight font-cinzel tracking-wider" style={{ color: '#7DD3FC' }}>{currentIntel.impact}</span>
                                    </div>
                                </div>

                                {/* 3. METERS (Circular Sci-Fi Style) */}
                                <div className="flex justify-between items-center mb-auto px-4">
                                    {[
                                        { label: "Mood", val: currentIntel.powerMeters?.neighborhoodMood, color: "#22d3ee", shadow: "shadow-cyan-500" },
                                        { label: "Media", val: currentIntel.powerMeters?.mediaInfluence, color: "#fb923c", shadow: "shadow-orange-500" },
                                        { label: "Alliance", val: currentIntel.powerMeters?.alliancePower, color: "#34d399", shadow: "shadow-emerald-500" }
                                    ].map((meter, idx) => {
                                        const radius = 26;
                                        const circumference = 2 * Math.PI * radius;
                                        const strokeDashoffset = circumference - (((meter.val || 50) / 100) * circumference);

                                        return (
                                            <div key={idx} className="flex flex-col items-center group">
                                                <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                                                    {/* Outer Ring Decoration */}
                                                    <div className="absolute inset-0 rounded-full border border-white/5 group-hover:border-white/20 transition-colors"></div>

                                                    {/* SVG Circle */}
                                                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 70 70">
                                                        {/* Track */}
                                                        <circle cx="35" cy="35" r={radius} stroke="#1e293b" strokeWidth="3.5" fill="none" />
                                                        {/* Progress */}
                                                        <circle
                                                            cx="35" cy="35" r={radius}
                                                            stroke={meter.color}
                                                            strokeWidth="3.5"
                                                            fill="none"
                                                            strokeDasharray={circumference}
                                                            strokeDashoffset={strokeDashoffset}
                                                            strokeLinecap="round"
                                                            className="drop-shadow-[0_0_2px_currentColor] transition-all duration-1000 ease-out"
                                                        />
                                                    </svg>

                                                    {/* Inner icon/dot */}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${meter.shadow.replace('shadow-', 'bg-')} bg-opacity-80 animate-pulse`}></div>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] uppercase tracking-widest text-cyan-300/80 font-bold group-hover:text-cyan-200 transition-colors drop-shadow-[0_0_3px_rgba(34,211,238,0.4)]">
                                                    {meter.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 4. FLAVOR TEXT (Bottom, subtle) */}
                                <div className="mb-7 px-3 opacity-80 text-center">
                                    <p className="text-xs text-sky-100 italic font-serif leading-relaxed drop-shadow-[0_0_4px_rgba(186,230,253,0.3)] mt-7">
                                        "{currentIntel.flavorText}"
                                    </p>
                                </div>

                                {/* 5. CTA BUTTON (Prominent at bottom) */}
                                <div className="mt-3 pb-5 w-full">
                                    <a
                                        href="https://play.google.com/store/apps/details?id=com.rajneeti"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block group"
                                    >
                                        <div className="relative bg-gradient-to-b from-gray-900 to-black border border-white/20 hover:border-orange-500/60 transition-all rounded py-4 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.6)] group-hover:shadow-[0_4px_15px_rgba(234,88,12,0.2)]">
                                            <span className="text-white font-cinzel font-black tracking-[0.2em] text-xs relative z-10 group-hover:scale-105 transition-transform">
                                                ENTER THE CAMPAIGN
                                            </span>
                                            {/* Decorative diamond on right */}
                                            <div className="absolute right-4 w-2 h-2 bg-white/20 rotate-45 group-hover:bg-orange-500 transition-colors"></div>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .rotate-y-12 { transform: rotateY(12deg); }
                .rotate-x-12 { transform: rotateX(12deg); }
                @keyframes scan {
                    0% { transform: translateY(-20px); opacity: 0; }
                    15% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { transform: translateY(620px); opacity: 0; }
                }
                .animate-scan { animation: scan 6s linear infinite; }
                @keyframes card-slide {
                    from { transform: translate(120px, -50%); opacity: 0; filter: blur(10px); }
                    to { transform: translate(0, -50%); opacity: 1; filter: blur(0); }
                }
                .animate-card-slide { animation: card-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes pop-3d {
                    0% { transform: scale(0.5) translateZ(-200px); opacity: 0; }
                    100% { transform: scale(1) translateZ(0); opacity: 1; }
                }
                .animate-pop-3d { animation: pop-3d 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                @keyframes hinge-swing {
                    0% { transform: translate(-50%, 0) rotate(0deg); }
                    20% { transform: translate(-50%, 0) rotate(6deg); }
                    40% { transform: translate(-50%, 0) rotate(-4deg); }
                    60% { transform: translate(-50%, 0) rotate(2.5deg); }
                    80% { transform: translate(-50%, 0) rotate(-1.5deg); }
                    100% { transform: translate(-50%, 0) rotate(0deg); }
                }
                .animate-hinge-swing {
                    animation: hinge-swing 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                }
                @keyframes logo-glitter {
                    0% { filter: brightness(1) drop-shadow(0 0 5px rgba(255,107,0,0.3)); transform: scale(1); }
                    50% { filter: brightness(1.15) drop-shadow(0 0 15px rgba(255,107,0,0.6)); transform: scale(1.01); }
                    100% { filter: brightness(1) drop-shadow(0 0 5px rgba(255,107,0,0.3)); transform: scale(1); }
                }
                .animate-logo-glitter {
                    animation: logo-glitter 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default RajneetiMap;
