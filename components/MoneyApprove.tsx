/**
 * The daily approve step for Hisaab Kitab.
 *
 * One episode at a time: watch it, read what it says, Approve or Skip. The
 * evening workflow publishes whatever is approved.
 *
 * SECURITY NOTE — read before changing anything here.
 * This is a static site and the Supabase anon key ships inside the bundle, so
 * nothing on this page is a security control. Anyone can open the console and
 * call the API with that key. The actual protection is the RLS policy on
 * `money_episodes`, which restricts SELECT and UPDATE to a single email:
 *
 *   auth.jwt() ->> 'email' = 'gameofpolitics.in@gmail.com'
 *
 * The sign-in below exists so the browser HAS a JWT to send. The email check in
 * this component is a courtesy message, not a gate — a signed-in stranger sees
 * an empty list because the database refuses them, not because of this code.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const OWNER_EMAIL = 'gameofpolitics.in@gmail.com';

interface Beat {
    onScreen: string;
    say: string;
    visual?: { kind?: string };
}

interface Script {
    hook?: string;
    hookSaid?: string;
    beats?: Beat[];
    cta?: string;
    ctaSaid?: string;
    numericClaims?: string[];
}

interface Episode {
    id: string;
    topic_id: string;
    episode_no: number;
    step_number: number;
    title: string;
    status: string;
    script: Script | null;
    video_url: string | null;
    rendered_at: string | null;
}

type Phase = 'loading' | 'signed-out' | 'sent' | 'ready';

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-lokBlue-900 border border-slate-700 rounded-2xl p-7 text-center">
            {children}
        </div>
    </div>
);

const MoneyApprove: React.FC = () => {
    const [phase, setPhase] = useState<Phase>('loading');
    const [email, setEmail] = useState('');
    const [sessionEmail, setSessionEmail] = useState<string | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadEpisodes = useCallback(async () => {
        if (!supabase) return;
        const { data, error: err } = await supabase
            .from('money_episodes')
            .select('*')
            .eq('status', 'pending_approval')
            .order('episode_no', { ascending: true });

        // An RLS refusal comes back as an empty list rather than an error, so
        // "no episodes" and "not allowed" look identical here. That is fine —
        // the message below covers both without claiming which.
        if (err) setError(err.message);
        else setEpisodes((data as Episode[]) ?? []);
    }, []);

    useEffect(() => {
        if (!supabase) {
            setError('Supabase is not configured for this build.');
            setPhase('signed-out');
            return;
        }
        supabase.auth.getSession().then(({ data }) => {
            const mail = data.session?.user?.email ?? null;
            setSessionEmail(mail);
            setPhase(mail ? 'ready' : 'signed-out');
            if (mail) void loadEpisodes();
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            const mail = session?.user?.email ?? null;
            setSessionEmail(mail);
            setPhase(mail ? 'ready' : 'signed-out');
            if (mail) void loadEpisodes();
        });
        return () => sub.subscription.unsubscribe();
    }, [loadEpisodes]);

    const sendLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setError(null);
        const { error: err } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            // Come back to this page rather than the site root, so the link
            // lands where the work is.
            options: { emailRedirectTo: `${window.location.origin}/studio/approve` },
        });
        if (err) setError(err.message);
        else setPhase('sent');
    };

    const decide = async (ep: Episode, decision: 'approved' | 'skipped') => {
        if (!supabase) return;
        setBusyId(ep.id);
        setError(null);
        const { error: err } = await supabase
            .from('money_episodes')
            .update({
                status: decision,
                approved_at: decision === 'approved' ? new Date().toISOString() : null,
            })
            .eq('id', ep.id);

        if (err) setError(`Could not save: ${err.message}`);
        else setEpisodes((list) => list.filter((x) => x.id !== ep.id));
        setBusyId(null);
    };

    const signOut = async () => {
        await supabase?.auth.signOut();
        setEpisodes([]);
    };

    // ── Render ────────────────────────────────────────────────────────────
    if (phase === 'loading') {
        return (
            <Panel>
                <div className="w-8 h-8 mx-auto border-2 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin" />
            </Panel>
        );
    }

    if (phase === 'sent') {
        return (
            <Panel>
                <h1 className="font-serif text-2xl text-lokGold-400 mb-3">Check your email</h1>
                <p className="text-slate-300 text-sm leading-relaxed">
                    A sign-in link is on its way to <span className="text-white">{email}</span>.
                    Open it on this device and you will land back here.
                </p>
            </Panel>
        );
    }

    if (phase === 'signed-out') {
        return (
            <Panel>
                <h1 className="font-serif text-2xl text-lokGold-400 mb-2">Hisaab Kitab</h1>
                <p className="text-slate-400 text-sm mb-6">Sign in to review today's episode.</p>
                <form onSubmit={sendLink} className="flex flex-col gap-3">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your email"
                        autoComplete="email"
                        className="w-full px-4 py-3 rounded-lg bg-lokBlue-950 border border-slate-700 text-white
                                   placeholder:text-slate-600 focus:outline-none focus:border-gameOrange"
                    />
                    <button
                        type="submit"
                        className="w-full px-4 py-3 rounded-lg bg-gameOrange text-white font-semibold
                                   hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-gameOrange
                                   focus:ring-offset-2 focus:ring-offset-lokBlue-900 transition-colors"
                    >
                        Email me a sign-in link
                    </button>
                </form>
                {error && <p className="mt-4 text-sm text-gameRed">{error}</p>}
            </Panel>
        );
    }

    const isOwner = sessionEmail === OWNER_EMAIL;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
            <header className="flex items-baseline justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
                <div>
                    <h1 className="font-serif text-2xl md:text-3xl text-lokGold-400">Hisaab Kitab</h1>
                    <p className="text-slate-500 text-xs mt-1">{sessionEmail}</p>
                </div>
                <button onClick={signOut} className="text-slate-400 hover:text-white text-sm underline underline-offset-4">
                    Sign out
                </button>
            </header>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-gameRed/10 border border-gameRed/40 text-sm text-red-200">
                    {error}
                </div>
            )}

            {!isOwner && (
                <div className="mb-6 p-4 rounded-lg bg-lokBlue-900 border border-slate-700 text-sm text-slate-300">
                    This account cannot review episodes. Sign in as the channel owner.
                </div>
            )}

            {episodes.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-slate-300">Nothing waiting.</p>
                    <p className="text-slate-500 text-sm mt-2">
                        The next episode is built each morning and will appear here.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-10">
                    {episodes.map((ep) => (
                        <article key={ep.id} className="bg-lokBlue-900 border border-slate-700 rounded-2xl overflow-hidden">
                            <div className="px-5 pt-5 pb-4">
                                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                    Episode {ep.episode_no} · Step {ep.step_number}
                                </p>
                                <h2 className="text-lg text-white font-semibold leading-snug">{ep.title}</h2>
                            </div>

                            {ep.video_url ? (
                                <video
                                    src={ep.video_url}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full max-h-[70vh] bg-black"
                                />
                            ) : (
                                <div className="px-5 py-8 text-center text-slate-500 text-sm bg-lokBlue-950">
                                    No video attached to this row.
                                </div>
                            )}

                            {ep.script && (
                                <div className="px-5 py-5 border-t border-slate-800 flex flex-col gap-4">
                                    <Line label="Hook" drawn={ep.script.hook} said={ep.script.hookSaid} />
                                    {(ep.script.beats ?? []).map((b, i) => (
                                        <Line key={i} label={`Beat ${i + 1}${b.visual?.kind ? ` · ${b.visual.kind}` : ''}`}
                                              drawn={b.onScreen} said={b.say} />
                                    ))}
                                    <Line label="Close" drawn={ep.script.cta} said={ep.script.ctaSaid} />

                                    {(ep.script.numericClaims ?? []).length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                                                Numbers to check
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {ep.script.numericClaims!.map((c, i) => (
                                                    <span key={i} className="px-2.5 py-1 rounded-md bg-lokBlue-950 border border-slate-700 text-sm text-lokGold-400">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="px-5 py-4 border-t border-slate-800 flex gap-3">
                                <button
                                    disabled={busyId === ep.id || !isOwner}
                                    onClick={() => decide(ep, 'approved')}
                                    className="flex-1 px-4 py-3 rounded-lg bg-lokGreen-600 text-white font-semibold
                                               hover:bg-lokGreen-500 disabled:opacity-40 disabled:cursor-not-allowed
                                               focus:outline-none focus:ring-2 focus:ring-lokGreen-500 transition-colors"
                                >
                                    {busyId === ep.id ? 'Saving…' : 'Approve'}
                                </button>
                                <button
                                    disabled={busyId === ep.id || !isOwner}
                                    onClick={() => decide(ep, 'skipped')}
                                    className="px-5 py-3 rounded-lg bg-transparent border border-slate-600 text-slate-300
                                               hover:border-slate-400 hover:text-white disabled:opacity-40
                                               disabled:cursor-not-allowed focus:outline-none focus:ring-2
                                               focus:ring-slate-500 transition-colors"
                                >
                                    Skip
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * One line of script, showing both halves.
 *
 * Both are shown deliberately: the drawn text is English and the spoken text is
 * Hindi, and they are not translations of each other. Reviewing only one half
 * would miss the failure where the voice says something the screen does not.
 */
const Line: React.FC<{ label: string; drawn?: string; said?: string }> = ({ label, drawn, said }) => (
    <div>
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        {drawn && <p className="text-white leading-snug">{drawn}</p>}
        {said && <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">{said}</p>}
    </div>
);

export default MoneyApprove;
