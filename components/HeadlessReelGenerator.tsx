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
        <div style={{ background: 'transparent', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="status" style={{ display: 'none' }}>{status}</div>
            
            {/* THIS IS THE EXACT UI FROM RAJNEETINETWORKTV, MODIFIED FOR TRANSPARENCY */}
            <div id="reel-container" className="relative overflow-hidden"
                 style={{ width: '1080px', height: '1920px', background: 'transparent' }}>

                <div className="relative h-full flex flex-col justify-end p-12 z-10 w-full pb-16">
                    
                    {/* Header - Moved to Top Left */}
                    <div className="absolute top-16 left-12 flex flex-col gap-4 z-20">
                        <div className="flex items-center gap-3 self-start bg-red-600 text-white font-black px-6 py-3 text-2xl uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                            <Radio size={32} className="animate-pulse" /> LIVE
                        </div>
                        <div className="text-white/80 font-bold uppercase tracking-widest text-xl bg-black/60 px-5 py-2 rounded w-fit backdrop-blur-md border border-white/10">
                            {newsItem.date} | {newsItem.state}
                        </div>
                    </div>

                    {/* Content Slides - Bottom positioned */}
                    <div className="w-full relative z-10 mb-8 overflow-visible h-[450px]">
                        {slides.map((slide, i) => (
                            <div 
                                key={i} 
                                className={`absolute w-full bottom-0 transition-all duration-700 ease-out transform ${
                                    i === slideIndex ? 'translate-x-0 opacity-100 scale-100' : 
                                    i < slideIndex ? '-translate-x-[150%] opacity-0 scale-95' : 'translate-x-[150%] opacity-0 scale-95'
                                }`}
                            >
                                <div className="bg-black/80 backdrop-blur-lg border-t-4 border-red-600 p-8 rounded-t-3xl shadow-2xl">
                                    <div className={`inline-block text-white px-6 py-2 font-black uppercase tracking-widest mb-6 shadow-lg text-xl rounded ${slide.type === 'headline' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                        {slide.type === 'headline' ? 'Breaking News' : `Analysis Point ${i}/${slides.length - 1}`}
                                    </div>
                                    <h2 className={`font-rajdhani leading-snug drop-shadow-xl ${
                                        slide.type === 'headline' ? 'text-6xl font-black text-white' : 'text-5xl font-bold text-slate-100'
                                    }`}>
                                        {slide.content}
                                    </h2>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="relative z-20 bg-black/90 p-6 rounded-b-3xl border-t border-white/10 shadow-2xl">
                        <div className="w-full h-[6px] bg-white/20 mb-6 rounded-full overflow-hidden relative">
                            {/* Static full width progress bar for headless mode since we capture static frames */}
                            <div className="h-full bg-red-600 w-full" />
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="bg-red-600 text-white text-xl font-black px-5 py-2 uppercase tracking-widest shadow-lg rounded">
                                RN Update
                            </div>
                            <h3 className="text-white font-bold font-sans text-3xl leading-tight line-clamp-2 drop-shadow-md flex-1">
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
                /* Removed animations since background is now transparent MP4 */
                body { background-color: transparent !important; }
            `}</style>
        </div>
    );
};

export default HeadlessReelGenerator;
