/**
 * Turns a curriculum topic into a ready-to-render script for the
 * पैसे की सीढ़ी channel.
 *
 * Two things make this different from the Rajneeti dialogue generator:
 *
 * 1. The model fallback actually works. conversationPipeline.ts:188-242 has
 *    `if (openaiKey) { ...throw... } else if (geminiKey)`, so the Gemini path
 *    only runs when OpenAI is UNCONFIGURED -- the one case where it is useless.
 *    A transient OpenAI 5xx kills the whole run. Here each provider is tried in
 *    turn and only an all-providers-failed condition throws.
 *
 * 2. Output is compliance-linted before it is returned. SEBI's January 2025
 *    circular separates permitted "general financial awareness" from
 *    unregistered investment advice, and an LLM will happily wander across that
 *    line. A violating draft is regenerated once with the violations fed back,
 *    and a second violation fails the run rather than publishing.
 */

import { OPENAI_API_KEY, GEMINI_API_KEY } from '../config.js';
import {
    complianceViolations,
    loadCurriculum,
    type ScheduledTopic,
    type VisualKind,
} from './moneyCurriculum.js';

/** A single on-screen beat: what is said, what is shown, and how. */
export interface ScriptBeat {
    /** On-screen text. Six words maximum -- enforced, not requested. */
    onScreen: string;
    /** The Hindi voiceover line for this beat. */
    say: string;
    /**
     * The sound-off caption. ENGLISH, a full sentence.
     *
     * Not a translation of `say` word for word — the same point written for a
     * reader. Most of a reel's first watch is muted, and `onScreen` alone (six
     * words) is not enough for a muted viewer to get the argument, which is
     * what makes a reel worth sending.
     */
    caption: string;
    visual: {
        kind: VisualKind;
        /** bigNumber: the figure. compare: left vs right. steps: the list. */
        value?: string;
        /** English caption under a figure or beside a bar. */
        label?: string;
        a?: string;
        b?: string;
        aLabel?: string;
        bLabel?: string;
        items?: string[];
        highlightStep?: number;
    };
}

export interface MoneyScript {
    topicId: string;
    /** On-screen hook card, shown at 0s. Six words maximum. */
    hook: string;
    /** Spoken opening line -- may be longer than the hook card. */
    hookSaid: string;
    beats: ScriptBeat[];
    /** On-screen closing question. ENGLISH. */
    cta: string;
    /** Spoken closing line. HINDI. Distinct from `cta`, which is only drawn. */
    ctaSaid: string;
    /** Factual numeric claims, surfaced for review on the approve page. */
    numericClaims: string[];
}

const MAX_HOOK_WORDS = 6;
const MAX_ONSCREEN_WORDS = 6;
const MIN_BEATS = 3;
const MAX_BEATS = 5;

