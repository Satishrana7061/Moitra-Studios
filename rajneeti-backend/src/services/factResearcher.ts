/**
 * Finds a real, citable fact for a curriculum topic.
 *
 * The probe (probeFactSources.ts) settled the design question this rests on.
 * Asked the same eight questions with and without web search, the no-tools path
 * was a YEAR stale on everything that moves — repo rate 5.50% when it is 5.25%,
 * PPF quoted for the July 2025 quarter in mid-2026 — and stated both with
 * complete confidence. The search path matched independently-verified reality
 * and cited primary sources (rbi.org.in, incometaxindia.gov.in, nsiindia.gov.in,
 * pib.gov.in, cibil.com).
 *
 * So facts are researched with search, and every one keeps its source URL and
 * the date it was checked. A number with no source is not usable on a channel
 * whose whole value is being the one that tells you the real figure.
 *
 * IMPORTANT: this runs when the curriculum is written, never in the daily reel
 * run. Facts are baked into content/money-ladder.json and reused. Putting a live
 * search in the morning cron would reintroduce exactly the external-feed
 * fragility that killed the news channel, and would pay for a lookup of a number
 * that did not change overnight.
 */

export interface ResearchedFact {
    /** The claim, written to be spoken about — plain, specific, one sentence. */
    text: string;
    /** Where it came from. Empty means the model would not cite; treat as unusable. */
    source: string;
    /** ISO date the lookup ran, so staleness is visible later. */
    checkedOn: string;
    /** True when the underlying number resets on a schedule and will go stale. */
    volatile: boolean;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4';

const SYSTEM = `You research verifiable facts about Indian consumer finance for a
short-video series that teaches ordinary people how money works.

RULES, IN ORDER OF IMPORTANCE

1. Every fact must be CHECKABLE and CURRENT. Search for it. Do not answer from
   memory — rates and limits in India change on a schedule and a confident stale
   number is worse than no number.

2. Prefer PRIMARY sources: rbi.org.in, incometaxindia.gov.in, nsiindia.gov.in,
   epfindia.gov.in, pib.gov.in, cibil.com, sebi.gov.in. A news article is
   acceptable only if no primary source carries the figure.

3. Facts must be about THE COST OF DEBT, published rates, statutory limits, or
   how a product mechanically works. NEVER about investment returns, never a
   recommendation, never a prediction. This channel is financial education under
   SEBI rules, not investment advice — naming a stock or claiming a return would
   end it.

4. Prefer the surprising over the obvious. "Save money" is not a fact. "A credit
   card cash advance starts charging interest the same day, with no
   interest-free period" is.

5. NEVER name the bank, card issuer or company in the fact text — no "SBI",
   "HDFC", "Axis", "Bajaj". Cite their page as the source by all means, but
   write the claim as "a major Indian card issuer" or "a large Indian bank".
   The rate is the lesson; whose product it is never is, and naming them turns
   education into something a company can object to. Regulators and bureaus are
   different and SHOULD be named: "RBI says", "your CIBIL score".

6. If you cannot find a solid current source for a claim, return fewer facts.
   Returning nothing is correct and expected for some topics. Never pad.

Write each fact as ONE plain English sentence a person could repeat out loud.
Include the figure. Do not hedge with "approximately" unless the source does.`;

/** Asks with web search enabled, returning the raw text and its citations. */
async function searchAsk(prompt: string): Promise<{ text: string; sources: string[] }> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set.');

