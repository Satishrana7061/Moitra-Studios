import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CAMPAIGNS_DATA } from '../services/campaignData';
import { Megaphone, ArrowRight, CheckCircle2 } from 'lucide-react';

const SocialCampaignsList: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Social Campaigns | Rajneeti";
        window.scrollTo(0, 0);
    }, []);

    const formatWinner = (style: string) => {
        switch (style) {
            case 'nehru': return 'Nehru-style Approach';
            case 'modi': return 'Modi-style Approach';
            case 'rahul': return 'Rahul-style Approach';
            default: return 'Alternative Solution';
        }
    };

    return (
        <div className="min-h-[100dvh] bg-black text-slate-200 font-sans flex flex-col md:pt-4 overflow-x-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,20,50,0.4)_0%,rgba(0,0,0,0.9)_100%)] pointer-events-none z-0"></div>
            
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-20 relative z-10 top-20">
                <header className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center gap-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-full mb-6">
                        <Megaphone size={18} />
                        <span className="text-sm font-bold tracking-widest uppercase">Rajneeti Social Campaigns</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-cinzel text-white uppercase tracking-tight mb-4 drop-shadow-md">
                        Voice of the People
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed normal-case">
                        Review how different political leaders handle India's biggest crises. Analyze their specific approaches based on history and stated policies, and vote on the solution you think is best for the nation.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {CAMPAIGNS_DATA.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(campaign => {
                        const isLive = campaign.status === 'live';
                        return (
                            <div 
                                key={campaign.id}
                                className="group bg-slate-900 border border-white/10 hover:border-indigo-500/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col md:flex-row"
                                onClick={() => navigate(`/social-campaigns/${campaign.id}`)}
                            >
                                <div className={`w-2 md:w-3 shrink-0 ${isLive ? 'bg-red-600 animate-pulse' : 'bg-slate-700'}`}></div>
                                <div className="p-6 md:p-8 flex-1 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            {isLive ? (
                                                <span className="bg-red-600/20 text-red-500 border border-red-500/50 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded">
                                                    Live Now
                                                </span>
                                            ) : (
                                                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Closed
                                                </span>
                                            )}
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                {new Date(campaign.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(campaign.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-black text-white font-rajdhani uppercase mb-2 group-hover:text-indigo-400 transition-colors">
                                            {campaign.title}
                                        </h2>
                                        <p className="text-slate-400 text-sm md:text-base normal-case leading-relaxed line-clamp-2">
                                            {campaign.metaDescription}
                                        </p>
                                    </div>

                                    <div className="shrink-0 flex flex-col items-start md:items-end md:w-48 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                                        {!isLive && campaign.results ? (
                                            <div className="mb-4 w-full">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Winning Approach</div>
                                                <div className="text-sm font-bold text-emerald-400 normal-case">{formatWinner(campaign.results.winnerStyle)}</div>
                                            </div>
                                        ) : (
                                            <div className="mb-4 w-full">
                                                <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div> Voting Open
                                                </div>
                                                <div className="text-sm font-bold text-white normal-case">Make your choice</div>
                                            </div>
                                        )}
                                        <button className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider group-hover:text-indigo-300 transition-colors">
                                            {isLive ? 'Read & Vote' : 'View Full Results'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default SocialCampaignsList;
