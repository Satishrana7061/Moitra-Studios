/**
 * Curriculum loader, ordering and compliance lint for the पैसे की सीढ़ी channel.
 *
 * This replaces the news feed. The Rajneeti pipeline depends on RSS -> LLM -> DB
 * and dies when the feed returns nothing (processing_log is full of "No relevant
 * articles found", 0 fetched). Here the content is a static, ordered list, so a
 * run can only fail for reasons we control.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CURRICULUM_PATH = path.resolve(__dirname, '..', '..', '..', 'content', 'money-ladder.json');

export type VisualKind = 'bigNumber' | 'ladder' | 'compare' | 'steps' | 'clock' | 'worked' | 'compound';

export interface Topic {
    id: string;
    title: string;
    hookIdea: string;
    teaches: string;
    keyNumbers: string[];
    /**
     * Real, checkable statements about how Indian consumer finance works.
     *
     * This is what separates an episode from generic advice. The first real
     * script came back saying nothing a viewer did not already suspect, because
     * the topic gave the model one invented target figure and nothing else.
     *
     * Strictly the cost of debt and published rates — never investment returns,
     * which is both the SEBI line and the more interesting material anyway.
     */
    facts?: string[];
    /**
     * Permits this topic to draw a growth rate, via the `compound` visual.
     *
     * Off everywhere unless deliberately set. Compounding is the channel's
     * strongest idea and its largest compliance exposure, and the difference
     * between education and a performance claim is entirely in the framing — so
     * the framing is enforced rather than requested. A topic carrying this flag
     * must satisfy every protection in `illustrationIssues`; a topic without it
     * cannot use the visual at all.
     */
    illustrativeReturns?: boolean;
    /**
     * The finished script, written by hand rather than generated per run.
     *
     * The daily pipeline used to call a model here, and that made an external
     * API a dependency of every episode — which is precisely the fragility that
     * killed the news channel. It can be out of credits, rate limited, or
     * quietly worse after a model update, and each of those stops the channel.
     * (It did: a zero OpenAI balance took down a run, and the fallback built
     * for that case turned out to be a dead branch.)
     *
     * Written once, checked once, reused forever. Typed as `unknown` because
     * the real shape is `MoneyScript`, which lives in moneyScriptGenerator —
     * and that module imports this one. `getStoredScript` does the narrowing.
     */
    script?: unknown;
    visual: VisualKind;
    cta: string;
}

export interface Step {
    step: number;
    slug: string;
    /** Hindi. Reference only — never rendered. */
    title: string;
    /** English. This is what appears in the on-screen series bar. */
    titleEn: string;
    goal: string;
    outlineOnly?: boolean;
    plannedTopics?: string[];
    topics: Topic[];
}

/**
 * The rendered ladder labels, mirrored from reel-studio/src/lib/ladder.ts.
 *
 * Duplicated deliberately: the backend cannot import from the Remotion package,
 * and the two lists silently drifting apart would put one label on the ladder
 * and a different one in the series bar of the same frame. `validateCurriculum`
 * asserts they agree, so the duplication is checked rather than trusted.
 */
export const LADDER_STEPS_EN = [
    'First ₹10,000',
    'Clear the debt',
    '6-month fund',
    'Right insurance',
    'Investing habit',
    'Your own home',
    'The future',
] as const;

export interface Curriculum {
    series: {
        name: string;
        tagline: string;
        language: string;
        disclaimer: string;
        targetDurationSec: number;
    };
    steps: Step[];
}

/** A topic with its position in the overall running order. */
export interface ScheduledTopic extends Topic {
    stepNumber: number;
    /** Hindi step title — reference only, never rendered. */
    stepTitle: string;
    /** English step title — this is what the on-screen series bar draws. */
    stepTitleEn: string;
    stepSlug: string;
    /** 1-based position across the whole curriculum; drives the episode number. */
    order: number;
}

const VISUAL_KINDS: VisualKind[] = ['bigNumber', 'ladder', 'compare', 'steps', 'clock', 'worked', 'compound'];

let cached: Curriculum | null = null;

export function loadCurriculum(filePath: string = CURRICULUM_PATH): Curriculum {
    if (cached) return cached;
    if (!fs.existsSync(filePath)) {
        throw new Error(`[money] Curriculum not found at ${filePath}`);
    }
    cached = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Curriculum;
    return cached;
}

/**
 * Every writable topic, flattened in running order. Steps marked outlineOnly
 * contribute nothing until their topics are written.
 */
export function getAllTopics(curriculum: Curriculum = loadCurriculum()): ScheduledTopic[] {
    const out: ScheduledTopic[] = [];
    for (const step of curriculum.steps) {
        for (const topic of step.topics ?? []) {
            out.push({
                ...topic,
                stepNumber: step.step,
                stepTitle: step.title,
                stepTitleEn: step.titleEn,
                stepSlug: step.slug,
                order: out.length + 1,
            });
        }
    }
    return out;
}

/**
 * The next topic to produce: first in curriculum order that has not been used.
 * Returns null when the written curriculum is exhausted -- the caller should
 * treat that as "time to write more topics", not as an error.
 */
