
import React, { useEffect } from 'react';
import { Shield, Lock, Database, Mail, Building2 } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {

    useEffect(() => {
        // Initial scroll to top of internal container if needed
    }, []);

    return (
        <section className="h-full w-full flex flex-col bg-lokBlue-950 relative font-sans overflow-hidden uppercase">
            {/* Stationary Background Grid */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF6B00 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 pt-4 pb-8 overflow-hidden">
                {/* Stationary Header Section - Fixed at top of this container */}
                <div className="flex flex-col items-center mb-4 border-b-2 border-black/20 pb-4 flex-shrink-0">
                    <Shield className="w-8 h-8 text-gameOrange mb-2 drop-shadow-[0_0_10px_rgba(255,107,0,0.3)]" />
                    <h1 className="text-xl md:text-2xl font-cinzel font-black text-white mb-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider text-center">Privacy Policy</h1>
                    <p className="text-gameOrange/60 text-[7px] uppercase tracking-[0.4em] font-black italic">Last Updated: October 2023</p>
                </div>

                {/* Scrollable Content Section */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    <div className="bg-lokBlue-900/40 border-[2px] border-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-5 md:p-6 backdrop-blur-md space-y-6 text-slate-300 leading-relaxed font-medium text-[13px]">

                        <div>
                            <p className="text-sm border-l-4 border-gameOrange pl-4 italic text-slate-100">
                                At <strong>{STUDIO_INFO.name}</strong>, we are committed to protecting your privacy. This policy explains how we handle information for the "Rajneeti" mobile application and our website.
                            </p>
                        </div>

                        {/* Section 1 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <Database className="text-gameGreen w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">1. Information We Collect</h2>
                                <p className="mb-2 text-[12px]">
                                    We collect very limited information. We do not collect personal identifiers like your name or email unless you contact our support team.
                                </p>
                                <ul className="space-y-2 text-slate-400 text-[11px]">
                                    <li className="flex gap-2">
                                        <span className="text-gameOrange font-bold text-[8px]">▶</span>
                                        <div><strong>Device Information:</strong> We may collect device model and OS version to improve performance.</div>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-gameOrange font-bold text-[8px]">▶</span>
                                        <div><strong>Usage Data:</strong> Anonymous statistics on how you interact with the game.</div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <Lock className="text-gameBlue w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">2. How We Use Information</h2>
                                <p className="mb-2 text-slate-300 text-[12px]">The data we collect is used only for:</p>
                                <ul className="space-y-2 text-slate-400 text-[11px]">
                                    <li className="flex gap-2">
                                        <span className="text-gameBlue font-bold text-[8px]">▶</span>
                                        <div>Fixing bugs and improving application stability.</div>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-gameBlue font-bold text-[8px]">▶</span>
                                        <div>Optimizing game balance and regional difficulty.</div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Section 3 - Added more content to ensure scrolling */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <Shield className="text-gameOrange w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">3. Data Security</h2>
                                <p className="mb-2 text-slate-100 text-[12px]">
                                    We implement industry-standard security measures to protect the limited data we collect.
                                </p>
                                <p className="text-slate-400 text-[11px]">
                                    Your data integrity is our priority. We use encrypted transit for all data transmissions between our applications and servers.
                                </p>
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div className="flex gap-4">
                            <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
                                <Mail className="text-gameYellow w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">4. Contact Us</h2>
                                <p className="mb-4 italic text-[12px] text-slate-400">
                                    If you have any questions about this Privacy Policy, please reach out to us.
                                </p>

                                <div className="bg-black/40 p-3 border-2 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-1.5 bg-gameDarkBlue border border-white/10">
                                            <Mail className="text-gameOrange w-3 h-3" />
                                        </div>
                                        <div>
                                            <span className="block text-[7px] text-gameOrange/60 uppercase tracking-[0.2em] font-black">Support Email</span>
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
                                            <span className="block text-[7px] text-gameBlue/60 uppercase tracking-[0.2em] font-black">Company Name</span>
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

export default PrivacyPolicy;