const buildPrompt = (topic: ScheduledTopic, violationsToFix: string[] = []): string => {
    const series = loadCurriculum().series;

    const retryNote = violationsToFix.length
        ? `\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED for these compliance violations. Fix them:\n${violationsToFix
              .map((v) => `- ${v}`)
              .join('\n')}\n`
        : '';

    return `You write scripts for "${series.name}", a Hindi personal-finance short-video series.
This episode teaches ONE idea from कदम ${topic.stepNumber} (${topic.stepTitle}).

TOPIC
Title: ${topic.title}
Hook idea: ${topic.hookIdea}
The single thing the viewer must learn: ${topic.teaches}
Key numbers to use: ${topic.keyNumbers.length ? topic.keyNumbers.join(', ') : '(none — do not invent any)'}

Suggested visual style: ${topic.visual}
Closing question: ${topic.cta}

REAL FACTS FOR THIS EPISODE — BUILD THE SCRIPT AROUND THESE
${topic.facts?.length
    ? topic.facts.map((f) => `- ${f}`).join('\n')
    : '(none supplied — say only what is true in general, and invent NO figures)'}

These are checked facts about how Indian money actually works. At least one of
them must carry the episode. A viewer can get "save money" anywhere; what they
cannot get anywhere is a specific, true number that changes how they see their
own situation. Lead with the fact, then say what it means for them.

Do NOT round these into vagueness ("a lot of interest"). The number IS the
content. And do not invent additional figures beyond what is given here.

AUDIENCE
Ordinary Indian salaried and self-employed people.

TWO LANGUAGES — THIS IS THE MOST COMMON MISTAKE, READ IT TWICE
- Everything SPOKEN is Hindi in Devanagari. That is the "say" field only.
- Everything SHOWN ON SCREEN is English. That is "hook", every "onScreen",
  every visual label, and "cta".
They are not translations of each other. The on-screen text is a short English
label for the idea; the spoken line is natural Hindi that explains it. A viewer
hears Hindi and reads English at the same time, and both must stand alone.

For the spoken Hindi: plain, warm, everyday speech. Keep English words only
where Indians genuinely use them (SIP, EMI, credit card, CIBIL). Never
condescending, never guilt-tripping.

LENGTH
About ${series.targetDurationSec} seconds spoken in total. That is roughly 75-90 Hindi words
across ALL the "say" fields combined. Count them.

STRUCTURE
- hook: the on-screen card at 0 seconds. ENGLISH. MAXIMUM ${MAX_HOOK_WORDS} words. Must create a question in the viewer's mind.
- hookSaid: the spoken opening line. HINDI. One sentence, may be longer than the hook card.
- beats: ${MIN_BEATS} to ${MAX_BEATS} beats. Each has:
    onScreen  — ENGLISH. MAXIMUM ${MAX_ONSCREEN_WORDS} words. Big text on screen. A label, not a sentence.
    say       — HINDI. The voiceover for that beat.
    caption   — ENGLISH. 8 to 16 words, a full sentence. This is the SOUND-OFF
                line, shown as a caption at the bottom. Most people watch muted
                the first time, so this must carry the point on its own. Say the
                same thing as "say", written for someone reading rather than
                listening. NOT a word-for-word translation — natural English.
    visual    — one of:
                  bigNumber (value, optional label) — one figure that lands hard
                  compare   (a, b, aLabel, bLabel)  — "a" is drawn GREEN as the better
                                                      outcome and "b" RED as the cost.
                                                      Never put the worse number in "a".
                  steps     (items: 2-4 short lines)
                  ladder    (highlightStep: 1-7, the step this episode belongs to)
                  clock     (optional label) — only for durations
- cta: the closing question shown on screen. ENGLISH. Must invite a comment, not a like.
- ctaSaid: the same closing question SPOKEN. HINDI. This one is read aloud; "cta" is only drawn.

NUMBERS: WRITTEN ON SCREEN, SPOKEN IN WORDS
The "say" fields are read aloud by a text-to-speech voice. It pronounces "₹"
and digit strings badly — "₹10,000" comes out as a stumble, not as money.
So in every "say" field, write numbers the way a person SAYS them, in Hindi
words with no symbols and no digits:

  WRONG   say: "₹10,000 अलग रखो"          →  reads as "rupees ten thousand" awkwardly
  RIGHT   say: "दस हज़ार रुपये अलग रखो"
  WRONG   say: "42% सालाना ब्याज"
  RIGHT   say: "सालाना बयालीस प्रतिशत ब्याज"

On screen it is the opposite: "onScreen" and visual values keep the symbols and
digits, because ₹10,000 LOOKS better than words. The viewer reads the figure and
hears it spoken naturally at the same time.

SOUND LIKE A PERSON, NOT A NEWSREADER
Write the "say" lines the way you would actually talk to a friend who is worried
about money. Short sentences. Natural pauses with commas. The odd everyday
filler is fine. Do not write in the polished register of written Hindi — write
what a warm, direct twenty-something would really say out loud.

NEVER REPEAT WHAT THE SCREEN ALREADY SHOWS
Two things are drawn on EVERY frame without you writing them: the series bar,
which already reads "${topic.stepTitleEn}", and on a ladder beat, the ladder
itself, which draws all seven rungs with this one lit up.
So an "onScreen" of "Step ${topic.stepNumber}" or "${topic.stepTitleEn}" says nothing —
the viewer is already reading it elsewhere in the same frame. On a ladder beat,
write the IDEA the ladder cannot express: what this rung buys you, or what
comes after it.

COMPLIANCE — THIS IS NOT OPTIONAL
This channel is financial EDUCATION, not investment advice. Under SEBI rules an
unregistered educator may explain what things are, and may NOT:
- name any specific stock, mutual fund, scheme, bank product or company
- state or imply any return figure or performance ("12% रिटर्न", "अच्छा रिटर्न देता है")
- use any share price, index level or market data
- tell the viewer to buy, sell, invest in or avoid anything specific
- predict any future price or market direction

Say what a thing IS and how it WORKS. Never say what to put money into.
Arithmetic about the viewer's own money (interest on their card, their monthly
saving, their emergency fund target) is fine and encouraged.
${retryNote}
OUTPUT
Respond with STRICT JSON only. No markdown fences, no commentary.
{
  "hook": "English, 6 words max",
  "hookSaid": "हिंदी में बोली जाने वाली पहली लाइन",
  "beats": [
    {
      "onScreen": "English label",
      "say": "इस बीट की हिंदी वॉयसओवर लाइन",
      "caption": "The same point in one full English sentence, for muted viewers",
      "visual": { "kind": "bigNumber", "value": "₹10,000", "label": "English label" }
    }
  ],
  "cta": "English closing question",
  "ctaSaid": "वही सवाल हिंदी में, जो बोला जाएगा",
  "numericClaims": ["only CHECKABLE figures — money, percentages, durations. NOT step numbers or beat counts."]
}`;
};

