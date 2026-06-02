import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Radio, Mic, Quote, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const createSlug = (text: string): string => {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const parseBulletPoints = (text: string): string[] => {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/)
               .map(s => s.trim())
               .filter(s => s.length > 15);
};

const ANCHOR_AVATARS: Record<string, string> = {
    'Kanika': 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kamala_Gurung_Nepali_Female_Journalist.jpg',
    'Amit Gupta': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Tarun_J_Tejpal_2007.jpg',
    'Sia': 'https://upload.wikimedia.org/wikipedia/commons/b/be/Juhi_Smita_Indian_Journalist_with_Padmashree.jpg',
    'Mitali': 'https://upload.wikimedia.org/wikipedia/commons/b/be/Juhi_Smita_Indian_Journalist_with_Padmashree.jpg'
};
const MODI_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Narendra_Damodardas_Modi.jpg';
const PARLIAMENT_BG = 'https://upload.wikimedia.org/wikipedia/commons/2/25/New_Parliament_Building_New_Delhi.jpg';

const HeadlessReelGenerator: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    
    const [newsItem, setNewsItem] = useState<any>(null);
    const [interviewData, setInterviewData] = useState<any>(null);
    const [status, setStatus] = useState('initializing');
    const [slideIndex, setSlideIndex] = useState(0);

    const format = searchParams.get('format');
    const urlTitle = searchParams.get('title');
    const urlSummary = searchParams.get('summary');
    
    // Support custom Hindi slide points for Hinglish 10s reels
    const urlSlide1 = searchParams.get('slide1');
    const urlSlide2 = searchParams.get('slide2');
    const urlSlide3 = searchParams.get('slide3');
    
    // Reel details
    const reelNumber = searchParams.get('reelNum') || '1';
    const manifestoYear = searchParams.get('year') || '2014';
    
    const imagesParam = searchParams.get('images');
    const singleImage = searchParams.get('image');
    const imageUrls = React.useMemo(() => {
        if (imagesParam) return imagesParam.split(',');
        if (singleImage) return [singleImage];
        return [];
    }, [imagesParam, singleImage]);

    // Fetch logic
    useEffect(() => {
        if (format === 'conversational') {
            const fetchInterview = async () => {
                try {
                    if (supabase) {
                        const { data, error } = await supabase
                            .from('pm_interviews')
                            .select('*')
                            .or(`id.eq.${id},title.ilike.${id?.replace(/-/g, ' ')}`)
                            .maybeSingle();

                        if (!error && data) {
                            setInterviewData(data);
                            return;
                        }
                    }
                    
                    // Fallback mock if database empty or fails
                    console.log("[HeadlessReel] Using mock interview fallback");
                    setInterviewData({
                        title: urlTitle || "Judicial Modernization",
                        reporter_name: "Kanika",
                        question: "मोदी जी, देश की अदालतों में लंबित मुकदमों की संख्या लगातार बढ़ रही है और इंफ्रास्ट्रक्चर की भारी कमी है। आपकी सरकार इस संकट को दूर करने के लिए क्या कदम उठा रही है?",
                        answer: "हमने न्याय वितरण को आधुनिक बनाने के लिए ई-कोर्ट्स मिशन मोड प्रोजेक्ट शुरू किया है। इसके अतिरिक्त, फास्ट ट्रैक अदालतों का विस्तार किया गया है और पुरानी प्रक्रिया को तीव्र करने के लिए 1500 से अधिक अप्रासंगिक कानूनों को समाप्त कर दिया गया है।",
                        news_context: "देश की अदालतों में लंबित मामलों के त्वरित निपटारे के लिए डिजिटल बुनियादी ढांचे की अत्यधिक आवश्यकता है।"
                    });
                } catch (e) {
                    console.error("Failed to load interview for headless renderer", e);
                }
            };
            fetchInterview();
        } else {
            const fetchNews = async () => {
                let foundNews = null;
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
        }
    }, [id, format, urlTitle, urlSummary]);

    // Slide definitions
    const slides = React.useMemo(() => {
        if (format === 'conversational') {
            if (!interviewData) return [];
            return [
                { type: 'question', content: interviewData.question, title: interviewData.title },
                { type: 'answer', content: interviewData.answer, title: interviewData.title },
                { type: 'context', content: interviewData.news_context, title: interviewData.title }
            ];
        }

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
    }, [newsItem, interviewData, format, urlSlide1, urlSlide2, urlSlide3]);

    // Puppeteer integration hooks
    useEffect(() => {
        const hasData = format === 'conversational' ? !!interviewData : !!newsItem;
        if (!hasData || slides.length === 0) return;
        
        (window as any).totalSlides = slides.length;
        
        (window as any).renderSlide = (idx: number) => {
            setSlideIndex(idx);
            return true;
        };

        setStatus('ready');
        console.log(`[HeadlessReel] Ready. ${slides.length} slides prepared. Format: ${format || 'standard'}`);
    }, [newsItem, interviewData, format, slides.length]);

    if (format === 'conversational') {
        if (!interviewData) {
            return <div style={{ color: 'white' }}>Loading PM Interview... <span id="status">{status}</span></div>;
        }

        const reporterName = interviewData.reporter_name || 'Kanika';
        const reporterAvatar = ANCHOR_AVATARS[reporterName] || ANCHOR_AVATARS['Kanika'];

        return (
            <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div id="status" style={{ display: 'none' }}>{status}</div>
                
                <div id="reel-container" className="relative overflow-hidden bg-black" style={{ width: '1080px', height: '1920px' }}>
                    <div className="flex flex-col h-full w-full bg-slate-950 relative p-16 justify-between overflow-hidden">
                        {/* Background glowing effects */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.6)_0%,rgba(2,6,23,1)_100%)] pointer-events-none z-0" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none z-0" />
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-3xl pointer-events-none z-0" />

                        {/* Top Header */}
                        <div className="flex flex-col gap-4 mt-8 relative z-10 w-full">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3 bg-red-600 text-white font-black px-6 py-2.5 text-2xl uppercase tracking-widest shadow-lg rounded">
                                    <Radio size={24} className="animate-pulse" /> LIVE
                                </div>
                                <div className="text-white/60 font-bold uppercase tracking-[0.2em] text-xl bg-white/5 px-6 py-2.5 rounded border border-white/10">
                                    Rajneeti TV Network
                                </div>
                            </div>
                            <div className="text-amber-400 font-extrabold uppercase tracking-widest text-3xl border-b border-white/10 pb-4">
                                🎤 PM Daily accountability
                            </div>
                        </div>

                        {/* Main Slide Carousel Section */}
                        <div className="flex-1 relative flex items-center justify-center my-8 z-10 w-full">
                            <div className="w-[950px] h-[950px] relative">
                                {slides.map((slide, i) => {
                                    const isActive = i === slideIndex;
                                    return (
                                        <div
                                            key={i}
                                            className={`absolute inset-0 transition-all duration-700 ease-out transform ${
                                                isActive ? 'translate-y-0 opacity-100 scale-100' :
                                                i < slideIndex ? '-translate-y-full opacity-0 scale-95' : 'translate-y-full opacity-0 scale-95'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center p-12 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl w-full h-full justify-between relative overflow-hidden">
                                                <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/[0.01] rounded-full" />
                                                
                                                {/* Header within slide */}
                                                <div className="w-full text-center mb-6">
                                                    <span className="text-sm font-black uppercase tracking-[0.4em] text-white/30">
                                                        Topic Briefing
                                                    </span>
                                                    <h2 className="text-3xl font-black font-rajdhani text-white uppercase tracking-wider line-clamp-1 mt-1">
                                                        {slide.title}
                                                    </h2>
                                                </div>

                                                {/* Speaker Visual Frame */}
                                                {slide.type === 'question' && (
                                                    <div className="flex flex-col items-center gap-6 my-auto">
                                                        <div className="w-64 h-64 rounded-full overflow-hidden border-[6px] border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-blue-950 flex items-center justify-center">
                                                            <img src={reporterAvatar} alt={reporterName} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 px-6 py-2 rounded-full">
                                                            <Mic size={20} className="text-blue-400 animate-pulse" />
                                                            <span className="text-xl font-bold uppercase tracking-widest text-blue-400">Reporter {reporterName}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {slide.type === 'answer' && (
                                                    <div className="flex flex-col items-center gap-6 my-auto">
                                                        <div className="w-64 h-64 rounded-full overflow-hidden border-[6px] border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.3)] bg-orange-950 flex items-center justify-center">
                                                            <img src={MODI_AVATAR} alt="Narendra Modi" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 px-6 py-2 rounded-full">
                                                            <Mic size={20} className="text-orange-400 animate-pulse" />
                                                            <span className="text-xl font-bold uppercase tracking-widest text-orange-400">PM Narendra Modi</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {slide.type === 'context' && (
                                                    <div className="flex flex-col items-center gap-6 my-auto w-full">
                                                        <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-lg relative bg-slate-900">
                                                            <img src={PARLIAMENT_BG} alt="Fact Check Context" className="w-full h-full object-cover opacity-75" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                                                            <div className="absolute bottom-6 left-6 right-6 text-left">
                                                                <span className="bg-gameOrange text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded">Official Source</span>
                                                                <h4 className="text-white text-lg font-bold mt-2">Government Records Audited</h4>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gameBlue">
                                                            <AlertCircle size={20} />
                                                            <span className="text-lg font-black uppercase tracking-widest">Fact Check Audit Verdict</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quote Bubble Content */}
                                                <div className="w-full bg-white/[0.01] border border-white/5 p-8 rounded-3xl shadow-inner mt-4 min-h-[220px] flex items-center justify-center">
                                                    <p className="text-white text-3xl md:text-4xl font-semibold leading-relaxed text-center normal-case">
                                                        {slide.type === 'context' ? slide.content : `"${slide.content}"`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="relative z-20 mt-auto bg-white/[0.02] backdrop-blur-md p-10 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-6">
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-gameOrange to-amber-500 transition-all duration-700 ease-out" 
                                    style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-gameOrange text-2xl font-black uppercase tracking-[0.2em]">
                                    PM INTERVIEW
                                </div>
                                <h3 className="text-white/60 font-black text-xl tracking-[0.1em] uppercase">
                                    Aise hi aur audits ke liye Rajneeti ko follow karein
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
    }

    if (!newsItem) {
        return <div style={{ color: 'white' }}>Loading Standard Reel... <span id="status">{status}</span></div>;
    }

    return (
        <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="status" style={{ display: 'none' }}>{status}</div>
            
            <div id="reel-container" className="relative overflow-hidden bg-black"
                 style={{ width: '1080px', height: '1920px' }}>

                <div className="flex flex-col h-full w-full bg-black relative p-16 justify-between overflow-hidden">
                    {/* Premium Radial Vignette Backdrop overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(0,0,0,1)_100%)] pointer-events-none z-0" />
                    
                    {/* Header Section — Modi Ki Guarantee branding */}
                    <div className="flex flex-col gap-4 mt-8 relative z-10">
                        <div className="flex items-center gap-3 self-start bg-red-600 text-white font-black px-8 py-3 text-3xl uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] rounded">
                            <Radio size={32} className="animate-pulse" /> LIVE
                        </div>
                        <div className="text-amber-400 font-black uppercase tracking-[0.15em] text-3xl bg-gradient-to-r from-amber-900/40 to-orange-900/30 px-8 py-4 rounded-xl w-fit backdrop-blur-md border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                            🔥 MODI KI GUARANTEE
                        </div>
                        <div className="text-white/70 font-bold uppercase tracking-widest text-2xl bg-white/5 px-6 py-3 rounded w-fit backdrop-blur-md border border-white/10">
                            PROMISE #{reelNumber} | {manifestoYear} MANIFESTO
                        </div>
                    </div>

                    {/* Middle Section: News Story Slides */}
                    <div className="flex-1 relative flex items-center justify-center my-16 z-10">
                        <div className="w-[950px] h-[850px] relative">
                            {slides.map((slide, i) => (
                                <div 
                                    key={i} 
                                    className={`absolute inset-0 transition-all duration-700 ease-out transform ${
                                        i === slideIndex ? 'translate-y-0 opacity-100 scale-100' : 
                                        i < slideIndex ? '-translate-y-full opacity-0 scale-95' : 'translate-y-full opacity-0 scale-95'
                                    }`}
                                >
                                    <div className="flex flex-col items-start p-8 bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full h-full justify-between">
                                        <div className="w-full flex flex-col items-start">
                                            <div className={`text-white px-8 py-3 font-bold uppercase tracking-widest mb-6 text-3xl rounded-xl shadow-lg ${
                                                slide.type === 'headline' ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-[#1d4ed8]'
                                            }`}>
                                                {slide.type === 'headline' ? 'Modi Ki Guarantee' : `Analysis Point ${i}/${slides.length - 1}`}
                                            </div>
                                            {imageUrls[i] && (
                                                <div className="w-full h-[420px] mb-6 overflow-hidden rounded-2xl border border-white/10 relative">
                                                    <img 
                                                        src={imageUrls[i]} 
                                                        alt="Topic Visual" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <h2 className="font-serif leading-[1.3] text-4xl md:text-5xl font-extrabold text-white text-left tracking-wide uppercase mt-auto w-full line-clamp-3">
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
                            <div className="h-full bg-gradient-to-r from-amber-500 to-red-600 w-full" />
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-3xl font-black px-8 py-3 uppercase tracking-widest shadow-lg rounded">
                                Modi Ki Guarantee
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
