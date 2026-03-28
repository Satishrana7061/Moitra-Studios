import React, { useState } from 'react';
import { Vote, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { TopicRound, TopicOption, dynamicCampaignService } from '../services/dynamicCampaignService';
import CountdownTimer from './CountdownTimer';

interface TopicVotingProps {
    round: TopicRound;
    onVoteComplete: () => void;
}

const TopicVoting: React.FC<TopicVotingProps> = ({ round, onVoteComplete }) => {
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [voted, setVoted] = useState(false);

    const handleTopicVote = async (topicId: string) => {
        setLoading(true);
        const success = await dynamicCampaignService.voteForTopic(topicId);
        if (success) {
            setVoted(true);
            setTimeout(onVoteComplete, 2000);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gameOrange/10 border border-gameOrange/30 text-gameOrange text-[10px] font-black uppercase tracking-widest mb-6">
                    <Vote className="w-3 h-3" />
                    <span>NEXT CAMPAIGN SELECTION</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-cinzel font-black text-white mb-6 leading-tight">
                    What Issue Should We <span className="text-gameOrange">Tackle Next?</span>
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
                    The previous campaign has concluded. Help us choose the next major national crisis for our leaders to debate.
                </p>
                
                <div className="flex justify-center mb-12">
                    <CountdownTimer targetDate={round.end_time} label="SELECTION WINDOW CLOSES IN" />
                </div>
            </div>

            {voted ? (
                <div className="bg-slate-900/40 border border-green-500/20 rounded-3xl p-12 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Vote className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 uppercase">Topic Vote Received!</h2>
                    <p className="text-slate-400">Thank you for participating. The most voted topic will go live shortly.</p>
                </div>
            ) : new Date(round.end_time || '') < new Date() ? (
                <div className="bg-slate-900/40 border border-slate-500/20 rounded-3xl p-12 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 uppercase">Selection Closed</h2>
                    <p className="text-slate-400">The voting window has closed. The next campaign is being generated.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {round.options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedTopic(option.id)}
                            className={`text-left p-6 rounded-2xl border transition-all group relative overflow-hidden ${
                                selectedTopic === option.id
                                ? 'bg-gameOrange/10 border-gameOrange shadow-[0_0_20px_rgba(255,107,0,0.1)]'
                                : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                    selectedTopic === option.id ? 'bg-gameOrange text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                    {option.category}
                                </span>
                                <Info className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                            </div>
                            <h3 className="text-white text-xl font-bold font-rajdhani mb-2 uppercase tracking-wide group-hover:text-gameOrange transition-colors">
                                {option.issue_name}
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                {option.summary}
                            </p>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                                        selectedTopic === option.id ? 'border-gameOrange bg-gameOrange text-white' : 'border-white/10 text-transparent'
                                    }`}>
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${
                                        selectedTopic === option.id ? 'text-gameOrange' : 'text-slate-500'
                                    }`}>Select Topic</span>
                                </div>
                                {selectedTopic === option.id && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTopicVote(option.id);
                                        }}
                                        disabled={loading}
                                        className="bg-gameOrange text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all animate-bounce-subtle"
                                    >
                                        {loading ? 'Voting...' : 'Cast Vote'}
                                    </button>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-12 flex items-center justify-center gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 max-w-xl mx-auto">
                <AlertCircle className="w-5 h-5 text-blue-400" />
                <p className="text-blue-400/80 text-xs font-medium">
                    The next campaign will be automatically generated based on the highest voted topic once the timer expires.
                </p>
            </div>
        </div>
    );
};

export default TopicVoting;
