
import React, { useEffect } from 'react';
import { FileText, Scale, Globe2, Landmark, ShieldAlert, Gem, Mail } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

// One set of terms for the studio's website and both games. Anchors #website, #games,
// #geopolitics and #rajneeti let a store listing link to the part that applies.

const Section: React.FC<{ id?: string; icon: React.ElementType; title: string; children: React.ReactNode }> = ({ id, icon: Icon, title, children }) => (
    <div id={id} className="flex gap-4 scroll-mt-24">
        <div className="hidden md:block bg-gameDarkBlue border-2 border-black p-2 h-fit shadow-[4px_4px_0px_rgba(0,0,0,1)] flex-shrink-0">
            <Icon className="text-gameOrange w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
            <h2 className="text-md font-cinzel font-black text-white mb-2 uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">{title}</h2>
            <div className="space-y-2 text-[13px] text-slate-300 normal-case">{children}</div>
        </div>
    </div>
);

const TermsOfService: React.FC = () => {
    useEffect(() => {
        const t = setTimeout(() => { document.title = 'Terms of Service | Moitra Studios - GeoPolitics and Rajneeti'; }, 0);
        return () => clearTimeout(t);
    }, []);

    return (
        <section className="h-full w-full flex flex-col bg-lokBlue-950 relative font-sans overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF6B00 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 pt-4 pb-8 overflow-hidden">
                <div className="flex flex-col items-center mb-4 border-b-2 border-black/20 pb-4 flex-shrink-0">
                    <FileText className="w-8 h-8 text-gameOrange mb-2 drop-shadow-[0_0_10px_rgba(255,107,0,0.3)]" />
                    <h1 className="text-xl md:text-2xl font-cinzel font-black text-white mb-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider text-center">Terms of Service</h1>
                    <p className="text-gameOrange/70 text-[9px] uppercase tracking-[0.3em] font-black">Last updated: 27 October 2026</p>
                    <nav className="mt-3 flex flex-wrap justify-center gap-4 text-[10px] uppercase tracking-[0.2em]">
                        <a href="#website" className="text-slate-300 hover:text-white underline">Website</a>
                        <a href="#games" className="text-slate-300 hover:text-white underline">Both games</a>
                        <a href="#geopolitics" className="text-slate-300 hover:text-white underline">GeoPolitics</a>
                        <a href="#rajneeti" className="text-slate-300 hover:text-white underline">Rajneeti</a>
                    </nav>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    <div className="bg-lokBlue-900/40 border-[2px] border-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-5 md:p-6 backdrop-blur-md space-y-7 text-slate-300 leading-relaxed font-medium text-[13px]">

                        <p className="text-sm border-l-4 border-gameOrange pl-4 text-slate-100 normal-case">
                            These terms are between you and <strong>{STUDIO_INFO.legalName}</strong>, operating as <strong>{STUDIO_INFO.name}</strong>, 7368 Saint Barbara Blvd, Mississauga, Ontario L5W 0C3, Canada. They cover our website (moitrastudios.com) and our games <strong>GeoPolitics</strong> and <strong>Rajneeti</strong>. By using them you agree to these terms and to our Privacy Policy. If you do not agree, please do not use them.
                        </p>

                        <Section id="website" icon={Scale} title="1. The website">
                            <p>The website and its services, including the Rajneeti TV Network and automated news, use AI to produce commentary and videos based on public news. This content is for entertainment in the context of our games, is not news reporting or advice, and may contain mistakes.</p>
                            <p>Where our services publish to YouTube, you also agree to the YouTube Terms of Service (<a className="underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">youtube.com/t/terms</a>) and the Google Privacy Policy. You are responsible for content you choose to publish to your own channels.</p>
                        </Section>

                        <Section id="games" icon={ShieldAlert} title="2. Both games: your account and fair play">
                            <ul className="list-disc pl-5 space-y-1">
                                <li>You must be at least 13 (or older, if your country sets a higher age) to create an account. One account per person; keep your sign-in safe.</li>
                                <li>Play fair: no cheating, bots or modified game files in online play, no attacks on our servers, no impersonating others. Do not use your name to insult, harass, threaten or spread hate.</li>
                                <li>We may rename, mute, suspend or close accounts that break these rules.</li>
                            </ul>
                        </Section>

                        <Section icon={Gem} title="3. Virtual items and purchases">
                            <ul className="list-disc pl-5 space-y-1">
                                <li>In-game currencies (such as gold and phoenix), cards, boosts and cosmetics are a licence to use content in the game. They have no cash value and cannot be exchanged for money or sold or transferred outside the game.</li>
                                <li>Prices and contents are shown before you buy. Timed boosts run for the stated time from the moment of purchase.</li>
                                <li>Real-money purchases are made through the store (Google Play, itch.io, and later others) and that store's terms apply. Refunds follow the store's refund policy and the law in your country.</li>
                                <li>Rewarded ads are optional: you choose to watch one for an in-game reward, which is given only when the ad is watched to the end.</li>
                            </ul>
                        </Section>

                        <Section id="geopolitics" icon={Globe2} title="4. GeoPolitics">
                            <p>Countries, places and events in GeoPolitics are simplified for a game. They are not statements of fact about any government or person, take no side, show no real leaders, and are not advice. Scenarios are dated and sourced in the game's Sources and Licences screen. Online matches need an internet connection; a match a player leaves on purpose counts as a loss for that player.</p>
                        </Section>

                        <Section id="rajneeti" icon={Landmark} title="5. Rajneeti">
                            <p>Rajneeti is a game of satire and strategy about elections. Parties, places and events are simplified or fictional for play, are not statements of fact about any real party or person, and are not political advice or endorsement.</p>
                        </Section>

                        <Section icon={FileText} title="6. Changes, liability and law">
                            <ul className="list-disc pl-5 space-y-1">
                                <li>We may update, change or stop parts of our games and services. We will give reasonable notice before closing online services or anything you paid for.</li>
                                <li>Our games and services are provided "as is" to the extent the law allows. Nothing in these terms limits rights you have as a consumer that cannot be limited by law.</li>
                                <li>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there. Please write to us first so we can try to settle any problem; if we cannot, the courts of Ontario decide, unless the law where you live gives you the right to go to your own courts.</li>
                            </ul>
                        </Section>

                        <Section icon={Mail} title="7. Contact">
                            <div className="bg-black/40 p-3 border-2 border-black">
                                <p><strong>{STUDIO_INFO.legalName}</strong> ({STUDIO_INFO.name}), 7368 Saint Barbara Blvd, Mississauga, Ontario L5W 0C3, Canada</p>
                                <p className="mt-1">Email: <span className="select-all text-white">{STUDIO_INFO.email}</span></p>
                            </div>
                        </Section>
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
