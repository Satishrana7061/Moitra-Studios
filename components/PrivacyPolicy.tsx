
import React, { useEffect } from 'react';
import { Shield, Globe2, Landmark, Monitor, Users, Clock, Scale, Baby, Mail } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

interface PrivacyPolicyProps {
    onBack: () => void;
}

// One policy for the studio, its website and both games (Rajneeti and GeoPolitics). Each part
// has an anchor (#website, #rajneeti, #geopolitics) so a store listing can link straight to it.

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

const Row: React.FC<{ what: React.ReactNode; why: string; where: string }> = ({ what, why, where }) => (
    <tr className="align-top">
        <td className="border border-white/10 p-2">{what}</td>
        <td className="border border-white/10 p-2">{why}</td>
        <td className="border border-white/10 p-2">{where}</td>
    </tr>
);

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = () => {

    useEffect(() => {
        const t = setTimeout(() => { document.title = 'Privacy Policy | Moitra Studios - GeoPolitics and Rajneeti'; }, 0);
        return () => clearTimeout(t);
    }, []);

    return (
        <section className="h-full w-full flex flex-col bg-lokBlue-950 relative font-sans overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF6B00 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 pt-4 pb-8 overflow-hidden">
                <div className="flex flex-col items-center mb-4 border-b-2 border-black/20 pb-4 flex-shrink-0">
                    <Shield className="w-8 h-8 text-gameOrange mb-2 drop-shadow-[0_0_10px_rgba(255,107,0,0.3)]" />
                    <h1 className="text-xl md:text-2xl font-cinzel font-black text-white mb-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider text-center">Privacy Policy</h1>
                    <p className="text-gameOrange/70 text-[9px] uppercase tracking-[0.3em] font-black">Last updated: 30 October 2026</p>
                    <p className="mt-2 text-[11px] text-slate-400 normal-case">Plain text version: <a className="underline" href="/privacy.html">moitrastudios.com/privacy.html</a></p>
                    <nav className="mt-3 flex flex-wrap justify-center gap-4 text-[10px] uppercase tracking-[0.2em]">
                        <a href="#website" className="text-slate-300 hover:text-white underline">Website</a>
                        <a href="#geopolitics" className="text-slate-300 hover:text-white underline">GeoPolitics</a>
                        <a href="#rajneeti" className="text-slate-300 hover:text-white underline">Rajneeti</a>
                        <a href="#your-rights" className="text-slate-300 hover:text-white underline">Your rights</a>
                    </nav>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    <div className="bg-lokBlue-900/40 border-[2px] border-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-5 md:p-6 backdrop-blur-md space-y-7 text-slate-300 leading-relaxed font-medium text-[13px]">

                        <p className="text-sm border-l-4 border-gameOrange pl-4 text-slate-100 normal-case">
                            <strong>{STUDIO_INFO.name}</strong> is the trading name of <strong>{STUDIO_INFO.legalName}</strong>, 7368 Saint Barbara Blvd, Mississauga, Ontario L5W 0C3, Canada ("we"). This policy explains what we collect, why, and your choices, for our website (moitrastudios.com) and our games <strong>GeoPolitics</strong> and <strong>Rajneeti</strong>. We never sell your personal data.
                        </p>

                        <Section id="website" icon={Monitor} title="1. Our website">
                            <p><strong>What we collect:</strong> nothing that identifies you unless you contact us (your email and message). Our servers and hosting keep standard technical logs (such as IP address and browser type) to keep the site running and safe.</p>
                            <p><strong>Advertising and cookies:</strong> the website shows ads from Google AdSense and Monetag. These partners may use cookies or similar technology to show and measure ads, and may personalise them based on your visits. You can opt out of personalised Google ads at <a className="underline" href="https://adssettings.google.com" target="_blank" rel="noreferrer">adssettings.google.com</a>, and block cookies in your browser.</p>
                            <p><strong>Rajneeti TV Network and YouTube:</strong> parts of the site use YouTube API Services. Videos are governed by the Google Privacy Policy (<a className="underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a>).</p>
                        </Section>

                        <Section id="geopolitics" icon={Globe2} title="2. GeoPolitics (the game)">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-[12px] min-w-[560px]">
                                    <thead><tr className="bg-black/30"><th className="border border-white/10 p-2 text-left">What</th><th className="border border-white/10 p-2 text-left">Why</th><th className="border border-white/10 p-2 text-left">Where it is kept</th></tr></thead>
                                    <tbody>
                                        <Row what={<><strong>Commander name and emblem</strong> you choose</>} why="To show you to other players and on your profile" where="Your device and our account service" />
                                        <Row what={<><strong>Game progress</strong>: level, rank, wins and losses, match history, achievements, cards, decks, in-game gold and phoenix, boosts</>} why="To run the game and keep your progress" where="Your device and our account service" />
                                        <Row what={<><strong>An account ID</strong> made for your device, and <strong>your email address</strong> if you choose to link one</>} why="To keep your progress safe and restore it on another device" where="Supabase, our account service (servers in Mumbai, India)" />
                                        <Row what={<><strong>Player reports</strong> you send (the reason and the record of that match)</>} why="To deal with cheating and abuse" where="Our account service" />
                                        <Row what={<><strong>Online match data</strong>: your moves, emotes, commander name, and the connection data (such as IP address) needed to connect two players</>} why="To run online matches" where="Photon (Exit Games), in the region of the match" />
                                        <Row what={<><strong>Advertising data</strong> (Android only): your device's advertising ID, device type and settings, approximate location from IP address, and how you interact with the ads you choose to watch</>} why="To show rewarded ads you choose to watch for in-game rewards, and to measure them" where="Unity LevelPlay (ironSource) and the ad networks it works with" />
                                        <Row what={<><strong>Crash reports</strong>: the error, device model and OS version</>} why="To find and fix crashes" where="Unity (Unity Technologies)" />
                                        <Row what={<><strong>Purchases</strong>: what you bought and when (we never see card or bank details)</>} why="To deliver what you bought and help with refunds" where="The store you bought from, and our account service" />
                                    </tbody>
                                </table>
                            </div>
                            <p>Ads in GeoPolitics are <strong>only rewarded ads you choose to watch</strong>; the paid Windows version has no ads. You can reset or limit your advertising ID in your phone's settings (Settings › Google › Ads on Android). We do <strong>not</strong> collect your precise location, contacts, photos, microphone or camera.</p>
                            <p><strong>Delete your GeoPolitics account and data:</strong> in the game, Settings › Account › Delete account, or email <span className="select-all">{STUDIO_INFO.email}</span> with your commander name. It is removed within 30 days.</p>
                        </Section>

                        <Section id="rajneeti" icon={Landmark} title="3. Rajneeti (the game)">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>The player name you choose</strong> (or the one the game suggests): shown to other players in online matches.</li>
                                <li><strong>Online match data</strong>: your moves, chosen candidate, player name, and the connection data (such as IP address) needed to connect players, handled by Photon (Exit Games) only for the match.</li>
                                <li><strong>Game progress</strong> (campaign, week, votes, in-game money and gold, cards, decks, settings) is kept <strong>only on your device</strong>. Rajneeti keeps no account for you on our servers.</li>
                                <li><strong>News stories</strong>: the game downloads public news headlines from our server (Supabase); it receives only the connection data any download needs, which we do not use to identify you.</li>
                                <li><strong>Advertising:</strong> Rajneeti shows ads through Google AdMob. Your advertising ID, device type, approximate location from IP address and ad interactions are used to show and measure ads. You can reset or limit your advertising ID in your phone's settings.</li>
                                <li><strong>Purchases</strong> of in-game gold go through Google Play; we never see card or bank details. Google Play may share crash reports (error, device model, OS version) with us.</li>
                            </ul>
                            <p>Rajneeti does not collect your real name, email, contacts, photos, precise location, microphone or camera. To delete your data, uninstall the game or clear its storage; for anything else write to <span className="select-all">{STUDIO_INFO.email}</span>.</p>
                        </Section>

                        <Section icon={Users} title="4. Who processes data for us">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Supabase, Inc.</strong> - accounts, cloud save, website data (<a className="underline" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">privacy</a>)</li>
                                <li><strong>Exit Games GmbH (Photon)</strong> - online matches in Rajneeti and GeoPolitics (<a className="underline" href="https://www.photonengine.com/privacy" target="_blank" rel="noreferrer">privacy</a>)</li>
                                <li><strong>Unity Technologies</strong> - LevelPlay ads and crash reports in GeoPolitics (<a className="underline" href="https://unity.com/legal/game-player-and-app-user-privacy-policy" target="_blank" rel="noreferrer">privacy</a>)</li>
                                <li><strong>Google</strong> - AdMob in Rajneeti, AdSense and YouTube on the website, Google Play (<a className="underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">privacy</a>)</li>
                                <li><strong>Monetag</strong> - website ads</li>
                                <li><strong>The store you buy from</strong> (Google Play, itch.io) - payments, under its own policy</li>
                            </ul>
                        </Section>

                        <Section icon={Clock} title="5. How long we keep it">
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Game accounts and progress: while your account exists; removed within 30 days of deletion.</li>
                                <li>Match records and player reports: 12 months.</li>
                                <li>Purchase records: as long as tax and refund law requires.</li>
                                <li>Support emails: as long as needed to answer you.</li>
                            </ul>
                        </Section>

                        <Section id="your-rights" icon={Scale} title="6. Your choices and rights">
                            <p>You can play GeoPolitics offline without an account. You can ask to see, correct, export or delete your data at any time by writing to <span className="select-all">{STUDIO_INFO.email}</span>; we reply within 30 days. Depending on where you live you may have more rights - for example under PIPEDA in Canada, the GDPR in the EU and UK, or the Digital Personal Data Protection Act 2023 in India - including the right to complain to your data protection authority (in Canada, the Office of the Privacy Commissioner of Canada).</p>
                        </Section>

                        <Section icon={Baby} title="7. Children">
                            <p>Our games and website are not made for children under 13, and we do not knowingly collect their data. If you believe a child under 13 has given us data, write to us and we will delete it.</p>
                        </Section>

                        <Section icon={Globe2} title="8. Real-world content and changes">
                            <p>Our games use real countries, places and public facts in a simplified way, for entertainment and learning; nothing in them is an official position of any government. If we change this policy we update the date above and, for important changes, tell players in the game.</p>
                        </Section>

                        <Section icon={Mail} title="9. Contact">
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

export default PrivacyPolicy;
