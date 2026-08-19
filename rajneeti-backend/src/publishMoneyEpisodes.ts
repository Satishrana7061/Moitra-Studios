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
import { assertPublishable, checkTokenHealth } from './services/metaTokenHealth.js';
import {
    moneyDb,
    approvedEpisodes,
    markPublished,
    markFailed,
    pruneOldVideos,
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
        // Still tidy up. Cleanup depends on what was published DAYS ago, not on
        // anything happening today, so returning early here would mean storage
        // is only ever reclaimed on days you happen to approve something.
        await prune();
        return;
    }

    console.log(`[money] ${episodes.length} approved episode(s) to publish.`);

    // Resolved ONCE, before any upload. A missing money token throws here
    // rather than halfway through, and it can never fall back to the Rajneeti
    // account — see channelCredentials.
    const creds = dryRun ? null : resolveChannel('money');

    // Asked before a single upload starts. A long-lived Meta token lasts sixty
    // days, and the way these integrations actually die is that it lapses
    // quietly — posting stops, nothing throws anything a person sees, and it is
    // noticed a fortnight later by accident. That failure hides well because
    // "no new posts" is also what a quiet week looks like.
    //
    // Checking here rather than at the publish call means the run fails before
    // it has half-uploaded anything, and with two weeks still on the clock.
    if (creds) {
        console.log(assertPublishable(await checkTokenHealth(creds.igToken)));
    }

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
    await prune();
}

/**
 * Frees storage after publishing, in the same run.
 *
 * Deliberately not its own workflow: a separate cleanup cron is one more thing
 * to notice has stopped, and this has exactly one job to do right after the
 * only event that makes a file disposable.
 */
async function prune() {
    const keepDays = Number(process.env.MONEY_VIDEO_KEEP_DAYS ?? 7);
    try {
        const { deleted, skipped } = await pruneOldVideos(moneyDb(), { keepDays, dryRun: dryRun });
        if (deleted) {
            console.log(`[money] Freed storage: removed ${deleted} video(s) published over ${keepDays} days ago.`);
        }
        for (const s of skipped) console.warn(`[money] Cleanup skipped — ${s}`);
    } catch (err: any) {
        // Never fail a successful publish because tidying up went wrong.
        console.warn(`[money] Cleanup skipped: ${err.message}`);
    }
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
