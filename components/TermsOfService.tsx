
import React, { useEffect } from 'react';
import { FileText, Scale, ShieldAlert, CheckCircle, Mail, Building2 } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

const TermsOfService: React.FC = () => {
    useEffect(() => {
        document.title = 'Terms of Service | Moitra Studios';
    }, []);

    return (
        <section className="h-full w-full flex flex-col bg-lokBlue-950 relative font-sans overflow-hidden uppercase">
            {/* Stationary Background Grid */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF6B00 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 pt-4 pb-8 overflow-hidden">
                <div className="flex flex-col items-center mb-4 border-b-2 border-black/20 pb-4 flex-shrink-0">
                    <FileText className="w-8 h-8 text-gameOrange mb-2 drop-shadow-[0_0_10px_rgba(255,107,0,0.3)]" />
                    <h1 className="text-xl md:text-2xl font-cinzel font-black text-white mb-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider text-center">Terms of Service</h1>
                    <p className="text-gameOrange/60 text-[7px] uppercase tracking-[0.4em] font-black italic">Last Updated: May 2026</p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    <div className="bg-lokBlue-900/40 border-[2px] border-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-5 md:p-6 backdrop-blur-md space-y-6 text-slate-300 leading-relaxed font-medium text-[13px]">

                        <div>
                            <p className="text-sm border-l-4 border-gameOrange pl-4 italic text-slate-100">
                                By using the <strong>{STUDIO_INFO.name}</strong> website and services, including the Rajneeti TV Network reel publisher, you agree to these terms.
                            </p>
                        </div>

                        {/* Section 1 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <Scale className="text-gameGreen w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">1. Acceptance of Terms</h2>
                                <p className="mb-2 text-[12px]">
                                    By accessing this website or using our automated news services, you acknowledge that you have read and agree to be bound by these Terms of Service and our Privacy Policy.
                                </p>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <ShieldAlert className="text-gameBlue w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">2. Content & AI Services</h2>
                                <p className="mb-2 text-slate-300 text-[12px]">
                                    Our platform uses AI to generate political commentary and videos based on public news. 
                                </p>
                                <ul className="space-y-2 text-slate-400 text-[11px]">
                                    <li className="flex gap-2">
                                        <span className="text-gameBlue font-bold text-[8px]">▶</span>
                                        <div>AI-generated content is for entertainment purposes in the context of the Rajneeti game environment.</div>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-gameBlue font-bold text-[8px]">▶</span>
                                        <div>Users are responsible for any content they choose to publish via our integration to their own social channels.</div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <CheckCircle className="text-gameOrange w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">3. YouTube API Terms</h2>
                                <p className="mb-2 text-slate-100 text-[12px]">
                                    Our services integrate with YouTube API Services. By using our YouTube publishing feature:
                                </p>
                                <p className="text-slate-400 text-[11px]">
                                    You agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms) and the Google Privacy Policy (http://www.google.com/policies/privacy).
                                </p>
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <Mail className="text-gameYellow w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">4. Contact Information</h2>
                                <div className="bg-black/40 p-3 border-2 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-1.5 bg-gameDarkBlue border border-white/10">
                                            <Mail className="text-gameOrange w-3 h-3" />
                                        </div>
                                        <div>
                                            <span className="block text-[7px] text-gameOrange/60 uppercase tracking-[0.2em] font-black">Legal Queries</span>
                                            <a href={`mailto:${STUDIO_INFO.email}`} className="text-sm font-cinzel font-bold text-white hover:text-gameYellow transition-colors lowercase">
                                                {STUDIO_INFO.email}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 bg-gameDarkBlue border border-white/10">
                                            <Building2 className="text-gameBlue w-3 h-3" />
                                        </div>
                                        <div>
                                            <span className="block text-[7px] text-gameBlue/60 uppercase tracking-[0.2em] font-black">Studio</span>
                                            <p className="text-xs font-cinzel font-bold text-white uppercase">{STUDIO_INFO.legalName}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #FF6B00; border-radius: 2px; }
            `}</style>
        </section>
    );
};

export default TermsOfService;
