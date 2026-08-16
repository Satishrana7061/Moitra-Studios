/**
 * Publishes every approved Money Ladder episode to Instagram and Facebook.
 *
 * Runs in the evening. Reads only rows the owner already approved, so this
 * script never decides what goes out — it only carries out a decision already
 * made on the approve page.
 *
 *   npx tsx src/publishMoneyEpisodes.ts            # publish for real
 *   npx tsx src/publishMoneyEpisodes.ts --dry-run  # say what would go out
 */

import { SocialUploadService } from './services/socialUploadService.js';
import { resolveChannel, MetaTokenExpiredError } from './services/channelCredentials.js';
import {
    moneyDb,
    approvedEpisodes,
    markPublished,
    markFailed,
    type EpisodeRow,
} from './services/moneyEpisodeStore.js';
import { SERIES_NAME, DISCLAIMER } from './services/moneyStoryboardBuilder.js';

const dryRun = process.argv.includes('--dry-run');

/**
 * The caption. The disclaimer is repeated here as well as on screen — SEBI
 * cares about the post, and a viewer who sees the caption in their feed without
 * playing the video has still seen a financial claim.
 */
function caption(ep: EpisodeRow): string {
    const s = ep.script;
    const lines = [
        s?.hook ?? ep.title,
        '',
        ...(s?.beats ?? []).map((b) => `• ${b.onScreen}`),
        '',
        s?.cta ?? '',
        '',
        DISCLAIMER + '.',
        '',
        `${SERIES_NAME} — Step ${ep.step_number}. Episode ${ep.episode_no}.`,
        '',
        '#personalfinance #moneytips #savingmoney #financialfreedom #paisa #hindi',
    ];
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
    const db = moneyDb();
    const episodes = await approvedEpisodes(db);

    if (!episodes.length) {
        console.log('[money] Nothing approved. Nothing to publish — this is a normal quiet day.');
        return;
    }

    console.log(`[money] ${episodes.length} approved episode(s) to publish.`);

    // Resolved ONCE, before any upload. A missing money token throws here
    // rather than halfway through, and it can never fall back to the Rajneeti
    // account — see channelCredentials.
    const creds = dryRun ? null : resolveChannel('money');

    let published = 0;
    for (const ep of episodes) {
        const text = caption(ep);
        console.log(`\n── Episode ${ep.episode_no}: ${ep.title}`);
        console.log(`   video: ${ep.video_url}`);

        if (dryRun) {
            console.log('   --dry-run, publishing nothing. Caption would be:\n');
            console.log(text.split('\n').map((l) => `   │ ${l}`).join('\n'));
            continue;
        }

        if (!ep.video_url) {
            console.error('   No video URL on this row; skipping.');
            await markFailed(db, ep.id, 'No video_url on the approved row.');
            continue;
        }

        try {
            const ig = await SocialUploadService.uploadToInstagram(ep.video_url, text, creds!);
            const fb = await SocialUploadService.uploadToFacebook(ep.video_url, text, creds!);

            if (ig || fb) {
                await markPublished(db, ep.id);
                published += 1;
                console.log(`   ✅ published — instagram: ${ig ? 'yes' : 'no'}, facebook: ${fb ? 'yes' : 'no'}`);
            } else {
                await markFailed(db, ep.id, 'Both Instagram and Facebook uploads returned false.');
                console.error('   ❌ neither platform accepted it.');
            }
        } catch (err: any) {
            if (err instanceof MetaTokenExpiredError) {
                // Not this episode's problem — every remaining episode will fail
                // the same way, so stop rather than burning through the queue.
                await markFailed(db, ep.id, err.message);
                console.error(`\n${err.message}`);
                throw err;
            }
            await markFailed(db, ep.id, err.message ?? String(err));
            console.error(`   ❌ ${err.message ?? err}`);
        }
    }

    console.log(`\n[money] Done. ${published}/${episodes.length} published.`);
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
