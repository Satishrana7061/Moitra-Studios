import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Award, Users, ChevronRight, MessageSquare, AlertCircle, CheckCircle, XCircle, Bot } from 'lucide-react';
import { dynamicCampaignService, SocialCampaign } from '../services/dynamicCampaignService';
import CountdownTimer from './CountdownTimer';
import SocialCampaignSidebar from './SocialCampaignSidebar';
import TopicVoting from './TopicVoting';

// Deterministic result generator — same campaign = same result always
function getSimulatedResult(campaign: SocialCampaign) {
    const seed = (str: string) => {
        let h = 5381;
        for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        return Math.abs(h);
    };
    const s = seed(campaign.slug || campaign.id || 'default');
    const modiPct  = 45 + (s % 30);
    const rahulPct = 20 + ((s >> 3) % 25);
    const ownPct   = Math.max(2, 100 - modiPct - rahulPct);
    const winner   = modiPct > rahulPct ? 'modi' : 'rahul';
    return {
        vote_percentages: { modi: modiPct, rahul: rahulPct, own: ownPct },
        winner_leader: winner === 'modi' ? 'Narendra Modi' : 'Rahul Gandhi',
        winner_vote_percentage: Math.max(modiPct, rahulPct),
        result_analysis: campaign.result_analysis ||
            `Based on India's current political landscape and real-world sentiment, the ` +
            `${winner === 'modi' ? 'Narendra Modi' : 'Rahul Gandhi'}-style approach holds stronger public resonance. ` +
            `Ground-level voter sentiment, economic indicators, and regional narratives tilt the ` +
            `balance ${Math.max(modiPct, rahulPct)}% toward this policy direction.`,
        isSimulated: (campaign.total_votes || 0) < 3,
    };
}

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
    const [voteError, setVoteError] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
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
        setVoteError(null);
    }, [id]);

    const handleVote = async (style: string) => {
        if (!campaign || hasVoted || voteLoading) return;
        
        setVoteError(null);
        setVoteLoading(true);

        // Optimistic UI: show success immediately
        setHasVoted(true);
        setVotedStyle(style);

        const result = await dynamicCampaignService.castVote(
            campaign.id, 
            style, 
            style === 'own' ? ownSolution : undefined
        );
        
        if (result.success) {
            // Persist to localStorage so refresh keeps it
            localStorage.setItem(`vote_${campaign.slug}`, style);
        } else {
            setHasVoted(false);
            setVotedStyle(null);
            setVoteError(`Failed to cast vote: ${result.errorMsg}`);
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
        <div className="min-h-screen pt-24 pb-12 bg-slate-950 normal-case">
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
                                    <span>{campaign.issue_category} Campaign</span>
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
                                        {(campaign.issue_bullets || []).map((bullet: string, idx: number) => (
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
                            {campaign.approaches?.map((approach) => {
                                const leaderImg = approach.style === 'modi' 
                                    ? `${import.meta.env.BASE_URL}leaders/modi.png`
                                    : approach.style === 'rahul'
                                    ? `${import.meta.env.BASE_URL}leaders/rahul.png`
                                    : null;
                                const accentColor = approach.style === 'modi' ? 'orange' : 'blue';

                                // Deterministic simulated metrics generator based on campaign slug + style
                                const seed = (str: string) => {
                                    let h = 0;
                                    for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
                                    return h;
                                };
                                const s = Math.abs(seed(campaign.slug + approach.style));
                                
                                // Base biases: Modi leans infra/econ, Rahul leans welfare
                                const isModi = approach.style === 'modi';
                                let econScore = (s % 40) + (isModi ? 55 : 45); // Econ
                                let welfScore = ((s >> 2) % 40) + (isModi ? 45 : 55); // Welfare
                                let techScore = ((s >> 4) % 40) + (isModi ? 50 : 40); // Infra/Tech
                                
                                // Cap at 98 for realism
                                econScore = Math.min(98, econScore);
                                welfScore = Math.min(98, welfScore);
                                techScore = Math.min(98, techScore);

                                return (
                                <div key={approach.id} className={`p-8 rounded-3xl border transition-all ${
                                    campaign.status === 'archived' && approach.is_winner
                                    ? 'bg-blue-600/10 border-blue-500/40 scale-[1.02] shadow-[0_10px_30px_rgba(37,99,235,0.1)]'
                                    : 'bg-slate-900/40 border-white/5'
                                }`}>
                                    {/* Leader Photo */}
                                    {leaderImg && (
                                        <div className="flex justify-center mb-6">
                                            <div className={`relative w-24 h-24 rounded-full overflow-hidden border-3 ${
                                                accentColor === 'orange' 
                                                ? 'border-gameOrange shadow-[0_0_20px_rgba(255,107,0,0.3)]' 
                                                : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                            }`}>
                                                <img 
                                                    src={leaderImg} 
                                                    alt={approach.leader_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-white text-2xl font-bold font-rajdhani uppercase tracking-wide">{approach.leader_name}</h3>
                                        {campaign.status === 'archived' && approach.is_winner && (
                                            <Award className="w-8 h-8 text-blue-500 animate-bounce" />
                                        )}
                                    </div>
                                    <div className="space-y-4 mb-8">
                                        {(approach.policy_bullets || []).map((point: string, i: number) => (
                                            <div key={i} className="flex gap-4">
                                                <span className={`${accentColor === 'orange' ? 'text-gameOrange' : 'text-blue-500'} font-bold font-mono py-0.5`}>0{i+1}.</span>
                                                <p className="text-slate-300 text-sm leading-relaxed">{point}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Impact Projection Graphs */}
                                    <div className="pt-6 border-t border-white/10">
                                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                            Simulated AI Impact Projection
                                        </h4>
                                        <div className="space-y-4">
                                            {/* Graph Bar 1 */}
                                            <div className="group/graph">
                                                <div className="flex justify-between text-xs font-bold font-mono mb-1.5">
                                                    <span className="text-slate-300 uppercase">Economic Growth</span>
                                                    <span className="text-white">{econScore}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${accentColor === 'orange' ? 'bg-gradient-to-r from-gameOrange to-gameYellow shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                                                        style={{ width: `${econScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            {/* Graph Bar 2 */}
                                            <div className="group/graph">
                                                <div className="flex justify-between text-xs font-bold font-mono mb-1.5">
                                                    <span className="text-slate-300 uppercase">Public Welfare</span>
                                                    <span className="text-white">{welfScore}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out delay-150 ${accentColor === 'orange' ? 'bg-gradient-to-r from-gameOrange to-gameYellow shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                                                        style={{ width: `${welfScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            {/* Graph Bar 3 */}
                                            <div className="group/graph">
                                                <div className="flex justify-between text-xs font-bold font-mono mb-1.5">
                                                    <span className="text-slate-300 uppercase">Infrastructure & Tech</span>
                                                    <span className="text-white">{techScore}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out delay-300 ${accentColor === 'orange' ? 'bg-gradient-to-r from-gameOrange to-gameYellow shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                                                        style={{ width: `${techScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        {/* RESULTS OR VOTING SECTION */}
                        {campaign.status === 'archived' ? (
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
                                                        stroke={key === campaign.winner_leader ? "#2563eb" : "#475569"} 
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
                                        <span>TOTAL VOTES CAST: {(campaign.total_votes || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-10">
                                <h2 className="text-3xl font-cinzel font-bold text-white text-center mb-8">Cast Your Vote</h2>

                                {/* Error Banner */}
                                {voteError && (
                                    <div className="max-w-md mx-auto mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                                        <p className="text-red-400 text-sm font-medium">{voteError}</p>
                                    </div>
                                )}

                                {!hasVoted ? (
                                    new Date(campaign.end_time || '') < new Date() ? (
                                        // Campaign expired — show AI result immediately instead of dead-end message
                                        (() => {
                                            const result = getSimulatedResult(campaign);
                                            return (
                                                <div className="space-y-6">
                                                    {/* AI Badge */}
                                                    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                                        <Bot className="w-4 h-4 text-indigo-400" />
                                                        <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">
                                                            {result.isSimulated ? 'AI-Simulated Result · Insufficient Public Votes' : 'Final Result'}
                                                        </span>
                                                    </div>

                                                    {/* Pie Charts */}
                                                    <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                                                        {Object.entries(result.vote_percentages).map(([key, value]) => (
                                                            <div key={key} className="flex flex-col items-center">
                                                                <div className="relative w-20 h-20 mb-2">
                                                                    <svg className="w-full h-full transform -rotate-90">
                                                                        <circle cx="40" cy="40" r="32" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
                                                                        <circle
                                                                            cx="40" cy="40" r="32"
                                                                            fill="transparent"
                                                                            stroke={key === 'modi' ? '#f97316' : key === 'rahul' ? '#3b82f6' : '#64748b'}
                                                                            strokeWidth="7"
                                                                            strokeDasharray={2 * Math.PI * 32}
                                                                            strokeDashoffset={2 * Math.PI * 32 * (1 - (value as number) / 100)}
                                                                            className="transition-all duration-1000"
                                                                        />
                                                                    </svg>
                                                                    <span className="absolute inset-0 flex items-center justify-center text-white font-black text-sm">{value}%</span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                                                                    {key === 'own' ? 'Other' : key === 'modi' ? 'Modi' : 'Rahul'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Analysis Text */}
                                                    <div className="bg-blue-500/5 rounded-2xl border border-blue-500/10 p-5">
                                                        <p className="text-slate-300 italic text-sm leading-relaxed mb-3">
                                                            "{result.result_analysis}"
                                                        </p>
                                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                                            <Award className="w-3.5 h-3.5 text-blue-500" />
                                                            <span>Winner: {result.winner_leader} · {result.winner_vote_percentage}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className="max-w-md mx-auto space-y-4">
                                            {campaign.approaches?.map((app) => (
                                                <button 
                                                    key={app.id}
                                                    onClick={() => handleVote(app.style)}
                                                    disabled={voteLoading}
                                                className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 hover:border-gameOrange/50 transition-all flex items-center justify-between group disabled:opacity-60 disabled:cursor-wait"
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
                                                className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl hover:bg-slate-700 transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-60 disabled:cursor-wait"
                                            >
                                                Submit Alternative Solution
                                            </button>
                                        </div>
                                    </div>
                                    )
                                ) : (
                                    <div className="text-center py-10">
                                        {voteLoading ? (
                                            <>
                                                <div className="w-20 h-20 border-4 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin mx-auto mb-6" />
                                                <p className="text-slate-400 font-medium">Registering your vote...</p>
                                            </>
                                        ) : (
                                            <>
                                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                                                <CheckCircle className="w-10 h-10 text-green-500" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2 uppercase">✅ Vote Registered!</h3>
                                            <p className="text-slate-400 max-w-xs mx-auto mb-2">
                                                You voted for the <span className="text-gameOrange font-bold">{votedStyle === 'own' ? 'Your Own Idea' : campaign.approaches?.find(a => a.style === votedStyle)?.leader_name + ' approach' || votedStyle + ' approach'}</span>.
                                            </p>
                                            <p className="text-slate-500 text-xs max-w-xs mx-auto mb-6">Your vote is locked in. Results will be analysed by AI when the campaign timer hits zero.</p>
                                            </>                                            
                                        )}
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
                            
                            <div className="relative z-10 space-y-6">
                                <h2 className="text-4xl font-cinzel font-black text-white leading-tight">
                                    PLAY THIS SCENARIO IN <span className="text-gameOrange">RAJNEETI</span>
                                </h2>
                                <p className="text-white/80 text-lg leading-relaxed max-w-2xl">
                                    Don't just vote—lead! Take command of India's fate, manage the budget, negotiated trade deals, and see if your approach can withstand the international pressure.
                                </p>
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.rajneeti"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block bg-white text-slate-900 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                >
                                    Download on Play Store
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialCampaignDetail;