export function getNextTopic(usedIds: Iterable<string>): ScheduledTopic | null {
    const used = new Set(usedIds);
    return getAllTopics().find((t) => !used.has(t.id)) ?? null;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationIssue {
    topicId: string;
    field: string;
    message: string;
}

/**
 * Patterns that would put the channel outside SEBI's permitted "general
 * financial awareness" zone. The January 2025 circular allows explaining what
 * instruments ARE, and forbids recommending a security, performance claims,
 * price data from the last three months, and implying future prices.
 *
 * This lint runs over the curriculum AND is reused on generated scripts, so a
 * violation is caught before anything is rendered, let alone published.
 */
const COMPLIANCE_RULES: { name: string; pattern: RegExp; why: string }[] = [
    {
        name: 'return-figure',
        // "12% return", "15 प्रतिशत रिटर्न", "returns of 20%"
        pattern: /(\d+(?:\.\d+)?\s*%[^।.\n]{0,20}(?:return|रिटर्न|मुनाफ|profit))|((?:return|रिटर्न)[^।.\n]{0,20}\d+(?:\.\d+)?\s*%)/i,
        why: 'performance claim — SEBI prohibits return figures for unregistered educators',
    },
    {
        name: 'buy-sell',
        // Must match BOTH word orders. Hindi is verb-final ("शेयर खरीदें"),
        // English is verb-first ("buy shares"), and \b does not behave with
        // Devanagari, so the Hindi alternatives are matched without it.
        pattern: new RegExp(
            [
                '\\b(?:buy|sell)\\b[^।.\\n]{0,24}\\b(?:stocks?|shares?|funds?)\\b',
                '\\b(?:stocks?|shares?|funds?)\\b[^।.\\n]{0,24}\\b(?:buy|sell)\\b',
                '(?:शेयर|स्टॉक|फंड)[^।.\\n]{0,24}(?:खरीद|बेच)',
                '(?:खरीद|बेच)[^।.\\n]{0,24}(?:शेयर|स्टॉक|फंड)',
            ].join('|'),
            'i',
        ),
        why: 'recommendation framing — education may not tell the viewer to transact',
    },
    {
        name: 'ticker',
        // NSE/BSE-style all-caps tickers, and common recommendation shorthand.
        pattern: /\b(NSE|BSE)\s*:\s*[A-Z]{2,}|\b[A-Z]{4,}\s*(?:के शेयर|shares?)\b/,
        why: 'named security — prohibited outside registered advice',
    },
    {
        name: 'named-product',
        // The single most important line for this channel, and it was missing.
        // SEBI's concern is unregistered people steering money toward specific
        // products; a compounding lesson that names no vehicle is education,
        // and the same lesson with "invest this in a mutual fund" attached is
        // not. The prompt used to list SIP as an approved loanword, which
        // invited exactly this.
        // Narrower than the first attempt, and a test caught why. SEBI's
        // circular explicitly PERMITS explaining what a SIP or a mutual fund
        // is — that is general financial awareness. What it restricts is
        // steering money into one. So the product name alone is fine and only
        // becomes a violation next to an instruction to put money in.
        //
        //   allowed:   "SIP का मतलब क्या है"        (what a SIP means)
        //   violation: "SIP में निवेश करो"          (put money into a SIP)
        pattern: new RegExp(
            [
                '(?:mutual\\s*funds?|म्यूचुअल|\\bSIPs?\\b|एसआईपी|\\bELSS\\b|index\\s*funds?|इंडेक्स\\s*फंड)' +
                    '[^।.\\n]{0,28}(?:invest|निवेश|डाल|लगा\\s*द|खरीद|buy|put\\s+(?:your\\s+)?money)',
                '(?:invest|निवेश|डाल|लगा\\s*द|खरीद|buy|put\\s+(?:your\\s+)?money)' +
                    '[^।.\\n]{0,28}(?:mutual\\s*funds?|म्यूचुअल|\\bSIPs?\\b|एसआईपी|\\bELSS\\b|index\\s*funds?|इंडेक्स\\s*फंड)',
            ].join('|'),
            'i',
        ),
        why: 'steers money into a named product — explain the mechanism, never the vehicle',
    },
    {
        name: 'named-issuer',
        // The prompt has always promised not to "name any specific stock,
        // mutual fund, scheme, bank product or company", and nothing enforced
        // it — so the fact researcher cheerfully returned "an SBI credit card
        // charges 3.75% per month". Precise, correct, sourced, and exactly the
        // thing that turns education into something a named company can object
        // to. The RATE is the lesson; whose card it is never is.
        //
        // Regulators and bureaus are deliberately absent from this list. "RBI
        // says", "your CIBIL score" and "UPI" are how you make a claim
        // checkable, not who you are steering money toward.
        pattern: /\b(?:SBI|HDFC|ICICI|Axis\s*Bank|Kotak|IndusInd|Yes\s*Bank|IDFC|RBL|Bajaj\s*Fin(?:serv|ance)|Paytm|PhonePe|Slice|OneCard|American\s*Express|Amex|Citibank|Standard\s*Chartered|AU\s*Small|LIC|Max\s*Life|Tata\s*AIA|Bajaj\s*Allianz|Star\s*Health|Niva\s*Bupa|Care\s*Health|Aditya\s*Birla)\b/i,
        why: 'names a specific bank or issuer — give the figure, never the company',
    },
    {
        name: 'price-prediction',
        pattern: /(target price|टारगेट प्राइस|will (?:rise|fall|double)|दोगुना हो जाएगा|बढ़ेगा ही)/i,
        why: 'implies a future price',
    },
];

/** Runs the compliance lint over arbitrary text. Returns matched rule names. */
export function complianceViolations(text: string): { rule: string; why: string }[] {
    return COMPLIANCE_RULES.filter((r) => r.pattern.test(text)).map((r) => ({
        rule: r.name,
        why: r.why,
    }));
}

export function validateCurriculum(curriculum: Curriculum = loadCurriculum()): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seenIds = new Set<string>();

    for (const step of curriculum.steps) {
        // The series bar draws titleEn while the ladder visual draws its own
        // label for the same step. If they disagree, one frame shows two
        // different names for the same rung.
        const expected = LADDER_STEPS_EN[step.step - 1];
        if (!step.titleEn) {
            issues.push({ topicId: step.slug, field: 'titleEn', message: 'missing — the series bar renders this' });
        } else if (expected && step.titleEn !== expected) {
            issues.push({
                topicId: step.slug,
                field: 'titleEn',
                message: `"${step.titleEn}" does not match the ladder label "${expected}"`,
            });
        }

        if (step.outlineOnly) {
            if ((step.topics ?? []).length > 0) {
                issues.push({
                    topicId: step.slug,
                    field: 'outlineOnly',
                    message: 'step is marked outlineOnly but has topics; drop the flag',
                });
            }
            continue;
        }

        for (const topic of step.topics ?? []) {
            const at = (field: string, message: string) =>
                issues.push({ topicId: topic.id, field, message });

            if (!topic.id) at('id', 'missing');
            if (seenIds.has(topic.id)) at('id', 'duplicate id');
            seenIds.add(topic.id);

            if (!topic.title?.trim()) at('title', 'missing');
            if (!topic.hookIdea?.trim()) at('hookIdea', 'missing');
            if (!topic.teaches?.trim()) at('teaches', 'missing');
            if (!topic.cta?.trim()) at('cta', 'missing');

            if (!VISUAL_KINDS.includes(topic.visual)) {
                at('visual', `"${topic.visual}" is not one of ${VISUAL_KINDS.join(', ')}`);
            }

            // The hook is rendered as an on-screen card. Long hooks are the
            // single most common way an auto-generated reel becomes unreadable.
            const hookWords = topic.hookIdea.trim().split(/\s+/).length;
            if (hookWords > 8) at('hookIdea', `${hookWords} words; keep it to 8 or fewer`);

            for (const field of ['title', 'hookIdea', 'teaches', 'cta'] as const) {
                for (const v of complianceViolations(topic[field])) {
                    at(field, `compliance/${v.rule}: ${v.why}`);
                }
            }

            // Facts were exempt from the sweep, and they are the LEAST safe
            // field in the file: the others were written by a person, while
            // these arrive from a web search and go straight into the prompt as
            // the material the episode is built around. A researched claim that
            // breaks a rule does not stay in the curriculum — it gets written
            // into a script, spoken aloud, and shown to the reviewer as a
            // sourced figure.
            (topic.facts ?? []).forEach((fact, i) => {
                for (const v of complianceViolations(fact)) {
                    at(`facts[${i}]`, `compliance/${v.rule}: ${v.why} — "${fact.slice(0, 60)}…"`);
                }
            });
        }
    }

    return issues;
}

export function curriculumStats(curriculum: Curriculum = loadCurriculum()) {
    const written = getAllTopics(curriculum);
    const outlined = curriculum.steps
        .filter((s) => s.outlineOnly)
        .reduce((n, s) => n + (s.plannedTopics?.length ?? 0), 0);
    const withFacts = written.filter((t) => (t.facts?.length ?? 0) > 0);
    return {
        /** Topics carrying real facts. The rest will produce generic scripts. */
        topicsWithFacts: withFacts.length,
        topicsNeedingFacts: written.filter((t) => !(t.facts?.length ?? 0)).map((t) => t.id),
        // Reported the same way as facts, because it is the same kind of debt:
        // a topic without a written script still falls back to a model, which
        // is the dependency this channel is getting rid of.
        topicsWithScript: written.filter((t) => Array.isArray((t.script as any)?.beats)).length,
        topicsNeedingScript: written
            .filter((t) => !Array.isArray((t.script as any)?.beats))
            .map((t) => t.id),
        writtenTopics: written.length,
        outlinedTopics: outlined,
        stepsWritten: curriculum.steps.filter((s) => !s.outlineOnly).length,
        stepsTotal: curriculum.steps.length,
        daysOfContent: written.length,
    };
}
