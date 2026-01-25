
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
        setClickPos({ x: e.clientX, y: e.clientY });
        setSelectedState(selectedState === stateId ? null : stateId);
    };

    const currentIntel: StateData = (selectedState && STATE_INTEL[selectedState]) || DEFAULT_STATE_DATA;

    if (!countryData || !stateData) {
        return <div className="fixed inset-0 bg-slate-950"></div>;
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-transparent overflow-hidden select-none">
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
                                        key={currentIntel.avatar || "Avaters/NARENDRA MODI (PM).png"}
                                        src={currentIntel.avatar || "Avaters/NARENDRA MODI (PM).png"}
                                        alt={selectedState}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "Avaters/NARENDRA MODI (PM).png";
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
                        <div className="w-[320px] h-[420px] relative flex flex-col items-center p-8">
                            {/* Close Icon for Popup */}
                            <button
                                onClick={() => setSelectedState(null)}
                                className="absolute top-2 right-6 z-30 text-white/50 hover:text-white transition-colors p-2"
                            >
                                <X size={18} />
                            </button>

                            {/* Popup.png Background Layer */}
                            <div
                                className="absolute inset-0 z-0 bg-no-repeat bg-[length:100%_100%] bg-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]"
                                style={{ backgroundImage: "url('Popup.png')" }}
                            ></div>

                            {/* Content Layer */}
                            <div className="relative z-20 w-full h-full flex flex-col items-center">
                                {/* State Name */}
                                <div className="h-[45px] flex items-center justify-center mt-[-24px] px-4 w-[240px]">
                                    <h2 className="text-[8.5px] md:text-[9.5px] font-cinzel font-black text-white tracking-tight drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] text-center leading-none uppercase truncate">
                                        {selectedState}
                                    </h2>
                                </div>

                                {/* Stats Grid */}
                                <div className="w-full grid grid-cols-2 gap-2 px-4 mt-4">
                                    <div className="bg-white/95 border-[2px] border-black p-1.5 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                                        <div className="text-[6px] text-slate-500 uppercase font-black">Voters</div>
                                        <div className="text-xs font-cinzel font-black text-gameDarkBlue">{currentIntel.voters}</div>
                                    </div>
                                    <div className="bg-white/95 border-[2px] border-black p-1.5 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                                        <div className="text-[6px] text-slate-500 uppercase font-black">Ruling</div>
                                        <div className="text-xs font-cinzel font-black text-gameOrange">{currentIntel.rulingParty}</div>
                                    </div>
                                    <div className="bg-white/95 border-[2px] border-black p-1.5 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                                        <div className="text-[6px] text-slate-500 uppercase font-black">GDP</div>
                                        <div className="text-xs font-cinzel font-black text-gameGreen">${currentIntel.gdp}</div>
                                    </div>
                                    <div className="bg-gameBlue border-[2px] border-black p-1.5 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                                        <div className="text-[6px] text-white/70 uppercase font-black">Status</div>
                                        <div className="text-xs font-cinzel font-black text-white">ACTIVE</div>
                                    </div>
                                </div>

                                {/* Play Store Button removed as per request to keep it clean */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Center PERSISTENT Global Play Button - Smaller and lower */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                    <a
                        href="https://play.google.com/store/apps/details?id=com.rajneeti"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all drop-shadow-[0_8px_15px_rgba(0,0,0,0.5)]"
                    >
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                            alt="Join Phase 2 on Android"
                            className="h-[38px] md:h-[42px]"
                        />
                    </a>
                </div>
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
