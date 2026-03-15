import React, { useEffect, useState, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { Newspaper, TrendingUp, TrendingDown, MonitorPlay, Radio } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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

const RajneetiNetworkTV: React.FC = () => {
    const location = useLocation();
    const initialStateIndex = location.state?.activeIndex ?? 0;

    const [newsData, setNewsData] = useState<DailyNews[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(initialStateIndex);
    const [loading, setLoading] = useState(true);
    const articleRefs = useRef<(HTMLDivElement | null)[]>([]);
    const sidebarScrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        document.title = "Rajneeti TV Network | Live Indian Political News & Updates";
        const fetchDailyNews = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}daily_news.json?t=${Date.now()}`);
                const data = await response.json();
                if (data) {
                    setNewsData(Array.isArray(data) ? data : [data]);
                }
            } catch (error) {
                console.error("Error loading TV news:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDailyNews();
    }, []);


    const activeNews = newsData ? newsData[activeIndex] : null;
    const isPositive = activeNews && !activeNews.sentiment_score.includes('-');

    return (
        <div className="h-full bg-black text-slate-200 font-sans flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 pt-0 pb-4 relative h-full">
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
                    <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                        {/* Top/Main Video Area */}
                        <div className="lg:col-span-8 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col relative h-[500px]">
                            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
                                {/* Fake background for the news broadcast */}
                                <div className="absolute inset-0 bg-blue-900/20 flex items-center justify-center">
                                    <div className="w-[120%] h-[120%] border-[20px] border-white/5 rounded-full animate-spin-slow absolute"></div>
                                    <div className="w-[80%] h-[80%] border-t-4 border-red-600/30 rounded-full animate-reverse-spin absolute"></div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 to-transparent"></div>

                                <div className="relative text-center px-6 md:px-12 w-full">
                                    <div className="inline-block bg-red-600 text-white px-3 py-1 text-sm font-black uppercase tracking-widest mb-4 shadow-[0_0_10px_rgba(220,38,38,0.8)]">
                                        Breaking
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-black text-white font-rajdhani uppercase leading-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                                        {activeNews.ticker_headline}
                                    </h2>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <div className="bg-blue-900/90 backdrop-blur-sm text-white font-bold px-4 py-2 text-sm md:text-base rounded-md shadow-lg border border-blue-400/30 uppercase tracking-widest shrink-0">
                                        {activeNews.date} | {activeNews.state}
                                    </div>
                                    <a
                                        href="https://play.google.com/store/apps/details?id=com.rajneeti"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 px-4 py-2 md:px-5 md:py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 group shrink-0"
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

                            {/* Bottom Ticker bar similar to real TV */}
                            <div className="h-16 bg-blue-950 flex items-center relative overflow-hidden flex-shrink-0">
                                <div className="absolute left-0 top-0 bottom-0 bg-red-600 w-32 md:w-40 flex items-center justify-center z-10 shadow-lg border-r-2 border-white/20">
                                    <span className="text-white font-black text-sm md:text-lg tracking-widest">RN TICKER</span>
                                </div>
                                <div className="pl-36 md:pl-48 text-slate-200 text-lg md:text-xl font-bold font-rajdhani whitespace-nowrap animate-[marquee_20s_linear_infinite]">
                                    <span className="text-white">{activeNews.ticker_headline}</span> &nbsp;&bull;&nbsp; <span className="text-gameOrange">{activeNews.blog_title}</span> &nbsp;&bull;&nbsp; {activeNews.leader} reports a sentiment shift of {activeNews.sentiment_score}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Details mapped array */}
                        <div className="lg:col-span-4 bg-slate-900/60 border border-white/20 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                            <div className="p-3 bg-red-600 border-b border-red-500/50 flex items-center justify-between shadow-[0_0_15px_rgba(220,38,38,0.4)] z-10">
                                <span className="font-black text-white tracking-widest text-xs lg:text-sm uppercase flex items-center gap-2">
                                    <Newspaper size={16} /> Latest Briefings
                                </span>
                                <span className="text-[10px] text-white/80 uppercase tracking-widest font-bold">Scroll inside</span>
                            </div>
                            <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scroll-smooth pr-2 pb-10" style={{ scrollbarWidth: 'thin', scrollbarColor: '#dc2626 rgba(0,0,0,0.2)' }}>
                                {newsData.map((news, idx) => {
                                    const isPos = !news.sentiment_score.includes('-');
                                    const isActive = idx === activeIndex;
                                    return (
                                        <article
                                            key={idx}
                                            ref={(el) => { articleRefs.current[idx] = el; }}
                                            onClick={() => {
                                                setActiveIndex(idx);
                                                // Scroll only the sidebar container, not the whole page
                                                setTimeout(() => {
                                                    const container = sidebarScrollRef.current;
                                                    const article = articleRefs.current[idx];
                                                    if (container && article) {
                                                        container.scrollTo({ top: article.offsetTop - container.offsetTop, behavior: 'smooth' });
                                                    }
                                                }, 100);
                                            }}
                                            className={`flex flex-col gap-4 cursor-pointer transition-all duration-300 pb-6 border-t border-white/10 first:border-0 pt-6 scroll-mt-0 ${isActive ? 'opacity-100 scale-[1.01]' : 'opacity-50 hover:opacity-100'}`}
                                        >
                                                <header className="relative">
                                                    <h3 className="text-gameOrange font-bold text-xs tracking-widest uppercase mb-2">
                                                        Anchor's Desk
                                                    </h3>
                                                    <h2 className="text-lg font-cinzel font-bold text-white mb-3 leading-tight" title={news.blog_title}>
                                                        {news.blog_title}
                                                    </h2>
                                                </header>
                                                <div className={`text-slate-300 font-rajdhani text-[16px] md:text-lg leading-[1.6] tracking-wide ${!isActive && 'line-clamp-3'}`}>
                                                    <p className="mb-2">{news.blog_content}</p>
                                                </div>

                                            <div className="relative pt-2">
                                                <h3 className="text-emerald-500 font-bold text-xs tracking-widest uppercase mb-2">
                                                    Political Impact
                                                </h3>
                                                <div className="flex items-center justify-between bg-black/50 p-3 rounded border border-white/5">
                                                    <div>
                                                        <div className="text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-wider">Key Leader</div>
                                                        <div className="text-white font-black text-sm font-cinzel">{news.leader}</div>
                                                    </div>
                                                    <div className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded font-black text-sm border ${isPos ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                        {isPos ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                        {news.sentiment_score}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
        @keyframes marquee { 
          0% { transform: translateX(100%); } 
          100% { transform: translateX(-150%); } 
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
      `}</style>
        </div>
    );
};

export default RajneetiNetworkTV;
