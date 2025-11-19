
import React, { useEffect } from 'react';
import { Shield, Lock, Database, Mail, ArrowLeft, Building2 } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="pt-32 pb-24 min-h-screen bg-lokBlue-950 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-lokGold-500 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="bg-lokBlue-900/50 border border-slate-800 rounded-xl p-8 md:p-12 backdrop-blur-sm">
            
            <div className="border-b border-slate-800 pb-8 mb-10 text-center">
                <Shield className="w-16 h-16 text-lokGold-500 mx-auto mb-6" />
                <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-white mb-4">Privacy Policy</h1>
                <p className="text-slate-400 text-sm uppercase tracking-widest">Last Updated: October 2023</p>
            </div>

            <div className="space-y-12 text-slate-300 leading-relaxed">
                
                {/* Introduction */}
                <div>
                    <p className="text-lg">
                        At <strong>{STUDIO_INFO.name}</strong> (legally registered as <strong>{STUDIO_INFO.legalName}</strong>), we value your trust. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile applications (including "Rajneeti") and our website. By using our services, you agree to the practices described below.
                    </p>
                </div>

                {/* Section 1 */}
                <div className="flex gap-6">
                    <div className="hidden md:block bg-slate-800/50 p-4 rounded-lg h-fit">
                        <Database className="text-lokGreen-500 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-cinzel font-bold text-white mb-4">1. Information We Collect</h2>
                        <p className="mb-4">
                            We adhere to a strict "Minimal Data" philosophy. We do not collect Personally Identifiable Information (PII) such as your name, address, or phone number unless you voluntarily provide it via customer support emails.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-slate-400">
                            <li><strong>Device Information:</strong> We may collect device model, OS version, and unique device identifiers (advertising ID) for optimization.</li>
                            <li><strong>Gameplay Data:</strong> Anonymous statistics about how you play (e.g., "Level 5 Completed", "Resource Count") to help us balance the game.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="flex gap-6">
                    <div className="hidden md:block bg-slate-800/50 p-4 rounded-lg h-fit">
                        <Lock className="text-blue-500 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-cinzel font-bold text-white mb-4">2. How We Use Data</h2>
                        <p>The limited data we collect is used solely for:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2 text-slate-400">
                            <li>Improving game stability and fixing bugs (Crash Analytics).</li>
                            <li>Analyzing player progression to tune difficulty.</li>
                            <li>Serving relevant advertisements via third-party networks (e.g., Google AdMob, Unity Ads).</li>
                        </ul>
                    </div>
                </div>

                {/* Section 3 */}
                <div>
                    <h2 className="text-2xl font-cinzel font-bold text-white mb-4">3. Third-Party Services</h2>
                    <p className="mb-4">
                        Our apps may use third-party services that may collect information used to identify you. Links to privacy policy of third-party service providers used by the app:
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white transition-colors">Google Play Services</a>
                        <a href="https://support.google.com/admob/answer/6128543?hl=en" target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white transition-colors">AdMob</a>
                        <a href="https://unity3d.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white transition-colors">Unity Analytics</a>
                    </div>
                </div>

                {/* Section 4 */}
                <div className="flex gap-6">
                    <div className="hidden md:block bg-slate-800/50 p-4 rounded-lg h-fit">
                        <Mail className="text-lokGold-500 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-cinzel font-bold text-white mb-4">4. Contact Us</h2>
                        <p>
                            If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us.
                        </p>
                        
                        <div className="mt-6 space-y-4 bg-slate-800/30 p-6 rounded-lg border border-slate-700">
                            <div className="flex items-start gap-3">
                                <Mail className="text-slate-500 w-5 h-5 mt-0.5" />
                                <div>
                                    <span className="block text-xs text-slate-500 uppercase tracking-widest">Email</span>
                                    <a href={`mailto:${STUDIO_INFO.email}`} className="text-white hover:text-lokGold-400 transition-colors">
                                        {STUDIO_INFO.email}
                                    </a>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <Building2 className="text-slate-500 w-5 h-5 mt-0.5" />
                                <div>
                                    <span className="block text-xs text-slate-500 uppercase tracking-widest">Registered Entity</span>
                                    <p className="text-white">{STUDIO_INFO.legalName}</p>
                                    <p className="text-slate-400 text-sm mt-1 max-w-xs">
                                        {STUDIO_INFO.address}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPolicy;
