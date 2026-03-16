import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Award, Users, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';
import { dynamicCampaignService, SocialCampaign } from '../services/dynamicCampaignService';
import CountdownTimer from './CountdownTimer';
import SocialCampaignSidebar from './SocialCampaignSidebar';
import TopicVoting from './TopicVoting';

const SocialCampaignDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<SocialCampaign | null>(null);
    const [allCampaigns, setAllCampaigns] = useState<SocialCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [voteLoading, setVoteLoading] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [votedStyle, setVotedStyle] = useState<string | null>(null);
    const [ownSolution, setOwnSolution] = useState('');
    const [activeExperience, setActiveExperience] = useState<{ type: string, data: any } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const archive = await dynamicCampaignService.getArchive();
            setAllCampaigns(archive);

             if (id) {
                const data = await dynamicCampaignService.getCampaignBySlug(id);
                setCampaign(data);
                
                // Check if already voted for this campaign in this session/device
                const localVote = localStorage.getItem(`vote_${id}`);
                if (localVote) {
                    setHasVoted(true);
                    setVotedStyle(localVote);
                }
            } else {
                // Fetch the current live experience if no ID provided
                const live = await dynamicCampaignService.getActiveExperience();
                setActiveExperience(live);
                if (live.type === 'campaign') {
                    setCampaign(live.data);
                    const localVote = localStorage.getItem(`vote_${live.data.slug}`);
                    if (localVote) {
                        setHasVoted(true);
                        setVotedStyle(localVote);
                    }
                }
            }
            setLoading(false);
        };

        fetchData();
        // Reset vote status when campaign changes
        setHasVoted(false);
        setVotedStyle(null);
        setOwnSolution('');
    }, [id]);

    const handleVote = async (style: string) => {
        if (!campaign || hasVoted) return;
        
        setVoteLoading(true);
        const success = await dynamicCampaignService.castVote(campaign.id, style, style === 'own' ? ownSolution : undefined);
        
        if (success) {
            localStorage.setItem(`vote_${campaign.slug}`, style);
            setHasVoted(true);
            setVotedStyle(style);
        }
        setVoteLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 bg-slate-950 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-rajdhani animate-pulse">Loading Political Situation...</p>
            </div>
        );
    }

     if (!campaign) {
        if (activeExperience?.type === 'topic_round') {
            return (
                <div className="min-h-screen pt-24 pb-12 bg-slate-950">
                    <TopicVoting round={activeExperience.data} onVoteComplete={() => navigate('/social-campaigns')} />
                </div>
            );
        }

        return (
            <div className="min-h-screen pt-24 pb-12 bg-slate-950 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-16 h-16 text-slate-700 mb-6" />
                <h1 className="text-3xl font-cinzel font-bold text-white mb-2">Campaign Not Found</h1>
                <p className="text-slate-400 mb-8">This policy debate may have been moved or archived.</p>
                <button 
                    onClick={() => navigate('/social-campaigns')}
                    className="bg-gameOrange text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-orange-600 transition-all shadow-[0_4px_15px_rgba(255,107,0,0.3)]"
                >
                    Back to Hub
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* LEFT SIDEBAR - Persistent Archive */}
                    <div className="hidden lg:block lg:col-span-1 h-[calc(100vh-160px)] sticky top-32">
                        <SocialCampaignSidebar 
                            campaigns={allCampaigns} 
                            onSelectCampaign={(slug) => navigate(`/social-campaigns/${slug}`)} 
                            activeSlug={campaign.slug}
                        />
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="lg:col-span-3 space-y-8">
                        
                        {/* Header Banner */}
                        <div className="relative p-8 md:p-12 rounded-3xl overflow-hidden border border-white/5 bg-slate-900/40">
                            <div className="absolute top-0 right-0 p-6">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    campaign.status === 'live' 
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse' 
                                    : 'bg-green-500/10 border-green-500/30 text-green-500'
                                }`}>
                                    {campaign.status}
                                </span>
                            </div>

                            <div className="max-w-2xl">
                                <div className="flex items-center gap-2 mb-4 text-gameOrange font-black font-rajdhani tracking-[0.2em] uppercase text-sm">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{campaign.category} Campaign</span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-cinzel font-black text-white leading-tight mb-4">
                                    {campaign.title}
                                </h1>
                                <p className="text-slate-400 text-lg font-medium italic mb-6">
                                    {campaign.subtitle}
                                </p>
                                
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                    <p className="text-slate-300 text-sm leading-relaxed mb-4">{campaign.issue_summary}</p>
                                    <div className="space-y-2">
                                        {campaign.problem_bullets.map((bullet, idx) => (
                                            <div key={idx} className="flex gap-3 text-xs text-slate-400">
                                                <div className="w-1.5 h-1.5 bg-gameOrange rounded-full mt-1.5 shrink-0" />
                                                <p>{bullet}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Center Timer Area */}
                            {campaign.status === 'live' && (
                                <div className="mt-8 flex justify-center py-6 border-t border-white/5">
                                    <CountdownTimer targetDate={campaign.end_time} label="VOTING CLOSES IN" />
                                </div>
                            )}
                        </div>

                        {/* Leader Approaches Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {campaign.approaches?.map((approach) => (
                                <div key={approach.id} className={`p-8 rounded-3xl border transition-all ${
                                    campaign.status === 'closed' && approach.is_winner
                                    ? 'bg-blue-600/10 border-blue-500/40 scale-[1.02] shadow-[0_10px_30px_rgba(37,99,235,0.1)]'
                                    : 'bg-slate-900/40 border-white/5'
                                }`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-white text-2xl font-bold font-rajdhani uppercase tracking-wide">{approach.column_title}</h3>
                                        {campaign.status === 'closed' && approach.is_winner && (
                                            <Award className="w-8 h-8 text-blue-500 animate-bounce" />
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {approach.bullets.map((point, i) => (
                                            <div key={i} className="flex gap-4">
                                                <span className="text-blue-500 font-bold font-mono py-0.5">0{i+1}.</span>
                                                <p className="text-slate-300 text-sm leading-relaxed">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RESULTS OR VOTING SECTION */}
                        {campaign.status === 'closed' ? (
                            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-10 text-center">
                                <h2 className="text-4xl font-cinzel font-bold text-white mb-6">Final Analysis</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 max-w-3xl mx-auto">
                                    {Object.entries(campaign.vote_percentages || {}).map(([key, value]) => (
                                        <div key={key} className="flex flex-col items-center">
                                            <div className="relative w-24 h-24 mb-4">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                                                    <circle 
                                                        cx="48" cy="48" r="40" 
                                                        fill="transparent" 
                                                        stroke={key === campaign.winner_style ? "#2563eb" : "#475569"} 
                                                        strokeWidth="8"
                                                        strokeDasharray={2 * Math.PI * 40}
                                                        strokeDashoffset={2 * Math.PI * 40 * (1 - (value as number) / 100)}
                                                        className="transition-all duration-1000"
                                                    />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xl">{value}%</span>
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{key === 'own' ? 'Other Solution' : `${key}-style`}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="max-w-2xl mx-auto p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                    <p className="text-slate-300 italic text-lg mb-4">"{campaign.result_analysis}"</p>
                                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-bold font-rajdhani">
                                        <Users className="w-4 h-4" />
                                        <span>TOTAL VOTES CAST: {campaign.total_votes?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-10">
                                <h2 className="text-3xl font-cinzel font-bold text-white text-center mb-8">Cast Your Vote</h2>
                                {!hasVoted ? (
                                    <div className="max-w-md mx-auto space-y-4">
                                        {campaign.approaches?.map((app) => (
                                            <button 
                                                key={app.id}
                                                onClick={() => handleVote(app.style)}
                                                disabled={voteLoading}
                                                className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 hover:border-gameOrange/50 transition-all flex items-center justify-between group"
                                            >
                                                <span className="font-bold text-lg">{app.leader_name} Approach</span>
                                                <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                                            </button>
                                        ))}
                                        <div className="pt-4 border-t border-white/5">
                                            <textarea 
                                                placeholder="None of these? Submit your own solution..."
                                                className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-sm text-slate-300 mb-4 focus:border-gameOrange/30 focus:outline-none transition-all"
                                                rows={3}
                                                value={ownSolution}
                                                onChange={(e) => setOwnSolution(e.target.value)}
                                            />
                                            <button 
                                                onClick={() => handleVote('own')}
                                                disabled={voteLoading || !ownSolution.trim()}
                                                className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 transition-all font-bold uppercase tracking-widest text-xs"
                                            >
                                                Submit Alternative Solution
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 animate-fade-in">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Award className="w-10 h-10 text-green-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2 uppercase">Vote Recorded!</h3>
                                        <p className="text-slate-400 max-w-xs mx-auto mb-6">
                                            You selected the <span className="text-white font-bold">{votedStyle}-style</span> approach. Results will be calculated when the timer hits zero.
                                        </p>
                                        <button className="flex items-center gap-2 text-slate-500 hover:text-white mx-auto text-xs font-bold transition-colors">
                                            <Share2 className="w-4 h-4" />
                                            SHARE DEBATE
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GAME CTA SECTION */}
                        <div className="relative rounded-3xl p-10 overflow-hidden group shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-gameOrange/30 to-blue-900/30 group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-[url('/grid.png')] opacity-10" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                <div className="flex-1 space-y-6">
                                    <h2 className="text-4xl font-cinzel font-black text-white leading-tight">
                                        PLAY THIS SCENARIO IN <span className="text-gameOrange">RAJNEETI</span>
                                    </h2>
                                    <p className="text-white/80 text-lg leading-relaxed">
                                        Don't just vote—lead! Take command of India's fate, manage the budget, negotiated trade deals, and see if your approach can withstand the international pressure.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button className="bg-white text-slate-900 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                                            Download on Play Store
                                        </button>
                                        <button className="border border-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                                            Watch Trailer
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full md:w-64 aspect-square bg-slate-900/80 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner overflow-hidden relative">
                                    <img src="/Rajneeti-Game-Main-Screen.png" alt="Game Screenshot" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                                    <span className="absolute bottom-4 left-4 text-white font-bold font-rajdhani text-[10px] tracking-widest uppercase bg-gameOrange px-2 py-1 rounded">Projected Simulator</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialCampaignDetail;