// ── Model providers ──────────────────────────────────────────────────────────

export type Provider = { name: string; enabled: boolean; run: (prompt: string) => Promise<string> };

const openAiProvider = (): Provider => ({
    name: 'openai/gpt-5.4',
    enabled: Boolean(OPENAI_API_KEY || process.env.OPENAI_API_KEY),
    run: async (prompt: string) => {
        const key = OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-5.4',
                messages: [
                    { role: 'system', content: 'You output strict JSON only.' },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                max_completion_tokens: 1200,
                temperature: 0.6,
            }),
            signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() ?? '';
    },
});

const geminiProvider = (): Provider => ({
    name: 'gemini-2.5-flash',
    enabled: Boolean(GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    run: async (prompt: string) => {
        const key = GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.6,
                        maxOutputTokens: 2048,
                        responseMimeType: 'application/json',
                    },
                }),
                signal: AbortSignal.timeout(60_000),
            },
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
});

/**
 * Tries each configured provider in order. Unlike the Rajneeti generator, a
 * failure in the first provider falls through to the next instead of throwing.
 */
export async function callModel(prompt: string, injected?: Provider[]): Promise<string> {
    const providers = (injected ?? [openAiProvider(), geminiProvider()]).filter((p) => p.enabled);
    if (!providers.length) {
        throw new Error('[money] Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured.');
    }

    const failures: string[] = [];
    for (const provider of providers) {
        try {
            console.log(`[money] Generating script via ${provider.name}...`);
            const out = await provider.run(prompt);
            if (out.trim()) return out;
            failures.push(`${provider.name}: empty response`);
        } catch (err: any) {
            console.warn(`[money] ${provider.name} failed: ${err.message}`);
            failures.push(`${provider.name}: ${err.message}`);
        }
    }
    throw new Error(`[money] All providers failed — ${failures.join(' | ')}`);
}

// ── Parsing and validation ───────────────────────────────────────────────────

const stripFences = (raw: string): string =>
    raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * The two-language split is enforced, not merely requested.
 *
 * Everything drawn on screen is English and everything spoken is Hindi, and the
 * single most likely LLM failure is to translate one into the other — which
 * would render Devanagari in a composition that no longer loads a Devanagari
 * font, producing tofu boxes rather than an obvious error.
 */
export const languageIssues = (script: MoneyScript): string[] => {
    const issues: string[] = [];

    const mustBeEnglish: [string, string][] = [
        ['hook', script.hook],
        ['cta', script.cta],
        ...script.beats.flatMap((b, i): [string, string][] => [
            [`beat ${i} onScreen`, b.onScreen],
            [`beat ${i} caption`, b.caption],
            ...(b.visual?.label ? ([[`beat ${i} visual.label`, b.visual.label]] as [string, string][]) : []),
        ]),
    ];
    for (const [field, value] of mustBeEnglish) {
        if (value && DEVANAGARI.test(value)) {
            issues.push(`${field} must be ENGLISH but contains Devanagari: "${value}"`);
        }
    }

    if (script.hookSaid && !DEVANAGARI.test(script.hookSaid)) {
        issues.push('hookSaid must be spoken HINDI in Devanagari');
    }
    if (script.ctaSaid && !DEVANAGARI.test(script.ctaSaid)) {
        issues.push('ctaSaid must be spoken HINDI in Devanagari');
    }
    script.beats.forEach((b, i) => {
        if (b.say && !DEVANAGARI.test(b.say)) {
            issues.push(`beat ${i} say must be spoken HINDI in Devanagari`);
        }
    });

    // Symbols and digits in a SPOKEN line are read out badly by TTS — "₹10,000"
    // came back as a stumbled "rupees rs" in the first real episode. On screen
    // they are exactly what we want; in the voice they have to be words.
    const spoken: [string, string][] = [
        ['hookSaid', script.hookSaid],
        ['ctaSaid', script.ctaSaid],
        ...script.beats.map((b, i): [string, string] => [`beat ${i} say`, b.say]),
    ];
    for (const [field, value] of spoken) {
        if (!value) continue;
        const offenders = value.match(/[₹$%]|\d+/g);
        if (offenders) {
            issues.push(
                `${field} contains ${offenders.join(', ')} — spoken lines must spell numbers ` +
                    'in Hindi words (दस हज़ार रुपये), because the voice mispronounces symbols and digits',
            );
        }
    }

    return issues;
};

