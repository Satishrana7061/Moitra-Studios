import React, { useState } from 'react';
import { Search, Filter, History, Award, ChevronRight } from 'lucide-react';
import { SocialCampaign } from '../services/dynamicCampaignService';

interface SocialCampaignSidebarProps {
    campaigns: SocialCampaign[];
    onSelectCampaign: (slug: string) => void;
    activeSlug?: string;
}

const CATEGORIES = [
    'All', 'Economy', 'Governance', 'Foreign Policy', 'Social Welfare', 'Environment', 'Technology', 'Security'
];

const SocialCampaignSidebar: React.FC<SocialCampaignSidebarProps> = ({ campaigns, onSelectCampaign, activeSlug }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col h-full bg-slate-950/40 border-r border-white/5 backdrop-blur-md">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-2 mb-6">
                    <History className="w-5 h-5 text-gameOrange" />
                    <h2 className="text-white font-rajdhani font-bold text-xl tracking-wider uppercase">Archive</h2>
                </div>

                {/* Search */}
                <div className="relative mb-4 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-gameOrange transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search issues..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gameOrange/50 focus:ring-1 focus:ring-gameOrange/20 transition-all"
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all ${
                                selectedCategory === cat 
                                ? 'bg-gameOrange text-white shadow-[0_0_10px_rgba(255,107,0,0.3)]' 
                                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredCampaigns.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-600 text-xs italic">No matching campaigns found.</p>
                    </div>
                ) : (
                    filteredCampaigns.map(campaign => (
                        <button
                            key={campaign.id}
                            onClick={() => onSelectCampaign(campaign.slug || campaign.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${
                                activeSlug === (campaign.slug || campaign.id)
                                ? 'bg-blue-600/10 border-blue-500/30'
                                : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-800/40'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <span className="text-[10px] font-black font-rajdhani text-gameOrange uppercase tracking-widest">{campaign.category}</span>
                                <span className="text-[9px] text-slate-500 font-bold">{new Date(campaign.end_time).toLocaleDateString()}</span>
                            </div>
                            <h3 className={`text-sm font-bold leading-tight mb-3 transition-colors relative z-10 ${
                                activeSlug === (campaign.slug || campaign.id) ? 'text-white' : 'text-slate-300 group-hover:text-white'
                            }`}>
                                {campaign.title}
                            </h3>
                            
                            {campaign.winner_style && (
                                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-1 w-fit relative z-10">
                                    <Award className="w-3 h-3 text-green-400" />
                                    <span className="text-[9px] text-green-400 font-black uppercase tracking-tighter">Winner: {campaign.winner_style}</span>
                                </div>
                            )}

                            <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-all ${
                                activeSlug === (campaign.slug || campaign.id) ? 'text-white translate-x-0' : 'text-slate-700 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                            }`} />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default SocialCampaignSidebar;
