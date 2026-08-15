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
      "visual": { "kind": "bigNumber", "value": "₹10,000", "label": "English label" }
    }
  ],
  "cta": "English closing question",
  "ctaSaid": "वही सवाल हिंदी में, जो बोला जाएगा",
  "numericClaims": ["every factual number you stated, so a human can check it"]
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

/** Structural problems that make a script unrenderable. */
export function structuralIssues(script: MoneyScript): string[] {
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
        if (!beat.visual?.kind) issues.push(`beat ${i}: visual.kind is missing`);
        else issues.push(...visualIssues(beat.visual, `beat ${i}`));
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
        ...(script.beats ?? []).flatMap((b) => [b.onScreen, b.say]),
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
        numericClaims: Array.isArray(parsed.numericClaims) ? parsed.numericClaims : [],
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

        const structural = [...structuralIssues(script), ...languageIssues(script)];
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
