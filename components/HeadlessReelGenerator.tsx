import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useRef } from 'react';

const createSlug = (text: string): string => {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const parseBulletPoints = (text: string): string[] => {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/)
               .map(s => s.trim())
               .filter(s => s.length > 15);
};

// This is a hidden route /#/headless-reel/:id optimized for Puppeteer.
const HeadlessReelGenerator: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    
    const [newsItem, setNewsItem] = useState<any>(null);
    const [status, setStatus] = useState('initializing');
    const [slideIndex, setSlideIndex] = useState(0);

    const urlTitle = searchParams.get('title');
    const urlSummary = searchParams.get('summary');
    
    // Support custom Hindi slide points for Hinglish 10s reels
    const urlSlide1 = searchParams.get('slide1');
    const urlSlide2 = searchParams.get('slide2');
    const urlSlide3 = searchParams.get('slide3');
    
    // Reel details
    const reelNumber = searchParams.get('reelNum') || '1';
    const manifestoYear = searchParams.get('year') || '2014';

    useEffect(() => {
        const fetchNews = async () => {
            let foundNews = null;
            
            // Try fetching from daily_news.json
            const paths = [
                `${import.meta.env.BASE_URL}daily_news.json`,
                './daily_news.json',
                '/Moitra-Studios/daily_news.json',
                'https://raw.githubusercontent.com/Satishrana7061/Moitra-Studios/main/public/daily_news.json'
            ];
            
            for (const path of paths) {
                try {
                    const response = await fetch(`${path}?t=${Date.now()}`);
                    if (response.ok) {
                        const text = await response.text();
                        if (!text.trim().startsWith('<')) {
                            const parsed = JSON.parse(text);
                            const jsonData = Array.isArray(parsed) ? parsed : [parsed];
                            const match = jsonData.find((n: any) => createSlug(n.ticker_headline || n.blog_title) === id);
                            if (match) {
                                foundNews = match;
                                break;
                            }
                        }
                    }
                } catch (e) { }
            }

            if (foundNews) {
                setNewsItem(foundNews);
            } else {
                // Fallback to URL params if JSON fetch fails
                setNewsItem({
                    ticker_headline: urlTitle || "Breaking News",
                    blog_title: urlTitle || "Rajneeti Update",
                    blog_content: urlSummary || "Detailed analysis coming soon.",
                    date: new Date().toISOString().split('T')[0],
                    state: "National"
                });
            }
        };

        fetchNews();
    }, [id, urlTitle, urlSummary]);

    const slides = React.useMemo(() => {
        // If custom short Hindi slides are provided, use them!
        if (urlSlide1 && urlSlide2 && urlSlide3) {
            return [
                { type: 'headline', content: urlSlide1 },
                { type: 'bullet', content: urlSlide2 },
                { type: 'bullet', content: urlSlide3 }
            ];
        }
        
        if (!newsItem) return [];
        return [
            { type: 'headline', content: newsItem.ticker_headline },
            ...parseBulletPoints(newsItem.blog_content).map(b => ({ type: 'bullet', content: b }))
        ];
    }, [newsItem, urlSlide1, urlSlide2, urlSlide3]);

    // Expose helpers for Puppeteer
    useEffect(() => {
        if (!newsItem || slides.length === 0) return;
        
        (window as any).totalSlides = slides.length;
        
        // This function is called by Puppeteer to render a specific slide
        (window as any).renderSlide = (idx: number) => {
            setSlideIndex(idx);
            return true;
        };

        setStatus('ready');
        console.log(`[HeadlessReel] Ready. ${slides.length} slides prepared.`);
    }, [newsItem, slides.length]);

    if (!newsItem) {
        return <div style={{ color: 'white' }}>Loading... <span id="status">{status}</span></div>;
    }

    return (
        <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="status" style={{ display: 'none' }}>{status}</div>
            
            <div id="reel-container" className="relative overflow-hidden bg-black"
                 style={{ width: '1080px', height: '1920px' }}>

                <div className="flex flex-col h-full w-full bg-black relative p-16 justify-between overflow-hidden">
                    {/* Premium Radial Vignette Backdrop overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(0,0,0,1)_100%)] pointer-events-none z-0" />
                    
                    {/* Header Section (Exactly matching screenshot 2 layout) */}
                    <div className="flex flex-col gap-4 mt-8 relative z-10">
                        <div className="flex items-center gap-3 self-start bg-red-600 text-white font-black px-8 py-3 text-3xl uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] rounded">
                            <Radio size={32} className="animate-pulse" /> LIVE
                        </div>
                        <div className="text-white/80 font-bold uppercase tracking-widest text-2xl bg-white/5 px-6 py-3 rounded w-fit backdrop-blur-md border border-white/10">
                            REEL #{reelNumber} | {manifestoYear} BJP MANIFESTO
                        </div>
                    </div>

                    {/* Middle Section: Centered Punchy Content (Directly on background, font-serif, uppercase) */}
                    <div className="flex-1 relative flex items-center justify-center my-16 z-10">
                        <div className="w-full relative">
                            {slides.map((slide, i) => (
                                <div 
                                    key={i} 
                                    className={`absolute w-full left-0 transition-all duration-700 ease-out transform ${
                                        i === slideIndex ? 'translate-y-0 opacity-100 scale-100' : 
                                        i < slideIndex ? '-translate-y-full opacity-0 scale-95' : 'translate-y-full opacity-0 scale-95'
                                    }`}
                                >
                                    <div className="flex flex-col items-start px-4">
                                        <div className="bg-[#1d4ed8] text-white px-6 py-2 font-bold uppercase tracking-widest mb-10 text-2xl rounded">
                                            {slide.type === 'headline' ? 'Audit Summary' : `Analysis Point ${i}/${slides.length - 1}`}
                                        </div>
                                        <h2 className="font-serif leading-relaxed text-5xl md:text-6xl font-extrabold text-white text-left tracking-wide uppercase">
                                            {slide.content}
                                        </h2>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Section */}
                    <div className="relative z-20 mt-auto bg-white/5 p-10 rounded-3xl border border-white/10 shadow-2xl">
                        <div className="w-full h-3 bg-white/10 mb-8 rounded-full overflow-hidden relative">
                            <div className="h-full bg-red-600 w-full" />
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="bg-red-600 text-white text-3xl font-black px-8 py-3 uppercase tracking-widest shadow-lg rounded">
                                RN Update
                            </div>
                            <h3 className="text-white font-bold font-sans text-4xl leading-tight line-clamp-2 flex-1">
                                {newsItem.blog_title}
                            </h3>
                        </div>
                    </div>
                </div>
                
            </div>

            <style>{`
                body { background-color: transparent !important; }
            `}</style>
        </div>
    );
};

export default HeadlessReelGenerator;
