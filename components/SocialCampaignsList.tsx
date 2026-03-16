import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ArrowRight, CheckCircle2, Vote, Clock, Trophy, History } from 'lucide-react';
import { dynamicCampaignService, SocialCampaign } from '../services/dynamicCampaignService';

const SocialCampaignsList: React.FC = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<SocialCampaign[]>([]);
    const [currentExperience, setCurrentExperience] = useState<{ type: string, data: any } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Campaign Hub | Rajneeti";
        window.scrollTo(0, 0);

        const fetchData = async () => {
            const [archive, active] = await Promise.all([
                dynamicCampaignService.getArchive(),
                dynamicCampaignService.getActiveExperience()
            ]);
            setCampaigns(archive);
            setCurrentExperience(active);
            setLoading(false);
        };

        fetchData();
    }, []);

    const formatWinner = (style: string) => {
        switch (style) {
            case 'modi': return 'Modi-style Approach';
            case 'rahul': return 'Rahul-style Approach';
            default: return 'Alternative Solution';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 bg-black flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-rajdhani text-sm tracking-widest uppercase">Syncing with Rajneeti HQ...</p>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-black text-slate-200 font-sans flex flex-col md:pt-4 overflow-x-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(60,20,100,0.3)_0%,rgba(0,0,0,1)_70%)] pointer-events-none z-0"></div>
            
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-20 relative z-10 top-20">
                <header className="mb-16 text-center">
                    <div className="inline-flex items-center justify-center gap-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-full mb-6">
                        <Megaphone size={16} />
                        <span className="text-[10px] font-black tracking-widest uppercase">Rajneeti Social Voice</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black font-cinzel text-white uppercase tracking-tight mb-4">
                        Campaign <span className="text-indigo-500">Hub</span>
                    </h1>
                    <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed normal-case">
                        The definitive arena for Indian political strategy. Compare real-world crises, evaluate leader responses, and cast your vote on the nation's direction.
                    </p>
                </header>

                {/* FEATURED EXPERIENCE (LIVE OR TOPIC VOTING) */}
                {currentExperience && currentExperience.type !== 'buffer' && (
                    <section className="mb-20">
                        <div className="relative group cursor-pointer" onClick={() => navigate(currentExperience.type === 'campaign' ? `/social-campaigns/${currentExperience.data.slug}` : `/social-campaigns`)}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 md:p-12 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8">
                                    {currentExperience.type === 'campaign' ? (
                                        <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/30 px-4 py-1.5 rounded-full">
                                            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live Campaign</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-indigo-600/10 border border-indigo-600/30 px-4 py-1.5 rounded-full">
                                            <Vote className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Topic Selection Open</span>
                                        </div>
                                    )}
                                </div>

                                <div className="max-w-2xl relative z-10">
                                    <h2 className="text-4xl md:text-5xl font-black font-rajdhani text-white uppercase leading-tight mb-6">
                                        {currentExperience.type === 'campaign' ? currentExperience.data.title : "Next Campaign: Your Vote Matters"}
                                    </h2>
                                    <p className="text-slate-400 text-lg mb-8 line-clamp-2">
                                        {currentExperience.type === 'campaign' ? currentExperience.data.issue_summary : "Decide which national issue our leaders should address next. Inflation, National Security, or Health?"}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button className="bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:text-white transition-all shadow-xl flex items-center gap-2">
                                            {currentExperience.type === 'campaign' ? 'Enter Debate' : 'Vote on Topics'} <ArrowRight size={16} />
                                        </button>
                                        <div className="flex items-center gap-3 px-6 py-4 rounded-full bg-white/5 border border-white/5 text-slate-300">
                                            <Clock size={16} className="text-indigo-400" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Closes in 48 Hours</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Background Element */}
                                <div className="absolute bottom-[-10%] right-[-5%] text-[15rem] font-black font-cinzel text-white/[0.03] pointer-events-none select-none">
                                    RT
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ARCHIVE LIST */}
                <section>
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3 text-white">
                            <History className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-2xl font-black font-rajdhani uppercase tracking-widest">Past Campaigns</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {campaigns.map(campaign => (
                            <div 
                                key={campaign.id}
                                className="group bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 md:p-8 transition-all hover:-translate-y-1 cursor-pointer relative overflow-hidden"
                                onClick={() => navigate(`/social-campaigns/${campaign.slug}`)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{campaign.issue_category}</span>
                                    <CheckCircle2 size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <h4 className="text-xl font-bold font-rajdhani text-white uppercase mb-3 line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
                                    {campaign.title}
                                </h4>
                                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={14} className="text-indigo-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Victor: <span className="text-white italic">{formatWinner(campaign.winner_leader || 'modi')}</span></span>
                                    </div>
                                    <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        View Results <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SocialCampaignsList;
