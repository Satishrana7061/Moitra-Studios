
import React, { useState } from 'react';
import { SectionId } from '../types';
import { GAMES_DATA } from '../constants';
import { Smartphone, Play, X, Star, Bell, Mail, CheckCircle } from 'lucide-react';

const GamesSection: React.FC = () => {
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [showNotifyModal, setShowNotifyModal] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const handleStarClick = (gameId: string, status: string) => {
    if (wishlist.has(gameId)) {
      // Remove from wishlist
      const newWishlist = new Set(wishlist);
      newWishlist.delete(gameId);
      setWishlist(newWishlist);
    } else {
      if (status === 'In Development') {
        // Trigger modal for unreleased games
        setShowNotifyModal(gameId);
        setNotifySubmitted(false);
        setEmail('');
      } else {
        // Just toggle for live games
        const newWishlist = new Set(wishlist);
        newWishlist.add(gameId);
        setWishlist(newWishlist);
      }
    }
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setNotifySubmitted(true);
      if (showNotifyModal) {
        const newWishlist = new Set(wishlist);
        newWishlist.add(showNotifyModal);
        setWishlist(newWishlist);
      }
      // Close modal after short delay
      setTimeout(() => {
        setShowNotifyModal(null);
      }, 2000);
    }, 800);
  };

  return (
    <section id={SectionId.GAMES} className="py-32 bg-lokBlue-950 relative overflow-hidden">
       {/* Subtle grid pattern background */}
       <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="mb-24 md:flex justify-between items-end border-b border-slate-800 pb-8">
          <div>
            <span className="text-lokGold-500 font-bold tracking-[0.2em] text-sm uppercase mb-2 block">Active Operations</span>
            <h2 className="text-5xl md:text-6xl font-cinzel font-bold text-white">GAMES LIBRARY</h2>
          </div>
          <p className="text-slate-400 max-w-md mt-6 md:mt-0 text-right text-sm leading-relaxed">
            Deep simulations designed for the mobile strategist.<br/>
            No shortcuts. Only consequences.
          </p>
        </div>

        <div className="space-y-32">
          {GAMES_DATA.map((game, index) => (
            <div 
              key={game.id} 
              className="group relative"
            >
              {/* Cinematic Background Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-lokGold-600/20 to-purple-900/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>

              <div className={`relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                
                {/* Visual Side (Takes up 7 cols) */}
                <div className={`lg:col-span-7 relative ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                    <div className="relative aspect-video overflow-hidden rounded bg-slate-900 shadow-2xl border border-slate-800 group-hover:border-lokGold-500/30 transition-all duration-500">
                        <img 
                            src={game.imageUrl} 
                            alt={game.title} 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale-[20%] group-hover:grayscale-0"
                        />
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>

                        {/* Trailer Button centered */}
                        {game.trailerUrl && (
                            <button 
                                onClick={() => setActiveTrailer(game.trailerUrl!)}
                                className="absolute inset-0 flex items-center justify-center group/btn"
                            >
                                <div className="w-20 h-20 flex items-center justify-center rounded-full border border-white/30 bg-black/30 backdrop-blur-sm group-hover/btn:bg-lokGold-500 group-hover/btn:border-lokGold-500 transition-all duration-300 transform group-hover/btn:scale-110">
                                    <Play className="w-8 h-8 text-white ml-1 fill-current" />
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Side (Takes up 5 cols) */}
                <div className={`lg:col-span-5 space-y-8 ${index % 2 !== 0 ? 'lg:order-1 text-right lg:text-right' : 'lg:text-left'}`}>
                    <div>
                        <div className={`flex items-center gap-3 mb-4 ${index % 2 !== 0 ? 'justify-end' : ''}`}>
                             {game.status === 'Live' && (
                                 <div className="flex items-center gap-1 text-lokGreen-500 text-xs font-bold uppercase tracking-widest">
                                     <span className="relative flex h-2 w-2 mr-1">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lokGreen-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-lokGreen-500"></span>
                                    </span>
                                     Live Service
                                 </div>
                             )}
                             {game.status !== 'Live' && (
                                 <span className="text-lokGold-500 text-xs font-bold uppercase tracking-widest border border-lokGold-500/30 px-2 py-1 rounded">In Development</span>
                             )}
                        </div>
                        <h3 className="text-4xl md:text-5xl font-cinzel font-bold text-white mb-2 leading-tight">{game.title}</h3>
                        <p className="text-xl text-lokGold-500 font-serif italic">"{game.tagline}"</p>
                    </div>

                    <p className="text-slate-400 text-lg leading-relaxed font-light border-l-2 border-slate-800 pl-6 ml-1">
                        {game.description}
                    </p>

                    <div className={`flex flex-wrap gap-2 ${index % 2 !== 0 ? 'justify-end' : ''}`}>
                        {game.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-400 text-xs uppercase tracking-wider rounded-sm">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className={`flex items-center gap-4 pt-4 ${index % 2 !== 0 ? 'justify-end' : ''}`}>
                        {game.status === 'Live' ? (
                            <a 
                                href={game.playStoreLink} 
                                className="flex items-center gap-3 bg-white text-black px-8 py-4 font-bold uppercase tracking-widest hover:bg-lokGold-400 transition-colors"
                            >
                                <Smartphone size={20} />
                                <span>Install</span>
                            </a>
                        ) : (
                            <button className="px-8 py-4 border border-slate-600 text-slate-400 font-bold uppercase tracking-widest cursor-not-allowed opacity-50">
                                Coming Soon
                            </button>
                        )}
                        
                        {/* Wishlist / Star Button */}
                        <button 
                          onClick={() => handleStarClick(game.id, game.status)}
                          className={`p-4 border transition-all duration-300 group/star ${
                            wishlist.has(game.id) 
                              ? 'border-lokGold-500 text-lokGold-500 bg-lokGold-500/10' 
                              : 'border-slate-700 text-slate-400 hover:border-lokGold-500 hover:text-white'
                          }`}
                          title={wishlist.has(game.id) ? "Remove from wishlist" : "Add to wishlist"}
                        >
                            <Star 
                              size={20} 
                              className={`transition-all duration-300 ${wishlist.has(game.id) ? 'fill-lokGold-500 scale-110' : 'group-hover/star:scale-110'}`} 
                            />
                        </button>
                    </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cinematic Video Modal */}
      {activeTrailer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in p-4">
            <div className="w-full max-w-6xl aspect-video bg-black relative shadow-2xl border border-slate-800">
                <button 
                    onClick={() => setActiveTrailer(null)}
                    className="absolute -top-12 right-0 text-slate-400 hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest"
                >
                    Close Trailer <X size={20} />
                </button>
                <iframe
                    src={`${activeTrailer}?autoplay=1&modestbranding=1&rel=0`}
                    title="Game Trailer"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-lokBlue-950/90 backdrop-blur-md animate-fade-in p-4">
           <div className="bg-lokBlue-900 border border-lokGold-500/30 p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <button 
                onClick={() => setShowNotifyModal(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>

              {notifySubmitted ? (
                 <div className="text-center py-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lokGreen-500/20 text-lokGreen-500 mb-4">
                       <CheckCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-cinzel text-white mb-2">You're on the list.</h3>
                    <p className="text-slate-400">We will notify you as soon as deployment begins.</p>
                 </div>
              ) : (
                 <div className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-3 bg-lokGold-500/10 rounded-lg">
                          <Bell className="text-lokGold-500" size={24} />
                       </div>
                       <h3 className="text-xl font-cinzel font-bold text-white">Get Notified</h3>
                    </div>
                    
                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                       This title is currently in active development. Enter your email to receive a deployment alert when it goes live.
                    </p>

                    <form onSubmit={handleNotifySubmit} className="space-y-4">
                       <div className="relative">
                          <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                          <input 
                            type="email" 
                            required
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/30 border border-slate-600 rounded py-3 pl-10 pr-4 text-white focus:border-lokGold-500 focus:outline-none transition-colors"
                          />
                       </div>
                       <button 
                          type="submit" 
                          className="w-full py-3 bg-lokGold-600 hover:bg-lokGold-500 text-black font-bold uppercase tracking-wider transition-colors"
                       >
                          Notify Me
                       </button>
                    </form>
                 </div>
              )}
           </div>
        </div>
      )}
    </section>
  );
};

export default GamesSection;