/**
 * Mirrors the discriminated union in reel-studio/src/lib/moneySchema.ts.
 *
 * Checked HERE, in the retry loop, rather than left to the schema at render
 * time. A model that returns `{kind:"ladder"}` with no highlightStep, or a
 * `steps` list of five items, produces a board that zod rejects inside
 * Remotion — which is after the voiceover has been generated and paid for.
 * Catching it here costs one regeneration instead.
 */
function visualIssues(visual: ScriptBeat['visual'], at: string): string[] {
    const need = (field: string, ok: boolean) => (ok ? [] : [`${at}: visual.${field} is required for kind "${visual.kind}"`]);

    switch (visual.kind) {
        case 'bigNumber':
            return need('value', Boolean(visual.value?.trim()));
        case 'compare':
            return [...need('a', Boolean(visual.a?.trim())), ...need('b', Boolean(visual.b?.trim()))];
        case 'steps': {
            const n = visual.items?.length ?? 0;
            return n >= 2 && n <= 4 ? [] : [`${at}: visual.items must hold 2-4 lines, got ${n}`];
        }
        case 'ladder': {
            const s = visual.highlightStep;
            return Number.isInteger(s) && (s as number) >= 1 && (s as number) <= 7
                ? []
                : [`${at}: visual.highlightStep must be an integer 1-7, got ${String(s)}`];
        }
        case 'clock':
            return [];
        default:
            return [`${at}: visual.kind "${String(visual.kind)}" is not renderable`];
    }
}

/**
 * Keeps only figures a human could actually go and check.
 *
 * The generator returns its own list, and the first real run put "1" in it —
 * lifted from "कदम 1". A bare ordinal is not a claim: it tells the reviewer on
 * the approve page nothing, and a review list padded with noise is one that
 * stops being read. A figure earns its place by carrying money, a percentage,
 * a unit, or enough magnitude to be wrong.
 */
export function checkableClaims(claims: string[]): string[] {
    return (claims ?? [])
        .map((c) => (c ?? '').trim())
        .filter(Boolean)
        .filter((c) => {
            if (!/\d/.test(c)) return false;
            // Currency, percentage, or a multiplier — always checkable.
            // The multiplier is matched as digit-then-x: \bx\b never fires in
            // "2x", because a digit and a letter are both word characters and
            // there is no boundary between them.
            if (/[₹$%]|\d\s*[x×]\b|गुना/i.test(c)) return true;
            // A unit of time or money alongside the number.
            if (/\b(month|months|year|years|day|days|week|weeks|lakh|crore|thousand|hazaar)\b|महीन|साल|दिन|हफ़्त|हज़ार|लाख|करोड़/i.test(c)) return true;
            // Otherwise require real magnitude: a lone 1-9 is an ordinal.
            return /\d{2,}/.test(c);
        });
}

/** Structural problems that make a script unrenderable. */
export function structuralIssues(script: MoneyScript, topic?: ScheduledTopic): string[] {
    const issues: string[] = [];

    if (!script.hook?.trim()) issues.push('hook is empty');
    else if (wordCount(script.hook) > MAX_HOOK_WORDS) {
        issues.push(`hook is ${wordCount(script.hook)} words, maximum is ${MAX_HOOK_WORDS}`);
    }

    if (!script.hookSaid?.trim()) issues.push('hookSaid is empty');
    if (!script.cta?.trim()) issues.push('cta is empty');
    if (!script.ctaSaid?.trim()) issues.push('ctaSaid is empty — nothing would be spoken at the close');

    if (!Array.isArray(script.beats) || script.beats.length < MIN_BEATS) {
        issues.push(`expected at least ${MIN_BEATS} beats, got ${script.beats?.length ?? 0}`);
    } else if (script.beats.length > MAX_BEATS) {
        issues.push(`expected at most ${MAX_BEATS} beats, got ${script.beats.length}`);
    }

    (script.beats ?? []).forEach((beat, i) => {
        if (!beat.onScreen?.trim()) issues.push(`beat ${i}: onScreen is empty`);
        else if (wordCount(beat.onScreen) > MAX_ONSCREEN_WORDS) {
            issues.push(`beat ${i}: onScreen is ${wordCount(beat.onScreen)} words, maximum is ${MAX_ONSCREEN_WORDS}`);
        }
        if (!beat.say?.trim()) issues.push(`beat ${i}: say is empty`);
        if (!beat.caption?.trim()) {
            issues.push(`beat ${i}: caption is empty — a muted viewer would get nothing from this beat`);
        } else {
            const n = wordCount(beat.caption);
            if (n < 5) issues.push(`beat ${i}: caption is ${n} words; too short to carry the point alone`);
            if (n > 20) issues.push(`beat ${i}: caption is ${n} words; too long to read before the beat ends`);
        }
        if (!beat.visual?.kind) issues.push(`beat ${i}: visual.kind is missing`);
        else issues.push(...visualIssues(beat.visual, `beat ${i}`));

        // The series bar draws the step title on every frame, and a ladder beat
        // draws the lit rung as well. Beat text that repeats either one spends
        // the largest type on screen saying what the viewer is already reading.
        if (topic && beat.onScreen?.trim()) {
            const flat = beat.onScreen.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
            if (flat === `step ${topic.stepNumber}` || flat === topic.stepTitleEn.toLowerCase().replace(/[^a-z0-9 ]/g, '')) {
                issues.push(
                    `beat ${i}: onScreen "${beat.onScreen}" repeats the series bar — ` +
                        'say what this step BUYS the viewer instead',
                );
            }
        }
    });

    return issues;
}

