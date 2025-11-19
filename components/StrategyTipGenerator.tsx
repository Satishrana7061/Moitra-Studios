import React, { useState } from 'react';
import { SectionId } from '../types';
import { generateStrategicAdvice } from '../services/geminiService';
import { Crown, Send, Loader2, Sparkles, Scroll } from 'lucide-react';

const StrategyTipGenerator: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleAskAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const result = await generateStrategicAdvice(input);
    setResponse(result);
    setLoading(false);
    setInput('');
  };

  return (
    <section id={SectionId.ADVISOR} className="py-24 relative bg-lokBlue-900">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="bg-lokBlue-950 border border-lokGold-500/20 p-1 shadow-2xl shadow-black/50">
            <div className="bg-lokBlue-950 border border-slate-800 p-8 md:p-12 relative overflow-hidden">
            
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-lokGold-500"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-lokGold-500"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-lokGold-500"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-lokGold-500"></div>

                <div className="flex flex-col md:flex-row gap-12">
                    {/* Left: Identity */}
                    <div className="md:w-1/3 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-lokGold-900/20 border border-lokGold-500/30 rounded-none">
                                    <Crown className="text-lokGold-500 w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-cinzel font-bold text-white">THE ORACLE</h2>
                                    <p className="text-lokGold-600 text-xs uppercase tracking-widest">Advisor AI Core</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                Consult the archives of history. Our Gemini-powered advisor synthesizes strategies from thousands of historic battles and political maneuvers.
                            </p>
                        </div>
                        <div className="hidden md:block opacity-50">
                            <Scroll className="w-32 h-32 text-slate-800" />
                        </div>
                    </div>

                    {/* Right: Interaction */}
                    <div className="md:w-2/3 flex flex-col h-full min-h-[300px]">
                        
                        {/* Output Screen */}
                        <div className="flex-grow bg-black/40 border border-slate-700 p-6 mb-6 relative min-h-[150px] flex items-center justify-center">
                            {!response && !loading && (
                                <p className="text-slate-600 italic text-center text-sm">
                                    "Ask, and the wisdom of ages shall be revealed..."
                                </p>
                            )}
                            {loading && (
                                <div className="flex flex-col items-center gap-3 text-lokGold-500">
                                    <Loader2 className="animate-spin w-6 h-6" />
                                    <span className="text-xs uppercase tracking-widest animate-pulse">Consulting Archives...</span>
                                </div>
                            )}
                            {response && (
                                <div className="animate-fade-in text-left w-full">
                                    <div className="flex gap-3 mb-2">
                                        <Sparkles className="w-4 h-4 text-lokGold-500 mt-1 flex-shrink-0" />
                                        <p className="text-slate-200 font-serif text-lg leading-relaxed">
                                            {response}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {/* Scanline effect */}
                            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] opacity-20"></div>
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleAskAdvisor} className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Query the advisor (e.g. 'How to betray an ally?')"
                                className="w-full bg-lokBlue-900 border border-slate-700 text-slate-200 pl-4 pr-16 py-4 focus:ring-1 focus:ring-lokGold-500 focus:border-lokGold-500 outline-none transition-all font-mono text-sm placeholder:text-slate-600"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="absolute right-2 top-2 bottom-2 px-4 bg-lokGold-600 hover:bg-lokGold-500 text-black font-bold uppercase tracking-wider text-xs flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                SEND
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default StrategyTipGenerator;