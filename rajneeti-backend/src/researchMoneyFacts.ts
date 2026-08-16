/**
 * Fills in `facts` for curriculum topics that have none.
 *
 * Run occasionally, by hand, from CI where the key lives. Never part of the
 * daily reel run — see factResearcher.ts for why that separation matters.
 *
 *   npx tsx src/researchMoneyFacts.ts --limit 5 --dry-run
 *   npx tsx src/researchMoneyFacts.ts --step 2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { researchTopic } from './services/factResearcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CURRICULUM = path.resolve(__dirname, '..', '..', 'content', 'money-ladder.json');

const arg = (n: string) => {
    const i = process.argv.indexOf(`--${n}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (n: string) => process.argv.includes(`--${n}`);

async function main() {
    const limit = Number(arg('limit') ?? 8);
    const onlyStep = arg('step') ? Number(arg('step')) : undefined;
    const dryRun = flag('dry-run');

    const doc = JSON.parse(fs.readFileSync(CURRICULUM, 'utf-8'));

    // Only topics that have none. Re-running is safe and picks up where it left
    // off, which matters because this is slow and costs money per call.
    const pending: any[] = [];
    for (const step of doc.steps) {
        if (onlyStep && step.step !== onlyStep) continue;
        for (const t of step.topics ?? []) {
            if (!t.facts?.length) pending.push(t);
        }
    }

    console.log(`\n${pending.length} topic(s) without facts${onlyStep ? ` in step ${onlyStep}` : ''}.`);
    console.log(`Researching ${Math.min(limit, pending.length)} of them.\n`);

    let written = 0;
    let empty = 0;

    for (const topic of pending.slice(0, limit)) {
        process.stdout.write(`${topic.id}  ${topic.title}\n`);
        try {
            const facts = await researchTopic(topic);
            if (!facts.length) {
                empty += 1;
                console.log('   (no citable facts — this topic is about behaviour, not numbers)\n');
                continue;
            }
            for (const f of facts) {
                console.log(`   • ${f.text}`);
                console.log(`     ${f.volatile ? '[resets on a schedule]' : '[stable]'} ${f.source}`);
            }
            console.log();

            if (!dryRun) {
                topic.facts = facts.map((f) => f.text);
                topic.factSources = facts.map((f) => ({
                    source: f.source,
                    checkedOn: f.checkedOn,
                    volatile: f.volatile,
                }));
                written += 1;
            }
        } catch (err: any) {
            console.error(`   ERROR — ${err.message}\n`);
        }
    }

    if (dryRun) {
        console.log(`--dry-run: nothing written. ${empty} topic(s) had no citable facts.`);
        return;
    }

    fs.writeFileSync(CURRICULUM, JSON.stringify(doc, null, 2) + '\n');
    console.log(`Wrote facts for ${written} topic(s). ${empty} had none to find.`);
    console.log('Review the diff before committing — these are claims that will be published.');
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