/** Every piece of text that will reach a viewer, for the compliance sweep. */
export function scriptSurfaceText(script: MoneyScript): string {
    return [
        script.hook,
        script.hookSaid,
        script.cta,
        script.ctaSaid,
        ...(script.beats ?? []).flatMap((b) => [b.onScreen, b.say, b.caption]),
    ]
        .filter(Boolean)
        .join('\n');
}

function parseScript(raw: string, topic: ScheduledTopic): MoneyScript {
    const parsed = JSON.parse(stripFences(raw));
    return {
        topicId: topic.id,
        hook: parsed.hook ?? '',
        hookSaid: parsed.hookSaid ?? '',
        beats: Array.isArray(parsed.beats) ? parsed.beats : [],
        cta: parsed.cta ?? '',
        ctaSaid: parsed.ctaSaid ?? topic.cta,
        // Filtered here rather than trusted: the model's own list is padded
        // with ordinals lifted from the prose.
        numericClaims: checkableClaims(Array.isArray(parsed.numericClaims) ? parsed.numericClaims : []),
    };
}

/**
 * Generates a compliant, renderable script for one topic.
 *
 * A draft that trips the compliance lint is regenerated ONCE with the specific
 * violations fed back. A second violation throws: publishing unreviewed
 * financial advice is worse than skipping a day.
 */
export async function generateMoneyScript(topic: ScheduledTopic): Promise<MoneyScript> {
    let violationsToFix: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
        const raw = await callModel(buildPrompt(topic, violationsToFix));

        let script: MoneyScript;
        try {
            script = parseScript(raw, topic);
        } catch (err: any) {
            if (attempt === 2) throw new Error(`[money] Script JSON unparseable: ${err.message}`);
            violationsToFix = ['Previous output was not valid JSON. Return strict JSON only.'];
            continue;
        }

        const structural = [...structuralIssues(script, topic), ...languageIssues(script)];
        const compliance = complianceViolations(scriptSurfaceText(script)).map(
            (v) => `${v.rule}: ${v.why}`,
        );
        const problems = [...structural, ...compliance];

        if (problems.length === 0) {
            console.log(
                `[money] Script ok for ${topic.id} — ${script.beats.length} beats, ` +
                    `${wordCount(scriptSurfaceText(script))} words, ${script.numericClaims.length} numeric claim(s).`,
            );
            return script;
        }

        if (attempt === 2) {
            throw new Error(
                `[money] Script for ${topic.id} still invalid after retry:\n  - ${problems.join('\n  - ')}`,
            );
        }

        console.warn(`[money] Draft rejected for ${topic.id}, retrying:\n  - ${problems.join('\n  - ')}`);
        violationsToFix = problems;
    }

    throw new Error('[money] unreachable');
}

/**
 * Full voiceover text, in playback order. Derived so it can never drift from
 * the beats.
 *
 * Uses ctaSaid, NOT cta. After the on-screen text moved to English, `cta`
 * became a drawn-only string; feeding it here made ElevenLabs read an English
 * sentence at the end of an otherwise Hindi read.
 */
export function voiceoverText(script: MoneyScript): string {
    // Coerce before trimming: a missing field should degrade to a shorter
    // voiceover, not throw. `structuralIssues` is what rejects an empty one.
    return [script.hookSaid, ...script.beats.map((b) => b.say), script.ctaSaid]
        .map((s) => (s ?? '').trim())
        .filter(Boolean)
        .join(' ');
}
