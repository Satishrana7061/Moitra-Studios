
import React, { useState } from 'react';
import { SectionId } from '../types';
import { GAMES_DATA } from '../constants';
import { Smartphone, Play, X, Star, Bell, Mail, CheckCircle, Activity, Construction, Lightbulb, CalendarClock } from 'lucide-react';

const GamesSection: React.FC = () => {
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [showNotifyModal, setShowNotifyModal] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const handleStarClick = (gameId: string, status: string) => {
    if (wishlist.has(gameId)) {
      const newWishlist = new Set(wishlist);
      newWishlist.delete(gameId);
      setWishlist(newWishlist);
    } else {
      if (status === 'In Development' || status === 'Concept') {
        setShowNotifyModal(gameId);
        setNotifySubmitted(false);
        setEmail('');
      } else {
        const newWishlist = new Set(wishlist);
        newWishlist.add(gameId);
        setWishlist(newWishlist);
      }
    }
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setNotifySubmitted(true);
      if (showNotifyModal) {
        const newWishlist = new Set(wishlist);
        newWishlist.add(showNotifyModal);
        setWishlist(newWishlist);
      }
      setTimeout(() => {
        setShowNotifyModal(null);
      }, 2000);
    }, 800);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Live':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-lokGreen-500/10 border border-lokGreen-500/30 rounded-full text-lokGreen-500 text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lokGreen-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lokGreen-500"></span>
            </span>
            <Activity size={10} />
            Live Now
          </div>
        );
      case 'In Development':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-lokGold-500/10 border border-lokGold-500/30 rounded-full text-lokGold-500 text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Construction size={10} />
            Under Construction
          </div>
        );
      case 'Concept':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.15em]">
            <Lightbulb size={10} />
            Classified Concept
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section id={SectionId.GAMES} className="py-32 bg-lokBlue-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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

        <div className="space-y-40">
          {GAMES_DATA.map((game, index) => (
            <div key={game.id} className="group relative">
              <div className="absolute -inset-10 bg-gradient-to-r from-lokGold-600/5 to-transparent blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

              <div className={`relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                
                {/* Visual Side */}
                <div className={`lg:col-span-7 relative ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                  <div className="relative group/image overflow-hidden rounded-sm bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 transition-all duration-700 hover:border-lokGold-500/20">
                    <div className="aspect-[16/9] relative overflow-hidden">
                      <img 
                        src={game.imageUrl} 
                        alt={game.title} 
                        className="w-full h-full object-cover transform scale-100 group-hover/image:scale-105 transition-transform duration-1000 ease-out brightness-75 group-hover/image:brightness-100"
                      />
                      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-10 bg-[length:100%_4px] opacity-20"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-lokBlue-950 via-transparent to-transparent opacity-60"></div>
                    </div>

                    {game.trailerUrl && (
                      <button 
                        onClick={() => setActiveTrailer(game.trailerUrl!)}
                        className="absolute inset-0 flex items-center justify-center group/play"
                      >
                        <div className="relative">
                          <div className="absolute -inset-4 border border-lokGold-500/50 rounded-full animate-ping opacity-0 group-hover/play:opacity-40 transition-opacity"></div>
                          <div className="w-24 h-24 flex items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md group-hover/play:bg-lokGold-600 group-hover/play:border-lokGold-500 transition-all duration-500 transform group-hover/play:scale-110 shadow-2xl">
                            <Play className="w-10 h-10 text-white ml-1.5 fill-current" />
                          </div>
                          <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-[0.3em] text-white opacity-0 group-hover/play:opacity-100 transition-all group-hover/play:-bottom-8 uppercase">
                            View Intel
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  {/* Digital ID Label */}
                  <div className={`absolute -top-4 ${index % 2 !== 0 ? '-right-4' : '-left-4'} px-4 py-2 bg-lokBlue-950 border border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-widest z-20`}>
                    UNIT_ID: {game.id.toUpperCase()}_SRC
                  </div>
                </div>

                {/* Info Side */}
                <div className={`lg:col-span-5 space-y-8 ${index % 2 !== 0 ? 'lg:order-1 lg:text-right' : 'lg:text-left'}`}>
                  <div>
                    <div className={`mb-6 flex ${index % 2 !== 0 ? 'justify-end' : 'justify-start'}`}>
                      {getStatusBadge(game.status)}
                    </div>
                    <h3 className="text-4xl md:text-6xl font-cinzel font-black text-white mb-4 leading-none tracking-tight">{game.title}</h3>
                    <div className={`h-1 w-24 bg-lokGold-600 mb-6 ${index % 2 !== 0 ? 'ml-auto' : ''}`}></div>
                    <p className="text-xl text-lokGold-500 font-serif italic tracking-wide">"{game.tagline}"</p>
                  </div>

                  <div className={`space-y-4 ${index % 2 !== 0 ? 'pr-0' : 'pl-0'}`}>
                    <p className="text-slate-300 text-lg leading-relaxed font-light">
                      {game.description}
                    </p>

                    {game.highlights && (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-400">
                        {game.highlights.map((point) => (
                          <li 
                            key={point}
                            className="flex items-start gap-2 bg-slate-900/50 border border-slate-800 px-3 py-2 rounded-sm"
                          >
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-lokGold-500"></span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {game.releaseWindow && (
                      <div className="flex items-center gap-3 text-sm uppercase tracking-[0.15em] text-slate-400 bg-slate-900/60 border border-slate-800 px-4 py-3 w-fit">
                        <CalendarClock size={16} className="text-lokGold-500" />
                        {game.releaseWindow}
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-wrap gap-2 pt-2 ${index % 2 !== 0 ? 'justify-end' : ''}`}>
                    {game.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-none hover:border-lokGold-500/40 transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className={`flex items-center gap-6 pt-6 ${index % 2 !== 0 ? 'justify-end' : ''}`}>
                    {game.status === 'Live' ? (
                      <a 
                        href={game.playStoreLink} 
                        className="group relative flex items-center gap-3 bg-white text-black px-10 py-5 font-black uppercase tracking-widest overflow-hidden transition-all hover:bg-lokGold-500"
                      >
                        <Smartphone size={18} className="relative z-10" />
                        <span className="relative z-10 text-base">Play Now</span>
                        <div className="absolute inset-0 bg-black/5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                      </a>
                    ) : (
                      <button className="px-10 py-5 border border-slate-800 text-slate-600 font-black uppercase tracking-widest cursor-not-allowed text-xs">
                        Deployment Pending
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleStarClick(game.id, game.status)}
                      className={`p-5 border transition-all duration-500 group/star ${
                        wishlist.has(game.id) 
                          ? 'border-lokGold-500 text-lokGold-500 bg-lokGold-500/5 shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
                          : 'border-slate-800 text-slate-500 hover:border-lokGold-500/50 hover:text-white'
                      }`}
                    >
                      <Star 
                        size={22} 
                        className={`transition-all duration-500 ${wishlist.has(game.id) ? 'fill-lokGold-500 scale-125' : 'group-hover/star:scale-110'}`} 
                      />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {activeTrailer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-2xl animate-fade-in p-4 lg:p-12">
            <div className="w-full max-w-7xl aspect-video bg-black relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5">
                <button 
                    onClick={() => setActiveTrailer(null)}
                    className="absolute -top-16 right-0 text-slate-400 hover:text-white flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] transition-all group"
                >
                    Close Transmission <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
                <iframe
                    src={`${activeTrailer}?autoplay=1&modestbranding=1&rel=0&showinfo=0`}
                    title="Intel Transmission"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
      )}

      {showNotifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-lokBlue-950/95 backdrop-blur-xl animate-fade-in p-6">
           <div className="bg-lokBlue-900 border border-lokGold-500/20 p-10 max-w-lg w-full relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-lokGold-500"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-lokGold-500"></div>
              
              <button onClick={() => setShowNotifyModal(null)} className="absolute top-6 right-6 text-slate-600 hover:text-white">
                <X size={24} />
              </button>

              {notifySubmitted ? (
                 <div className="text-center py-10">
                    <CheckCircle size={40} className="text-lokGreen-500 mx-auto mb-6" />
                    <h3 className="text-3xl font-cinzel text-white mb-4">Transmission Received</h3>
                    <p className="text-slate-400">Your credentials have been logged.</p>
                 </div>
              ) : (
                 <div>
                    <Bell className="text-lokGold-500 mb-8" size={32} />
                    <h3 className="text-2xl font-cinzel font-black text-white uppercase mb-6">Priority Intel</h3>
                    <form onSubmit={handleNotifySubmit} className="space-y-6">
                       <input 
                         type="email" 
                         required
                         placeholder="COMM_IDENTIFIER@SECURE.MAIL"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full bg-black/50 border border-slate-700 p-4 text-white font-mono text-sm focus:border-lokGold-500 outline-none transition-all"
                       />
                       <button type="submit" className="w-full py-5 bg-lokGold-600 hover:bg-lokGold-500 text-black font-black uppercase tracking-widest transition-all">
                          Secure Access
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
