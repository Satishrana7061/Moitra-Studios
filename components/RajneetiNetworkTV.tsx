import React, { useEffect, useState, useRef } from 'react';
import { Newspaper, TrendingUp, TrendingDown, MonitorPlay, Radio, Megaphone, ArrowRight, Clock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dynamicCampaignService, SocialCampaign } from '../services/dynamicCampaignService';

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
    const navigate = useNavigate();
    const initialStateIndex = location.state?.activeIndex ?? 0;

    const [newsData, setNewsData] = useState<DailyNews[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(initialStateIndex);
    const [loading, setLoading] = useState(true);
    const [liveCampaign, setLiveCampaign] = useState<SocialCampaign | null>(null);
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

    // Auto-scroll to the selected news item on initial load
    useEffect(() => {
        if (!loading && newsData && newsData.length > 0 && activeIndex > 0) {
            setTimeout(() => {
                const container = sidebarScrollRef.current;
                const article = articleRefs.current[activeIndex];
                if (container && article) {
                    container.scrollTo({ top: article.offsetTop - container.offsetTop, behavior: 'smooth' });
                }
            }, 300); // Wait a bit for render
        }
    }, [loading, newsData]);

    const activeNews = newsData ? newsData[activeIndex] : null;

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
                        {/* Main Video + Sidebar */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Top/Main Video Area */}
                            <div className="lg:col-span-8 flex flex-col gap-0">
                                <div className="bg-slate-900 border border-white/10 rounded-t-xl overflow-hidden shadow-2xl flex flex-col relative h-[460px]">
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
                                            <h2 className="text-3xl md:text-5xl font-black text-white font-rajdhani leading-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                                                {activeNews.ticker_headline}
                                            </h2>
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

                                {/* Bottom Ticker bar — outside the video container so it's always visible */}
                                <div className="h-14 bg-blue-950 flex items-center relative overflow-hidden flex-shrink-0 rounded-b-xl border border-t-0 border-white/10">
                                    <div className="absolute left-0 top-0 bottom-0 bg-red-600 w-32 md:w-40 flex items-center justify-center z-10 shadow-lg border-r-2 border-white/20">
                                        <span className="text-white font-black text-sm md:text-lg tracking-widest">RN TICKER</span>
                                    </div>
                                    <div className="pl-36 md:pl-48 text-slate-200 text-lg md:text-xl font-bold font-rajdhani whitespace-nowrap animate-[marquee_45s_linear_infinite]">
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
                                                        <h2 className="text-[22px] font-rajdhani font-bold text-white mb-3 leading-tight" title={news.blog_title}>
                                                            {news.blog_title}
                                                        </h2>
                                                    </header>
                                                    <div className={`text-slate-300 font-sans normal-case text-base md:text-lg leading-relaxed ${!isActive && 'line-clamp-3'}`}>
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

                                    {/* Google Ads Placeholder */}
                                    <div className="mt-4 mb-4 bg-black/40 border border-dashed border-white/20 rounded-lg p-4 text-center text-white/40 text-sm min-h-[120px] flex flex-col items-center justify-center shrink-0">
                                        <span className="uppercase tracking-widest font-bold text-xs mb-1">Advertisement</span>
                                        <span className="text-[10px]">Google Ad space (Integration pending)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* â”€â”€â”€ LIVE SOCIAL CAMPAIGN BANNER â”€â”€â”€ */}
                        {liveCampaign && (
                            <div className="relative rounded-2xl overflow-hidden border border-gameOrange/20 bg-gradient-to-r from-slate-900 to-black">
                                {/* Animated accent line at top */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gameOrange via-yellow-400 to-gameOrange animate-pulse" />

                                <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4 flex-1">
                                        {/* Live indicator */}
                                        <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">LIVE</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Megaphone size={14} className="text-gameOrange shrink-0" />
                                                <span className="text-[10px] font-black text-gameOrange uppercase tracking-widest">
                                                    Social Campaign Â· {liveCampaign.issue_category}
                                                    {liveCampaign.region && liveCampaign.region !== 'national' && (
                                                        <span className="ml-2 text-slate-400">Â· {liveCampaign.region.replace('state:', '')}</span>
                                                    )}
                                                </span>
                                            </div>
                                            <h3 className="text-white font-black font-rajdhani text-xl md:text-2xl uppercase leading-tight mb-2 truncate">
                                                {liveCampaign.title}
                                            </h3>
                                            <p className="text-slate-400 text-sm line-clamp-2 normal-case">
                                                {liveCampaign.subtitle}
                                            </p>
                                            {liveCampaign.end_time && (
                                                <div className="flex items-center gap-1.5 mt-3 text-slate-500 text-xs font-bold">
                                                    <Clock size={11} />
                                                    <span className="uppercase tracking-widest">
                                                        Voting closes: {new Date(liveCampaign.end_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/social-campaigns/${liveCampaign.slug}`)}
                                        className="shrink-0 flex items-center gap-2 bg-gameOrange text-white px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-orange-500 transition-all shadow-[0_4px_20px_rgba(255,107,0,0.3)] hover:shadow-[0_4px_30px_rgba(255,107,0,0.5)] hover:scale-105 active:scale-95"
                                    >
                                        Cast Your Vote <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
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

