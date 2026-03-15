import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CAMPAIGNS_DATA, SocialCampaign } from '../services/campaignData';
import { ArrowLeft, Megaphone, CheckCircle2, ChevronRight, BarChart3, AlertTriangle } from 'lucide-react';

const SocialCampaignDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<SocialCampaign | null>(null);
    const [userVote, setUserVote] = useState<string | null>(null);
    const [ownSolution, setOwnSolution] = useState('');
    const [hasVoted, setHasVoted] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        const found = CAMPAIGNS_DATA.find(c => c.id === id);
        if (found) {
            setCampaign(found);
            document.title = `${found.title} | Rajneeti Campaigns`;
            // Check local storage
            const storedVote = localStorage.getItem(`rajneeti_vote_${id}`);
            if (storedVote) {
                setHasVoted(true);
                setUserVote(storedVote);
            }
        } else {
            navigate('/social-campaigns');
        }
    }, [id, navigate]);

    if (!campaign) return <div className="min-h-screen bg-black" />;

    const isLive = campaign.status === 'live';

    const handleVoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userVote) return;
        localStorage.setItem(`rajneeti_vote_${campaign.id}`, userVote);
        if (userVote === 'own' && ownSolution.trim()) {
            localStorage.setItem(`rajneeti_own_solution_${campaign.id}`, ownSolution);
        }
        setHasVoted(true);
    };

    const formatWinner = (style: string) => {
        switch (style) {
            case 'modi': return 'Modi-style Approach';
            case 'rahul': return 'Rahul-style Approach';
            default: return 'Alternative Solution';
        }
    };

    return (
        <div className="min-h-[100dvh] bg-black text-slate-200 font-sans flex flex-col md:pt-4 overflow-x-hidden pb-20">
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-indigo-900/40 to-transparent pointer-events-none z-0"></div>
            
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 pt-16 md:pt-24 relative z-10">
                <button 
                    onClick={() => navigate('/social-campaigns')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={16} /> Back to Campaigns
                </button>

                {/* Header & Problem Block */}
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        {isLive ? (
                            <span className="bg-red-600/20 text-red-500 border border-red-500/50 text-xs uppercase tracking-widest font-black px-3 py-1.5 rounded flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> LIVE CAMPAIGN
                            </span>
                        ) : (
                            <span className="bg-slate-800 text-slate-400 border border-slate-700 text-xs uppercase tracking-widest font-black px-3 py-1.5 rounded flex items-center gap-2">
                                <CheckCircle2 size={14} /> CLOSED
                            </span>
                        )}
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider hidden sm:block">
                            {new Date(campaign.startDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-rajdhani uppercase text-white leading-tight mb-6">
                        {campaign.title}
                    </h1>
                    <p className="text-indigo-300/80 text-lg md:text-xl font-serif italic mb-8 border-l-4 border-indigo-500/50 pl-4">
                        {campaign.metaDescription}
                    </p>

                    <div className="bg-slate-900/80 border border-slate-700 p-6 md:p-8 rounded-xl backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-gameOrange font-black uppercase tracking-widest text-sm mb-4">
                            <AlertTriangle size={18} /> The Current Situation
                        </div>
                        <ul className="space-y-3">
                            {campaign.problemBullets.map((bullet, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <ChevronRight size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-300 normal-case leading-relaxed">{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </header>

                {/* Three-Column Leader Comparison */}
                <div className="mb-16">
                    <h2 className="text-2xl font-black font-cinzel text-center mb-8 uppercase tracking-widest text-white border-b border-white/10 pb-4">
                        Strategic Approaches
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {campaign.approaches.map((approach) => (
                            <div key={approach.id} className="bg-slate-900/50 border border-white/10 rounded-xl p-6 md:p-8 flex flex-col transition-all hover:bg-slate-800/80 hover:border-white/20">
                                <h3 className="text-white text-xl font-bold font-rajdhani uppercase mb-1">{approach.columnTitle}</h3>
                                {approach.style !== 'modi' && (
                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-400/80 mb-6 inline-block bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        Hypothetical Analysis
                                    </span>
                                )}
                                {approach.style === 'modi' && (
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400/80 mb-6 inline-block bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        Current Methodology
                                    </span>
                                )}
                                
                                <ul className="space-y-4 flex-1">
                                    {approach.bullets.map((bullet, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm md:text-base text-slate-300 normal-case leading-relaxed">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-2 shrink-0"></div>
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status/Voting/Results Area */}
                <div className="mb-16 bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
                    
                    {!isLive ? (
                        /* CLOSED RESULTS */
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6 justify-center">
                                <BarChart3 size={24} className="text-indigo-400" />
                                <h2 className="text-2xl font-black font-rajdhani uppercase text-white tracking-widest">
                                    Final Campaign Results
                                </h2>
                            </div>
                            
                            {campaign.results && (
                                <div className="max-w-3xl mx-auto">
                                    <div className="text-center mb-8">
                                        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Winning Approach</div>
                                        <div className="text-3xl font-black text-emerald-400 uppercase tracking-tight">
                                            {formatWinner(campaign.results.winnerStyle)} ({campaign.results.votePercentages[campaign.results.winnerStyle]}%)
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 mb-8">
                                        {Object.entries(campaign.results.votePercentages).map(([style, pct]) => (
                                            <div key={style} className="w-full">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-1">
                                                    <span className="text-white">{formatWinner(style)}</span>
                                                    <span className="text-indigo-300">{pct}%</span>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                                                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-black/50 border border-white/5 p-6 rounded-lg">
                                        <h3 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">Strategic Analysis</h3>
                                        <p className="text-slate-300 text-sm md:text-base leading-relaxed normal-case italic">
                                            "{campaign.results.analysis}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* LIVE VOTING */
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-2xl font-black font-rajdhani text-center mb-2 uppercase text-white">
                                Have Your Say
                            </h2>
                            <p className="text-slate-400 text-center text-sm mb-8 normal-case">
                                For the next {Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days, this Social Campaign is live. Read the two approaches above and vote for the solution you would execute for India.
                            </p>

                            {hasVoted ? (
                                <div className="text-center p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                    <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-black text-white uppercase mb-2">Vote Recorded</h3>
                                    <p className="text-emerald-400/80 text-sm">Your vote for {userVote === 'own' ? 'an Alternative Solution' : `the ${userVote}-style approach`} has been securely stored. Results will be published when the campaign closes.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleVoteSubmit} className="space-y-4">
                                    {campaign.approaches.map(app => (
                                        <label key={app.id} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${userVote === app.style ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-black/40 border-white/10 hover:border-white/30'}`}>
                                            <input type="radio" name="vote" value={app.style} checked={userVote === app.style} onChange={(e) => setUserVote(e.target.value)} className="w-5 h-5 text-indigo-600 bg-slate-800 border-slate-600 accent-indigo-500" />
                                            <span className="ml-4 text-white font-bold uppercase tracking-wider text-sm md:text-base">{app.style.charAt(0).toUpperCase() + app.style.slice(1)}-style Approach</span>
                                        </label>
                                    ))}
                                    <label className={`flex flex-col p-4 border rounded-xl transition-all ${userVote === 'own' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-black/40 border-white/10 hover:border-white/30'}`}>
                                        <div className="flex items-center cursor-pointer mb-2">
                                            <input type="radio" name="vote" value="own" checked={userVote === 'own'} onChange={(e) => setUserVote(e.target.value)} className="w-5 h-5 text-indigo-600 bg-slate-800 border-slate-600 accent-indigo-500" />
                                            <span className="ml-4 text-white font-bold uppercase tracking-wider text-sm md:text-base">None of these / My own solution</span>
                                        </div>
                                        {userVote === 'own' && (
                                            <textarea 
                                                className="w-full mt-3 bg-black/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 normal-case outline-none focus:border-indigo-500 min-h-[80px]" 
                                                placeholder="Briefly describe your chosen solution..."
                                                value={ownSolution}
                                                onChange={(e) => setOwnSolution(e.target.value)}
                                                required
                                            />
                                        )}
                                    </label>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={!userVote}
                                        className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transition-colors border border-red-500"
                                    >
                                        Cast Vote
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* Global Rajneeti CTA */}
                <div className="bg-lokBlue-900 border border-lokBlue-800 rounded-2xl p-8 md:p-12 text-center flex flex-col items-center">
                    <Megaphone size={32} className="text-gameOrange mb-4" />
                    <h2 className="text-2xl md:text-4xl font-black font-cinzel uppercase text-white mb-4">
                        Think you can do better?
                    </h2>
                    <p className="text-slate-400 max-w-2xl text-sm md:text-base normal-case mb-8 leading-relaxed">
                        Want to play this crisis as Prime Minister? Rajneeti lets you test your choices, build state-level alliances, and battle for the Lok Sabha in a full political strategy game.
                    </p>
                    <a
                        href="https://play.google.com/store/apps/details?id=com.rajneeti"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-white text-black hover:bg-slate-200 px-6 py-3 md:px-8 md:py-4 rounded-full transition-all hover:scale-105 group font-bold tracking-widest uppercase text-sm md:text-base shadow-xl"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a2.203 2.203 0 01-.61-1.511V3.325c0-.573.22-1.092.61-1.511zM14.502 12.71l2.583 2.583-9.524 5.49a2.189 2.189 0 01-1.353.284l8.294-8.357zM17.839 12.427L20.8 10.71c.73-.418.73-1.482 0-1.9L17.84 7.093l-3.34 3.341 3.339 1.993zM14.502 11.29l-8.293-8.357a2.189 2.189 0 011.353.284l9.524 5.49-2.584 2.583z" />
                        </svg>
                        Play Rajneeti on Play Store
                    </a>
                </div>

            </main>
        </div>
    );
};

export default SocialCampaignDetail;
