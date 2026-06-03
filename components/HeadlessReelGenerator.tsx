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
            return <div style={{ color: 'white' }}>Loading PM Open Press Conference... <span id="status">{status}</span></div>;
        }

        const reporterName = interviewData.reporter_name || 'Kanika';

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
                                🎤 PM Open Press Conference
                            </div>
                        </div>

                        {/* Middle Text/Visuals Section */}
                        <div className="flex-1 relative flex flex-col items-center justify-between my-8 z-10 w-full">
                            <div className="w-[950px] h-[1150px] relative">
                                {slides.map((slide, i) => {
                                    const isActive = i === slideIndex;
                                    return (
                                        <div
                                            key={i}
                                            className={`absolute inset-0 transition-all duration-700 ease-out transform ${
                                                isActive ? 'translate-y-0 opacity-100 scale-100' :
                                                i < slideIndex ? '-translate-y-full opacity-0 scale-95' : 'translate-y-full opacity-0 scale-95'
                                            } flex flex-col items-center justify-between h-full`}
                                        >
                                            {/* Text Box at the Top Half of the Reel */}
                                            <div className="w-[950px] bg-slate-900/85 border border-white/15 backdrop-blur-2xl p-10 rounded-[40px] shadow-[0_25px_50px_rgba(0,0,0,0.8)] mt-4 min-h-[360px] flex flex-col justify-center relative overflow-hidden">
                                                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-gameOrange via-amber-500 to-gameOrange" />
                                                
                                                {/* Speaker Indicator Badge inside Text Box */}
                                                <div className="flex items-center gap-3 mb-6 self-center">
                                                    <span className={`px-6 py-2 rounded-full font-black text-lg tracking-widest uppercase border ${
                                                        slide.type === 'question' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                        slide.type === 'answer' ? 'bg-orange-500/10 text-gameOrange border-gameOrange/30' :
                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    }`}>
                                                        {slide.type === 'question' ? `🎤 REPORTER ${reporterName} QUESTION` :
                                                         slide.type === 'answer' ? '🎤 PM NARENDRA MODI ANSWER' :
                                                         '📝 FACT CHECK AUDIT VERDICT'}
                                                    </span>
                                                </div>

                                                <p className="text-white text-3.5xl md:text-4xl font-extrabold leading-relaxed text-center normal-case tracking-wide">
                                                    {slide.type === 'context' ? slide.content : `"${slide.content}"`}
                                                </p>
                                            </div>

                                            {/* Modi at Microphone Visual Container at the Bottom Half of the Reel */}
                                            <div className="w-[950px] h-[680px] overflow-hidden rounded-[40px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative bg-slate-900 mb-4 shrink-0">
                                                <img 
                                                    src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Narendra_Modi_delivering_his_address_to_the_Nation.jpg" 
                                                    alt="PM Modi Addressing Press Conference"
                                                    className="w-full h-full object-cover object-center"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
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
                                    PM PRESS CONFERENCE
                                </div>
                                <h3 className="text-white/60 font-black text-xl tracking-[0.1em] uppercase">
                                    Factual Q&A audits verified against official sources
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700;800;900&family=Outfit:wght@400;500;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
                    body, html { 
                        background-color: transparent !important; 
                        font-family: 'Outfit', 'Noto Sans Devanagari', 'Inter', sans-serif !important;
                    }
                `}</style>
            </div>
        );
    }

    if (!newsItem) {
        return <div style={{ color: 'white' }}>Loading Standard Reel... <span id="status">{status}</span></div>;
    }

    const styleParam = searchParams.get('style') || 'kinetic';

    return (
        <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="status" style={{ display: 'none' }}>{status}</div>
            
            <div id="reel-container" className="relative overflow-hidden bg-black"
                 style={{ width: '1080px', height: '1920px' }}>

                <div className="flex flex-col h-full w-full bg-black relative p-16 justify-between overflow-hidden">
                    {/* Premium Radial Vignette Backdrop overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.35)_0%,rgba(0,0,0,1)_100%)] pointer-events-none z-0" />
                    
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
                        <div className="w-[950px] h-[950px] relative">
                            {slides.map((slide, i) => (
                                <div 
                                    key={i} 
                                    className={`absolute inset-0 transition-all duration-700 ease-out transform ${
                                        i === slideIndex ? 'translate-y-0 opacity-100 scale-100' : 
                                        i < slideIndex ? '-translate-y-full opacity-0 scale-95' : 'translate-y-full opacity-0 scale-95'
                                    }`}
                                >
                                    {/* STYLE 1: KINETIC TYPOGRAPHY */}
                                    {styleParam === 'kinetic' && (
                                        <div className="flex flex-col items-center justify-center bg-slate-950/60 border border-white/10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] w-full h-full p-12 relative overflow-hidden text-center">
                                            {/* Subtle grid pattern background inside the slide container */}
                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none opacity-40" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />
                                            
                                            {/* Floating particles */}
                                            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                                                <div className="absolute w-2 h-2 bg-orange-500 rounded-full animate-float-slow top-1/4 left-1/4" />
                                                <div className="absolute w-3.5 h-3.5 bg-amber-500 rounded-full animate-float-slow top-2/3 left-1/3" style={{ animationDelay: '2s' }} />
                                                <div className="absolute w-2 h-2 bg-yellow-500 rounded-full animate-float-slow top-1/3 left-2/3" style={{ animationDelay: '4s' }} />
                                                <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-float-slow top-3/4 left-3/4" style={{ animationDelay: '1.5s' }} />
                                            </div>

                                            <div className="flex flex-col items-center gap-8 my-auto w-full">
                                                <div className="text-amber-500/80 font-black text-2xl uppercase tracking-[0.4em] mb-4">
                                                    {slide.type === 'headline' ? '★ MODI KI GUARANTEE ★' : `FACT AUDIT POINT ${i}`}
                                                </div>
                                                
                                                <h2 className="font-sans font-black tracking-wide leading-normal uppercase text-5xl md:text-6xl text-white select-none transition-all duration-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                                    {slide.content.split(' ').map((word, idx) => {
                                                        const cleanWord = word.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');
                                                        const isKeyword = cleanWord.match(/^[0-9]+$/) || 
                                                                          ['percent', 'crore', 'lakh', 'vaada', 'guarantee', 'modi', 'bjp', 'government', 'development', 'million', 'billion', 'रुपये', 'करोड़', 'लाख', 'मोदी', 'गारंटी'].includes(cleanWord.toLowerCase());
                                                        return (
                                                            <span 
                                                                key={idx} 
                                                                className={`inline-block mr-3 mb-3 ${isKeyword ? 'text-gameOrange drop-shadow-[0_0_12px_rgba(255,107,0,0.8)]' : 'text-white'}`}
                                                            >
                                                                {word}
                                                            </span>
                                                        );
                                                    })}
                                                </h2>
                                            </div>
                                        </div>
                                    )}

                                    {/* STYLE 2: INTERACTIVE DASHBOARD SCORECARD */}
                                    {styleParam === 'dashboard' && (
                                        <div className="flex flex-col items-center justify-between bg-slate-900/40 border border-white/10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] w-full h-full p-12 relative overflow-hidden">
                                            {/* Top half: The promise text card */}
                                            <div className="w-full bg-slate-950/70 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-xl flex flex-col justify-center min-h-[220px]">
                                                <span className="text-[10px] font-black text-gameOrange tracking-[0.3em] uppercase mb-3">
                                                    {slide.type === 'headline' ? 'THE MODI GUARANTEE' : `AUDIT VERDICT ANALYSIS (PART ${i})`}
                                                </span>
                                                <p className="text-white text-3.5xl font-extrabold leading-snug text-left normal-case tracking-wide">
                                                    {slide.content}
                                                </p>
                                            </div>

                                            {/* Center: Scorecard and PM Modi Cut-out */}
                                            <div className="flex-1 w-full flex items-center justify-between my-8 gap-8">
                                                {/* PM Modi image */}
                                                <div className="w-[320px] h-[320px] rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative bg-slate-900 shrink-0">
                                                    <img 
                                                        src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Narendra_Modi_delivering_his_address_to_the_Nation.jpg" 
                                                        alt="PM Modi"
                                                        className="w-full h-full object-cover object-top"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
                                                    <div className="absolute bottom-4 left-4">
                                                        <span className="text-[10px] font-black text-white/50 tracking-wider uppercase font-sans">Authorizer</span>
                                                        <h4 className="text-white font-bold text-sm">PM Narendra Modi</h4>
                                                    </div>
                                                </div>

                                                {/* Scorecard Gauge & Stats card */}
                                                <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-5 h-full justify-center">
                                                    {/* SVG Progress Gauge */}
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative w-24 h-24">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                                <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                                                                <circle 
                                                                    cx="48" 
                                                                    cy="48" 
                                                                    r="40" 
                                                                    stroke="#FF6B00" 
                                                                    strokeWidth="8" 
                                                                    fill="transparent" 
                                                                    strokeDasharray="251.2" 
                                                                    strokeDashoffset={
                                                                        newsItem?.status === 'Fulfilled' ? '15' :
                                                                        newsItem?.status === 'Partially Fulfilled' ? '125' :
                                                                        newsItem?.status === 'In Progress' ? '180' : '251.2'
                                                                    }
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                                <span className="text-white font-black text-lg">
                                                                    {newsItem?.status === 'Fulfilled' ? '94%' :
                                                                     newsItem?.status === 'Partially Fulfilled' ? '50%' :
                                                                     newsItem?.status === 'In Progress' ? '25%' : '0%'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Fulfillment Index</span>
                                                            <span className="text-white font-bold text-sm">
                                                                {newsItem?.status === 'Fulfilled' ? 'Fulfillment Achieved' :
                                                                 newsItem?.status === 'Partially Fulfilled' ? 'Partial Progress' :
                                                                 newsItem?.status === 'In Progress' ? 'Under Execution' : 'No Substantial Progress'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Audit Verdict Badge */}
                                                    <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
                                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-wider font-sans">Official Status</span>
                                                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-center border w-fit ${
                                                            newsItem?.status === 'Fulfilled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]' :
                                                            newsItem?.status === 'Partially Fulfilled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                                            newsItem?.status === 'In Progress' ? 'bg-blue-500/10 text-gameBlue border-blue-500/30' :
                                                            'bg-red-500/10 text-red-400 border-red-500/30'
                                                        }`}>
                                                            {newsItem?.status || 'NOT FULFILLED'}
                                                        </span>
                                                    </div>

                                                    {/* Stat Metric */}
                                                    <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
                                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-wider font-sans">Verification Scope</span>
                                                        <span className="text-white font-black text-sm uppercase tracking-wide">
                                                            {newsItem?.source_manifesto_year || '2014'} BJP MANIFESTO AUDIT
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Section */}
                    <div className="relative z-20 mt-auto bg-white/5 p-10 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-4">
                        <div className="w-full h-3 bg-white/10 mb-2 rounded-full overflow-hidden relative">
                            <div 
                                className="h-full bg-gradient-to-r from-gameOrange to-amber-500 transition-all duration-700 ease-out" 
                                style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
                            />
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
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700;800;900&family=Outfit:wght@400;500;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
                body, html { 
                    background-color: transparent !important; 
                    font-family: 'Outfit', 'Noto Sans Devanagari', 'Inter', sans-serif !important;
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.15; }
                    50% { transform: translateY(-20px) scale(1.1); opacity: 0.35; }
                }
                .animate-float-slow {
                    animation: float-slow 12s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default HeadlessReelGenerator;
