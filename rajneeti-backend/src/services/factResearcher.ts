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

5. If you cannot find a solid current source for a claim, return fewer facts.
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
{"facts":[{"text":"one plain English sentence including the figure","volatile":true}]}

Set "volatile" true when the number resets on a schedule (a quarterly rate, an
annual limit) and false when it is structural and stable (how interest is
charged, whether a grace period exists).

If there are no solid citable facts for this topic, return {"facts":[]}.`;

    const { text, sources } = await searchAsk(prompt);

    let parsed: { facts?: { text?: string; volatile?: boolean }[] };
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

    return (parsed.facts ?? [])
        .map((f) => (f?.text ?? '').trim())
        .filter(Boolean)
        .map((textLine, i): ResearchedFact => ({
            text: textLine,
            // Citations come back for the response as a whole rather than per
            // fact, so the first is attached and the rest are kept reachable by
            // ordering. Better than dropping them.
            source: primary[i] ?? primary[0] ?? '',
            checkedOn,
            volatile: Boolean((parsed.facts ?? [])[i]?.volatile),
        }))
        .filter((f) => {
            if (f.source) return true;
            // No citation means it did not really look it up. Per the probe,
            // that is precisely the case where the answer is a year out of date.
            console.warn(`[facts] ${topic.id}: dropping an uncited claim — "${f.text.slice(0, 60)}…"`);
            return false;
        });
}
