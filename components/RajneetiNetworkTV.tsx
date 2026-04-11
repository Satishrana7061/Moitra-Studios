import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Newspaper, TrendingUp, TrendingDown, MonitorPlay, Radio, Megaphone, ArrowRight, Clock, Video, X, Maximize2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dynamicCampaignService, SocialCampaign } from '../services/dynamicCampaignService';
import { supabase } from '../lib/supabase';
import { getLeaderAvatar } from '../lib/utils';
import { AdBanner } from './AdBanner';


interface DailyNews {
    leader: string;
    state: string;
    sentiment_score: string;
    ticker_headline: string;
    blog_title: string;
    blog_content: string;
    social_post: string;
    date: string;
}

const parseBulletPoints = (text: string): string[] => {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/)
               .map(s => s.trim())
               .filter(s => s.length > 15);
};

const RajneetiNetworkTV: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initialStateIndex = location.state?.activeIndex ?? 0;

    const [newsData, setNewsData] = useState<DailyNews[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(initialStateIndex);
    const [loading, setLoading] = useState(true);
    const [liveCampaign, setLiveCampaign] = useState<SocialCampaign | null>(null);
    const [isStudioMode, setIsStudioMode] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const articleRefs = useRef<(HTMLDivElement | null)[]>([]);
    const sidebarScrollRef = useRef<HTMLDivElement | null>(null);

    // Helper for canvas text wrapping
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        return currentY;
    };

    const generateDirectReel = async () => {
        if (!activeNews || !slides.length) return;
        setIsExporting(true);
        setExportProgress(0);
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Pre-load avatar
        const avatarImg = new Image();
        avatarImg.crossOrigin = "anonymous";
        avatarImg.src = getLeaderAvatar(activeNews.leader, activeNews.state);
        await new Promise((resolve) => { avatarImg.onload = resolve; avatarImg.onerror = resolve; });

        const stream = (canvas as any).captureStream(30); // 30 FPS
        let mimeTypes = [
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        let selectedMimeType = '';
        for (let mt of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mt)) {
                selectedMimeType = mt;
                break;
            }
        }
        
        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(stream, { 
                mimeType: selectedMimeType,
                videoBitsPerSecond: 5000000 // 5Mbps for high quality
            });
        } catch (e) {
            console.error("MediaRecorder init failed:", e);
            setIsExporting(false);
            return;
        }
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            // Force MP4 format where possible, as WhatsApp natively rejects .webm
            const isMp4Compatible = selectedMimeType.includes('mp4') || selectedMimeType.includes('h264');
            const blobType = isMp4Compatible ? 'video/mp4' : 'video/webm';
            const extension = isMp4Compatible ? 'mp4' : 'webm';
            
            const blob = new Blob(chunks, { type: blobType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Rajneeti-Reel-${activeNews.leader.replace(/\s+/g, '-')}-${Date.now()}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            setIsExporting(false);
        };

        recorder.start();
        const totalDuration = slides.length * 8000;
        const startTime = performance.now();
        let localIsExporting = true;
        
        const renderFrame = (now: number) => {
            if (!localIsExporting) return;
            const elapsed = now - startTime;
            
            if (elapsed >= totalDuration) {
                if (recorder.state !== 'inactive') recorder.stop();
                localIsExporting = false;
                return;
            }

            const currentSlideIdx = Math.floor(elapsed / 8000);
            const slideProgress = (elapsed % 8000) / 8000;
            setExportProgress(Math.floor((elapsed / totalDuration) * 100));

            // 1. Background (Premium Dark Gradient)
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, 1080, 1920);
            
            // Background Accents (Glow)
            const grad = ctx.createRadialGradient(540, 960, 0, 540, 960, 1200);
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(1, '#020617');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. Header "LIVE" & Info
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(80, 120, 160, 70);
            ctx.fillStyle = 'white';
            ctx.font = '900 40px Rajdhani, sans-serif';
            ctx.fillText('LIVE', 115, 170);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '700 32px Rajdhani, sans-serif';
            ctx.fillText(`${activeNews.date} | ${activeNews.state.toUpperCase()}`, 80, 240);

            // 3. Leader Avatar (Circle)
            ctx.save();
            ctx.beginPath();
            ctx.arc(160, 420, 80, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            if (avatarImg.complete) {
                ctx.drawImage(avatarImg, 80, 340, 160, 160);
            }
            ctx.restore();
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 6;
            ctx.stroke();

            // 4. Slide Content
            const slide = slides[currentSlideIdx];
            if (slide) {
                // Slide Tag
                ctx.fillStyle = slide.type === 'headline' ? '#dc2626' : '#2563eb';
                ctx.fillRect(80, 600, slide.type === 'headline' ? 440 : 400, 65);
                ctx.fillStyle = 'white';
                ctx.font = '900 36px Rajdhani, sans-serif';
                ctx.fillText(slide.type === 'headline' ? 'BREAKING NEWS' : `KEY POINT ${currentSlideIdx}`, 110, 645);

                // Slide Content
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 20;
                
                if (slide.type === 'headline') {
                    ctx.font = '900 92px Rajdhani, sans-serif';
                    wrapText(ctx, slide.content.toUpperCase(), 80, 800, 920, 110);
                } else {
                    ctx.font = '700 68px Rajdhani, sans-serif';
                    wrapText(ctx, slide.content, 80, 800, 920, 90);
                }
                ctx.shadowBlur = 0;
            }

            // 5. Footer Progress & Branding
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(80, 1600, 920, 8);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(80, 1600, 920 * slideProgress, 8);

            ctx.fillStyle = 'white';
            ctx.font = '900 56px Rajdhani, sans-serif';
            wrapText(ctx, activeNews.blog_title, 80, 1680, 920, 60);
            
            // Watermark
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '900 48px Rajdhani, sans-serif';
            const wm = "RAJNEETI TV NETWORK";
            const wmMetrics = ctx.measureText(wm);
            ctx.fillText(wm, 1080 - wmMetrics.width - 40, 1860);

            requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
    };

    const startRecording = async () => {
        try {
            // Ask user to select the current tab for recording
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    displaySurface: 'browser' as any,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            const recorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Rajneeti-News-${activeNews?.blog_title.substring(0, 20)}-${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
                setIsRecording(false);
                
                // Stop all tracks to remove the recording indicator in browser
                stream.getTracks().forEach(track => track.stop());
            };

            recorderRef.current = recorder;
            streamRef.current = stream;
            
            // Start recording
            recorder.start();
            setIsRecording(true);
            
            // Reset slideshow so recording starts from frame 1
            setSlideIndex(0);

        } catch (err) {
            console.error("Recording failed:", err);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
    };

    useEffect(() => {
        document.title = "Rajneeti TV Network | Live Indian Political News & Updates";
        const fetchDailyNews = async () => {
            try {
                let finalData = null;
                if (supabase) {
                    const { data, error } = await supabase
                        .from('news_events')
                        .select('*')
                        .order('news_date', { ascending: false })
                        .limit(10);
                        
                    if (!error && data && data.length > 0) {
                        // Map news_date to date for the frontend
                        finalData = data.map(item => ({
                            ...item,
                            date: item.news_date
                        }));
                    }
                }
                
                // Fallback to static JSON if Supabase fails or isn't used
                if (!finalData) {
                    const response = await fetch(`${import.meta.env.BASE_URL}daily_news.json?t=${Date.now()}`);
                    const data = await response.json();
                    if (data) finalData = Array.isArray(data) ? data : [data];
                }
                
                if (finalData) {
                    setNewsData(finalData);
                }
            } catch (error) {
                console.error("Error loading TV news:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchLiveCampaign = async () => {
            try {
                const experience = await dynamicCampaignService.getActiveExperience();
                if (experience.type === 'campaign' && experience.data) {
                    setLiveCampaign(experience.data as SocialCampaign);
                }
            } catch (e) {
                // Silently ignore â€” this is a bonus UI element
            }
        };

        fetchDailyNews();
        fetchLiveCampaign();
    }, []);

    // Auto-scroll to the selected news item on initial load AND when activeIndex changes
    useEffect(() => {
        if (!loading && newsData && newsData.length > 0) {
            setTimeout(() => {
                const container = sidebarScrollRef.current;
                const article = articleRefs.current[activeIndex];
                if (container && article) {
                    container.scrollTo({ top: article.offsetTop - container.offsetTop, behavior: 'smooth' });
                }
            }, 300); // Wait a bit for render
        }
    }, [loading, newsData, activeIndex]);

    // Sync activeIndex with location state (e.g. when coming from Home Map)
    useEffect(() => {
        if (location.state?.activeIndex !== undefined && location.state.activeIndex !== activeIndex) {
            setActiveIndex(location.state.activeIndex);
        }
    }, [location.state]);

    const activeNews = newsData ? newsData[activeIndex] : null;

    const slides = useMemo(() => {
        if (!activeNews) return [];
        return [
            { type: 'headline', content: activeNews.ticker_headline },
            ...parseBulletPoints(activeNews.blog_content).map(b => ({ type: 'bullet', content: b }))
        ];
    }, [activeNews]);

    // Reset slide index when changing news
    useEffect(() => {
        setSlideIndex(0);
    }, [activeIndex]);

    // Auto-advance slides - SLOWED DOWN TO 8 SECONDS
    useEffect(() => {
        if (slides.length <= 1) return;
        
        const timer = setInterval(() => {
            setSlideIndex(prev => (prev + 1) % slides.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [slides]);


    return (
        <div className="min-h-screen bg-black text-slate-200 font-sans flex flex-col overflow-x-hidden">
            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 pt-0 md:pt-4 pb-4 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,20,20,0.5)_0%,rgba(0,0,0,0.9)_100%)] pointer-events-none z-0"></div>

                <header className="relative z-10 flex items-center justify-between border-b-2 border-red-600 pb-2 mb-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-600 text-white font-black text-[10px] md:text-2xl px-2 md:px-4 py-1 rounded shadow-[0_0_15px_rgba(220,38,38,0.6)] flex items-center gap-2 uppercase">
                            <MonitorPlay size={24} />
                            RAJNEETI TV NETWORK
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-600/20 border border-red-500/50 text-red-500 animate-pulse">
                        <Radio size={16} />
                        <span className="text-sm font-bold tracking-[0.2em] hidden md:inline">LIVE BROADCAST</span>
                    </div>
                </header>

                {loading || !newsData || !activeNews ? (
                    <div className="flex-1 flex items-center justify-center relative z-10">
                        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col gap-6 pb-20">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 flex flex-col gap-0">
                                <div className="bg-slate-900 border border-white/10 rounded-t-xl overflow-hidden shadow-2xl flex flex-col relative h-[460px]">
                                    <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-blue-900/20 flex items-center justify-center">
                                            <div className="w-[120%] h-[120%] border-[20px] border-white/5 rounded-full animate-spin-slow absolute"></div>
                                            <div className="w-[80%] h-[80%] border-t-4 border-red-600/30 rounded-full animate-reverse-spin absolute"></div>
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 to-transparent"></div>

                                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
                                            <div 
                                                key={`${activeIndex}-${slideIndex}`}
                                                className="h-full bg-red-600 animate-[progress_8s_linear_forwards]"
                                            />
                                        </div>

                                        <div key={activeIndex} className="relative text-center px-6 md:px-12 w-full flex items-center justify-center min-h-[180px] overflow-hidden">
                                            {slides.map((slide, i) => (
                                                <div 
                                                    key={`${activeIndex}-${i}`} 
                                                    className={`absolute w-full px-4 md:px-12 transition-all duration-700 ease-out transform ${
                                                        i === slideIndex ? 'translate-x-0 opacity-100 scale-100 relative' : 
                                                        i < slideIndex ? '-translate-x-[150%] opacity-0 scale-95 absolute' : 'translate-x-[150%] opacity-0 scale-95 absolute'
                                                    }`}
                                                >
                                                    <div className={`inline-block text-white px-3 py-1 text-sm font-black uppercase tracking-widest mb-4 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${slide.type === 'headline' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                                        {slide.type === 'headline' ? 'Breaking' : `Key Point ${i}`}
                                                    </div>
                                                    <h2 className={`font-rajdhani leading-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mx-auto ${
                                                        slide.type === 'headline' ? 'text-3xl md:text-5xl font-black text-white' : 'text-2xl md:text-4xl font-bold text-slate-100'
                                                    }`}>
                                                        {slide.content}
                                                    </h2>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="absolute bottom-4 left-2 right-2 md:left-4 md:right-4 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-3 pointer-events-none">
                                            <div className="bg-blue-900/90 backdrop-blur-sm text-white font-bold px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-base rounded-md shadow-lg border border-blue-400/30 uppercase tracking-widest shrink-0 pointer-events-auto">
                                                {activeNews.date} | {activeNews.state}
                                            </div>
                                            <a
                                                href="https://play.google.com/store/apps/details?id=com.rajneeti"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 md:gap-2 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 group shrink-0 pointer-events-auto"
                                            >
                                                <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 fill-gameBlue" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a2.203 2.203 0 01-.61-1.511V3.325c0-.573.22-1.092.61-1.511zM14.502 12.71l2.583 2.583-9.524 5.49a2.189 2.189 0 01-1.353.284l8.294-8.357zM17.839 12.427L20.8 10.71c.73-.418.73-1.482 0-1.9L17.84 7.093l-3.34 3.341 3.339 1.993zM14.502 11.29l-8.293-8.357a2.189 2.189 0 011.353.284l9.524 5.49-2.584 2.583z" />
                                                </svg>
                                                <div className="flex flex-col items-start leading-none gap-[1px]">
                                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Get it on</span>
                                                    <span className="text-[14px] md:text-[15px] font-black text-white tracking-tight">Google Play</span>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-14 bg-blue-950 flex items-center relative overflow-hidden flex-shrink-0 rounded-b-xl border border-t-0 border-white/10">
                                    <div className="absolute left-0 top-0 bottom-0 bg-red-600 w-32 md:w-40 flex items-center justify-center z-10 shadow-lg border-r-2 border-white/20">
                                        <span className="text-white font-black text-sm md:text-lg tracking-widest">RN TICKER</span>
                                    </div>
                                    <div className="pl-36 md:pl-48 text-slate-200 text-lg md:text-xl font-bold font-rajdhani whitespace-nowrap animate-[marquee_45s_linear_infinite]">
                                        <span className="text-white">{activeNews.ticker_headline}</span> &nbsp;&bull;&nbsp; <span className="text-gameOrange">{activeNews.blog_title}</span> &nbsp;&bull;&nbsp; {activeNews.leader} reports a sentiment shift of {activeNews.sentiment_score}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setIsStudioMode(true)}
                                    className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-black font-rajdhani tracking-widest uppercase py-4 rounded-xl border border-white/10 transition-all shadow-lg group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gameOrange/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <Video className="w-5 h-5 text-gameOrange group-hover:scale-110 transition-transform relative z-10" />
                                    <span className="relative z-10">Enter Reel Studio (Download 9:16)</span>
                                    <Maximize2 className="w-4 h-4 ml-2 opacity-50 relative z-10" />
                                </button>
                            </div>

                            <div className="lg:col-span-4 bg-slate-900/60 border border-white/20 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                                <div className="p-3 bg-red-600 border-b border-red-500/50 flex items-center justify-between shadow-[0_0_15px_rgba(220,38,38,0.4)] z-10">
                                    <span className="font-black text-white tracking-widest text-xs lg:text-sm uppercase flex items-center gap-2">
                                        <Newspaper size={16} /> Latest Briefings
                                    </span>
                                </div>
                                <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scroll-smooth pr-2 pb-10 custom-scrollbar">
                                    {newsData.map((news, idx) => {
                                        const isActive = idx === activeIndex;
                                        return (
                                            <React.Fragment key={idx}>
                                                <article
                                                    ref={(el) => { articleRefs.current[idx] = el; }}
                                                    onClick={() => setActiveIndex(idx)}
                                                    className={`flex flex-col gap-4 cursor-pointer transition-all duration-300 pb-6 border-t border-white/10 first:border-0 pt-6 scroll-mt-0 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                                                >
                                                <header className="relative">
                                                    <h3 className="text-gameOrange font-bold text-xs tracking-widest uppercase mb-2">
                                                        {news.state} | {news.date}
                                                    </h3>
                                                    <h2 className="text-[22px] font-rajdhani font-bold text-white mb-3 leading-tight">
                                                        {news.blog_title}
                                                    </h2>
                                                </header>
                                                <div className={`text-slate-300 font-sans normal-case text-base leading-relaxed ${!isActive && 'line-clamp-2'}`}>
                                                    <p>{news.blog_content}</p>
                                                </div>
                                                </article>
                                                {idx > 0 && idx % 3 === 0 && (
                                                    <AdBanner layoutArea="sidebar" className="my-4" />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {liveCampaign && (
                            <div className="relative rounded-2xl overflow-hidden border border-gameOrange/20 bg-gradient-to-r from-slate-900 to-black p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-black font-rajdhani text-xl uppercase leading-tight mb-2">
                                            {liveCampaign.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm line-clamp-1">{liveCampaign.subtitle}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/social-campaign/${liveCampaign.id}`)}
                                    className="shrink-0 flex items-center gap-2 bg-gameOrange text-white px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-orange-500 transition-all shadow-xl hover:scale-105"
                                >
                                    Cast Your Vote <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                        
                        {/* Leaderboard Ad integration */}
                        <AdBanner layoutArea="leaderboard" className="mt-8 mb-4 w-full" />
                    </div>
                )}
            </main>

            {isStudioMode && activeNews && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-0 md:p-8 animate-fade-in backdrop-blur-3xl">
                    <div className="w-full max-w-[500px] flex items-center justify-between mb-2 md:mb-6 px-4 absolute top-4 md:relative md:top-auto z-[110]">
                        <div className="flex flex-col">
                            <span className="font-rajdhani font-black text-white text-lg tracking-widest uppercase italic">REEL STUDIO</span>
                            <span className="text-gameOrange font-bold text-[9px] uppercase tracking-tighter opacity-70 italic">● Viral Content Generator</span>
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 mr-2">
                                <button 
                                    onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                                    disabled={activeIndex === 0}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                                >
                                    <ArrowRight className="w-4 h-4 rotate-180" />
                                </button>
                                <span className="text-white font-black font-rajdhani text-sm px-3">
                                    {activeIndex + 1} / {newsData?.length}
                                </span>
                                <button 
                                    onClick={() => setActiveIndex(prev => Math.min((newsData?.length || 1) - 1, prev + 1))}
                                    disabled={activeIndex === (newsData?.length || 1) - 1}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            {isExporting ? (
                                <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-gameOrange/30 backdrop-blur-md">
                                    <div className="w-4 h-4 border-2 border-gameOrange border-t-transparent rounded-full animate-spin" />
                                    <span className="text-white text-[10px] font-black uppercase tracking-widest leading-none">
                                        Generating Reel {exportProgress}%
                                    </span>
                                </div>
                            ) : (
                                <button 
                                    onClick={generateDirectReel}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105"
                                >
                                    <Video className="w-4 h-4" /> Download Reel
                                </button>
                            )}
                            
                            <button 
                                onClick={() => setIsStudioMode(false)}
                                className="bg-white/10 hover:bg-red-600 text-white p-2.5 rounded-full backdrop-blur-md transition-all group"
                            >
                                <X className="w-5 h-5 group-hover:scale-110" />
                            </button>
                        </div>
                    </div>

                    <div key={activeIndex} className="relative bg-slate-900 border border-white/5 overflow-hidden shadow-2xl w-full max-w-[500px]"
                         style={{ aspectRatio: '9/16', height: '90vh', maxHeight: '1920px' }}>
                        
                        {isExporting && (
                            <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-md">
                                <AdBanner layoutArea="interstitial" className="mb-8 w-full max-w-sm" />
                                <div className="flex flex-col items-center gap-4 text-white p-6 bg-slate-900/80 rounded-xl border border-white/10">
                                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="font-rajdhani font-bold text-lg md:text-xl uppercase tracking-widest text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                        Encoding Reel {exportProgress}%
                                    </span>
                                    <p className="text-slate-400 text-xs md:text-sm text-center max-w-xs leading-relaxed">
                                        Please wait while we render your custom 9:16 reel directly to your device.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-blue-900/20 flex flex-col items-center justify-center space-y-8 opacity-50 pointer-events-none">
                            <div className="w-[150%] aspect-square border-[40px] border-white/5 rounded-full animate-spin-slow absolute"></div>
                            <div className="w-[100%] aspect-square border-t-[8px] border-red-600/30 rounded-full animate-reverse-spin absolute"></div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>

                        <div className="relative h-full flex flex-col justify-between p-8 md:p-10 z-10 w-full">
                            <div className="mt-8 flex flex-col gap-2 relative z-20">
                                <div className="flex items-center gap-2 self-start bg-red-600 text-white font-black px-4 py-1.5 text-sm md:text-base uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                                    <Radio size={16} className="animate-pulse" /> LIVE
                                </div>
                                <div className="text-white/80 font-bold uppercase tracking-widest text-[10px] md:text-xs bg-black/40 px-3 py-1 rounded w-fit backdrop-blur-sm">
                                    {activeNews.date} | {activeNews.state}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center relative min-h-[50%] mt-8 z-10">
                                {slides.map((slide, i) => (
                                    <div 
                                        key={`${activeIndex}-${i}`} 
                                        className={`absolute w-full transition-all duration-700 ease-out transform ${
                                            i === slideIndex ? 'translate-x-0 opacity-100 scale-100' : 
                                            i < slideIndex ? '-translate-x-[150%] opacity-0 scale-95' : 'translate-x-[150%] opacity-0 scale-95'
                                        }`}
                                    >
                                        <div className={`inline-block text-white px-4 py-1.5 font-black uppercase tracking-widest mb-6 shadow-lg text-[10px] md:text-xs ${slide.type === 'headline' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                            {slide.type === 'headline' ? 'Breaking News' : `Analysis Point ${i}/${slides.length - 1}`}
                                        </div>
                                        <h2 className={`font-rajdhani leading-tight drop-shadow-xl ${
                                            slide.type === 'headline' ? 'text-4xl md:text-5xl font-black text-white px-1' : 'text-2xl md:text-3xl font-bold text-slate-100 px-1'
                                        }`}>
                                            {slide.content}
                                        </h2>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4 relative z-20">
                                <div className="w-full h-[3px] bg-white/20 mb-6 rounded-full overflow-hidden">
                                    <div 
                                        key={`${activeIndex}-${slideIndex}`} 
                                        className="h-full bg-red-600 animate-[progress_8s_linear_forwards]"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-red-600 text-white text-[10px] md:text-xs font-black px-3 py-1 uppercase tracking-widest w-fit shadow-lg">
                                        RN Update
                                    </div>
                                    <h3 className="text-white font-bold font-sans text-lg md:text-xl leading-tight line-clamp-3 mb-2 drop-shadow-md">
                                        {activeNews.blog_title}
                                    </h3>
                                </div>
                            </div>
                        </div>
                        {/* React UI Overlay Watermark */}
                        <div className="absolute bottom-4 right-4 opacity-50 z-20 pointer-events-none">
                            <span className="font-rajdhani font-black text-white/50 text-[10px] md:text-xs tracking-widest uppercase">
                                RAJNEETI TV NETWORK
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} width="1080" height="1920" className="hidden" />

            <style>{`
                @keyframes marquee { 
                  0% { transform: translateX(100%); } 
                  100% { transform: translateX(-150%); } 
                }
                @keyframes progress {
                  0% { width: 0%; }
                  100% { width: 100%; }
                }
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
                @keyframes fade-in {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .animate-fade-in {
                  animation: fade-in 0.3s ease-out forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(0,0,0,0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #dc2626;
                  border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default RajneetiNetworkTV;