    const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: MODEL,
            tools: [{ type: 'web_search' }],
            input: `${SYSTEM}\n\n${prompt}`,
        }),
        signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`Responses API ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const data: any = await res.json();
    let text = '';
    const sources = new Set<string>();
    for (const item of data.output ?? []) {
        for (const part of item.content ?? []) {
            if (typeof part.text === 'string') text += part.text;
            for (const ann of part.annotations ?? []) if (ann.url) sources.add(ann.url);
        }
    }
    if (!text && typeof data.output_text === 'string') text = data.output_text;
    return { text: text.trim(), sources: [...sources] };
}

/** Strips the tracking parameter the search tool appends to every citation. */
const cleanUrl = (u: string): string => u.replace(/[?&]utm_source=openai/g, '');

/**
 * Two to three facts for one topic, each with a source.
 *
 * Returns [] rather than inventing something when the topic has no hard numbers
 * behind it — plenty of good topics ("tell your family about the fund") are
 * about behaviour, not figures, and padding those with a vague statistic is how
 * a channel stops being trusted.
 */
export async function researchTopic(topic: {
    id: string;
    title: string;
    teaches: string;
}): Promise<ResearchedFact[]> {
    const prompt = `Topic: ${topic.title}
What it teaches: ${topic.teaches}

Find up to THREE current, checkable facts about Indian consumer finance that
would make this topic concrete and surprising. Search for each one.

Respond with STRICT JSON only, no markdown fences:
{"facts":[{"text":"one plain English sentence including the figure","source":"https://the-page-you-took-it-from","volatile":true}]}

"source" is REQUIRED and must be the actual URL you read the figure on — the
specific page, not a homepage, and not a search result. A fact without a real
source URL is unusable here and will be discarded, so if you cannot give one,
leave the fact out entirely.

Set "volatile" true when the number resets on a schedule (a quarterly rate, an
annual limit) and false when it is structural and stable (how interest is
charged, whether a grace period exists).

If there are no solid citable facts for this topic, return {"facts":[]}.`;

    const { text, sources } = await searchAsk(prompt);

    let parsed: { facts?: { text?: string; source?: string; volatile?: boolean }[] };
    try {
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        // The model sometimes wraps JSON in prose despite instructions.
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        parsed = JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
    } catch {
        console.warn(`[facts] ${topic.id}: could not parse a response; skipping.`);
        return [];
    }

    const checkedOn = new Date().toISOString().slice(0, 10);
    const primary = sources.map(cleanUrl);

    const raw = (parsed.facts ?? []).filter((f) => (f?.text ?? '').trim());

    const facts = raw
        .map((f, i): ResearchedFact => ({
            text: (f.text ?? '').trim(),
            // The model's own reported URL first, annotations second.
            //
            // Annotations alone did not work, and the reason was a contradiction
            // in this very function: OpenAI attaches url_citation annotations to
            // spans of PROSE, and the prompt above demands strict JSON. A
            // JSON-only reply has no prose to annotate, so `sources` came back
            // empty every time and all twenty topics of a run were discarded as
            // "uncited" — after paying for twenty web searches. The requirement
            // and the output format were mutually exclusive as written.
            source: cleanUrl((f.source ?? '').trim()) || primary[i] || primary[0] || '',
            checkedOn,
            volatile: Boolean(f.volatile),
        }))
        .filter((f) => {
            // Still dropped without a source. The probe showed that an answer
            // the model will not cite is exactly the one that is a year stale,
            // and a wrong number is worse for this channel than no number. But
            // it must be possible to SUPPLY one, which is what changed.
            if (/^https?:\/\/\S+\.\S+/.test(f.source)) return true;
            console.warn(
                `[facts] ${topic.id}: dropping an uncited claim — "${f.text.slice(0, 60)}…"` +
                    (f.source ? ` (source "${f.source.slice(0, 40)}" is not a usable URL)` : ' (no source given)'),
            );
            return false;
        });

    // Distinguishing these two was not cosmetic. The old message said "no
    // citable facts — this topic is about behaviour, not numbers" whenever
    // nothing survived, which blamed the TOPIC for what was a bug in this
    // function, and made a run that found twenty good facts and discarded all
    // of them look like a correct and uninteresting result.
    if (!facts.length && raw.length) {
        console.warn(
            `[facts] ${topic.id}: found ${raw.length} claim(s) but kept none — every one lacked a usable source.`,
        );
    }
    return facts;
}
