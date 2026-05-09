import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Radio } from 'lucide-react';

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
        if (!newsItem) return [];
        return [
            { type: 'headline', content: newsItem.ticker_headline },
            ...parseBulletPoints(newsItem.blog_content).map(b => ({ type: 'bullet', content: b }))
        ];
    }, [newsItem]);

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
            
            {/* THIS IS THE EXACT UI FROM RAJNEETINETWORKTV */}
            <div className="relative bg-slate-900 border border-white/5 overflow-hidden shadow-2xl"
                 style={{ width: '1080px', height: '1920px' }}>
                
                {/* Background animations */}
                <div className="absolute inset-0 bg-blue-900/20 flex flex-col items-center justify-center space-y-8 opacity-50 pointer-events-none">
                    <div className="w-[150%] aspect-square border-[40px] border-white/5 rounded-full animate-spin-slow absolute"></div>
                    <div className="w-[100%] aspect-square border-t-[8px] border-red-600/30 rounded-full animate-reverse-spin absolute"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>

                <div className="relative h-full flex flex-col justify-between p-16 z-10 w-full">
                    
                    {/* Header */}
                    <div className="mt-16 flex flex-col gap-4 relative z-20">
                        <div className="flex items-center gap-3 self-start bg-red-600 text-white font-black px-6 py-3 text-2xl uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                            <Radio size={32} className="animate-pulse" /> LIVE
                        </div>
                        <div className="text-white/80 font-bold uppercase tracking-widest text-xl bg-black/40 px-5 py-2 rounded w-fit backdrop-blur-sm">
                            {newsItem.date} | {newsItem.state}
                        </div>
                    </div>

                    {/* Content Slides */}
                    <div className="flex-1 flex flex-col justify-center relative mt-8 z-10 px-8 pb-32 overflow-hidden">
                        {slides.map((slide, i) => (
                            <div 
                                key={i} 
                                className={`absolute w-full transition-all duration-700 ease-out transform ${
                                    i === slideIndex ? 'translate-x-0 opacity-100 scale-100' : 
                                    i < slideIndex ? '-translate-x-[150%] opacity-0 scale-95' : 'translate-x-[150%] opacity-0 scale-95'
                                }`}
                                style={{ paddingRight: '64px' }}
                            >
                                <div className={`inline-block text-white px-6 py-3 font-black uppercase tracking-widest mb-10 shadow-lg text-2xl ${slide.type === 'headline' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                    {slide.type === 'headline' ? 'Breaking News' : `Analysis Point ${i}/${slides.length - 1}`}
                                </div>
                                <h2 className={`font-rajdhani leading-snug drop-shadow-xl ${
                                    slide.type === 'headline' ? 'text-7xl font-black text-white' : 'text-6xl font-bold text-slate-100'
                                }`}>
                                    {slide.content}
                                </h2>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mb-16 relative z-20">
                        <div className="w-full h-[6px] bg-white/20 mb-10 rounded-full overflow-hidden relative">
                            {/* Static full width progress bar for headless mode since we capture static frames */}
                            <div className="h-full bg-red-600 w-full" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="bg-red-600 text-white text-xl font-black px-5 py-2 uppercase tracking-widest w-fit shadow-lg">
                                RN Update
                            </div>
                            <h3 className="text-white font-bold font-sans text-4xl leading-tight line-clamp-3 mb-4 drop-shadow-md pr-8">
                                {newsItem.blog_title}
                            </h3>
                        </div>
                    </div>
                </div>
                
                {/* Watermark */}
                <div className="absolute bottom-12 right-12 opacity-80 z-20 pointer-events-none">
                    <span className="font-rajdhani font-black text-red-600 text-3xl tracking-widest uppercase drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                        RAJNEETI TV NETWORK
                    </span>
                </div>
            </div>

            <style>{`
                .animate-reverse-spin {
                  animation: reverse-spin 20s linear infinite;
                }
                @keyframes reverse-spin {
                  from { transform: rotate(360deg); }
                  to { transform: rotate(0deg); }
                }
                .animate-spin-slow {
                  animation: spin 30s linear infinite;
                }
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default HeadlessReelGenerator;
