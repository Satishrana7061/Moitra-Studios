/**
 * Does the OpenAI key actually fetch current Indian rates, or does it recite
 * them from training and sound equally confident either way?
 *
 * This is the question the whole `facts` decision turns on. A model asked "what
 * is the PPF rate" will answer with the same certainty whether it looked it up
 * this second or memorised it two years ago — and on a finance channel a stale
 * number stated confidently is worse than no number at all.
 *
 * So: ask the SAME questions down two paths and print both.
 *
 *   plain  — chat completions, no tools. What the pipeline does today.
 *   search — Responses API with the web_search tool, which returns citations.
 *
 * If the two disagree, the plain path is demonstrably unreliable for anything
 * time-sensitive. If they agree, that is NOT proof of correctness — it may mean
 * the search never ran — which is why a human still verifies a sample against
 * real sources afterwards.
 *
 * Writes nothing. Publishes nothing. Costs a handful of API calls.
 *
 *   npx tsx src/probeFactSources.ts
 */

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4';

/**
 * Deliberately spans the spectrum, because the interesting result is WHERE the
 * two paths diverge. Structural facts should agree; quarterly-reset rates are
 * where training memory goes stale.
 */
const QUESTIONS: { id: string; q: string; volatility: 'stable' | 'drifts' }[] = [
    { id: 'card-monthly', volatility: 'stable', q: 'What monthly interest rate do Indian credit card issuers typically charge on revolving balances, and what is that annualised?' },
    { id: 'card-cash', volatility: 'stable', q: 'In India, does a credit card cash advance have an interest-free grace period, and what fee is typically charged?' },
    { id: 'late-fee-gst', volatility: 'stable', q: 'In India, is GST charged on credit card late payment fees, and at what rate?' },
    { id: 'cibil-band', volatility: 'stable', q: 'What is the CIBIL score range in India, and what score do most lenders treat as good?' },
    { id: '80c-limit', volatility: 'drifts', q: 'What is the current Section 80C deduction limit in India for individual taxpayers?' },
    { id: 'ppf-rate', volatility: 'drifts', q: 'What is the current PPF (Public Provident Fund) interest rate in India, and for which quarter?' },
    { id: 'epf-rate', volatility: 'drifts', q: 'What is the current EPF interest rate declared by EPFO in India, and for which financial year?' },
    { id: 'repo-rate', volatility: 'drifts', q: 'What is the current RBI repo rate, and when was it last changed?' },
];

const INSTRUCTION =
    'Answer in one or two sentences. State the figure precisely. ' +
    'If you are not certain the figure is current, say so explicitly rather than guessing.';

/** Chat completions, no tools — exactly what moneyScriptGenerator does today. */
async function askPlain(q: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: INSTRUCTION },
                { role: 'user', content: q },
            ],
            max_completion_tokens: 400,
        }),
        signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`plain ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '(empty)';
}

/** Responses API with the web_search tool. Returns the answer and its citations. */
async function askWithSearch(q: string): Promise<{ text: string; sources: string[] }> {
    const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
            model: MODEL,
            tools: [{ type: 'web_search' }],
            input: `${INSTRUCTION}\n\n${q}`,
        }),
        signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`search ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data: any = await res.json();

    // Walk the output for text and any url_citation annotations. The shape has
    // moved between API versions, so this reads defensively rather than
    // assuming one layout.
    let text = '';
    const sources = new Set<string>();
    for (const item of data.output ?? []) {
        for (const part of item.content ?? []) {
            if (typeof part.text === 'string') text += part.text;
            for (const ann of part.annotations ?? []) {
                if (ann.url) sources.add(ann.url);
            }
        }
    }
    if (!text && typeof data.output_text === 'string') text = data.output_text;
    return { text: text.trim() || '(empty)', sources: [...sources] };
}

async function main() {
    if (!KEY) throw new Error('OPENAI_API_KEY is not set.');

    console.log(`\nProbing ${MODEL} — same questions, two paths.\n`);
    console.log('The point is not which answer looks better. It is whether the');
    console.log('no-tools path (what the pipeline uses today) can be trusted for');
    console.log('anything that changes.\n');

    let searchWorks = true;
    let disagreements = 0;

    for (const { id, q, volatility } of QUESTIONS) {
        console.log('─'.repeat(74));
        console.log(`${id}  [${volatility}]`);
        console.log(`  Q: ${q}\n`);

        let plain = '';
        try {
            plain = await askPlain(q);
        } catch (err: any) {
            plain = `ERROR — ${err.message}`;
        }
        console.log(`  PLAIN (no web access):\n    ${plain.replace(/\n/g, '\n    ')}\n`);

        if (!searchWorks) {
            console.log('  SEARCH: skipped — the tool is unavailable on this key.\n');
            continue;
        }

        try {
            const { text, sources } = await askWithSearch(q);
            console.log(`  SEARCH (web_search tool):\n    ${text.replace(/\n/g, '\n    ')}`);
            if (sources.length) {
                console.log('    sources:');
                for (const s of sources.slice(0, 4)) console.log(`      ${s}`);
            } else {
                console.log('    ⚠️  no citations returned — it may not have actually searched');
            }
            console.log();

            // Crude but useful: do the two answers contain the same numbers?
            const nums = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).join(',');
            if (nums(plain) !== nums(text)) {
                disagreements += 1;
                console.log('    ↳ the two paths give DIFFERENT figures\n');
            }
        } catch (err: any) {
            console.log(`  SEARCH: FAILED — ${err.message}\n`);
            if (/model|tool|not supported|invalid|404|400/i.test(err.message)) {
                searchWorks = false;
                console.log('  Treating web_search as unavailable; remaining questions run plain only.\n');
            }
        }
    }

    console.log('─'.repeat(74));
    console.log(`\nweb_search available: ${searchWorks ? 'yes' : 'NO'}`);
    console.log(`questions where the two paths disagreed: ${disagreements}/${QUESTIONS.length}`);
    console.log('\nNext: a human verifies a sample of the SEARCH answers against the');
    console.log('cited pages. Agreement between the two paths is not evidence of');
    console.log('correctness — both can be confidently wrong together.\n');
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
