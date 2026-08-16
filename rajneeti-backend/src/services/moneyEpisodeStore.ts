/**
 * Where an episode lives between being built and being published.
 *
 * The generate workflow writes here in the morning; the approve page reads it;
 * the publish workflow reads it back in the evening. Two crons rather than one
 * blocking job, so an unapproved day simply posts nothing instead of holding a
 * runner open.
 *
 * Uses the service-role key, which bypasses RLS. That is correct here and
 * nowhere else: the browser talks to this table with the anon key under a
 * policy locked to one email, while CI needs to insert rows no browser session
 * owns.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import type { MoneyScript } from './moneyScriptGenerator.js';
import type { ScheduledTopic } from './moneyCurriculum.js';

export type EpisodeStatus =
    | 'queued'
    | 'rendered'
    | 'pending_approval'
    | 'approved'
    | 'published'
    | 'skipped'
    | 'failed';

export interface EpisodeRow {
    id: string;
    topic_id: string;
    episode_no: number;
    step_number: number;
    title: string;
    status: EpisodeStatus;
    script: MoneyScript | null;
    video_url: string | null;
    error_log: string | null;
}

const BUCKET = 'automated-reels';
/** Kept under a prefix so money videos never mix with the Rajneeti reels. */
const PREFIX = 'money';

export function moneyDb(): SupabaseClient {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
        throw new Error(
            '[money] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to record an episode.',
        );
    }
    return createClient(url, key, { auth: { persistSession: false } });
}

/** Topic ids already used, so the curriculum never repeats an episode. */
export async function usedTopicIds(db: SupabaseClient): Promise<string[]> {
    const { data, error } = await db.from('money_episodes').select('topic_id');
    if (error) throw new Error(`[money] Could not read episode history: ${error.message}`);
    return (data ?? []).map((r: { topic_id: string }) => r.topic_id);
}

/** Highest episode number so far. The next episode is this plus one. */
export async function lastEpisodeNo(db: SupabaseClient): Promise<number> {
    const { data, error } = await db
        .from('money_episodes')
        .select('episode_no')
        .order('episode_no', { ascending: false })
        .limit(1);
    if (error) throw new Error(`[money] Could not read the episode number: ${error.message}`);
    return data?.[0]?.episode_no ?? 0;
}

/**
 * Uploads the MP4 and returns a public URL.
 *
 * Public is a requirement, not a shortcut: the Instagram Content Publishing API
 * fetches the video from a URL Meta's servers must be able to reach, so a
 * signed short-lived link would fail at exactly the wrong moment.
 */
export async function uploadVideo(
    db: SupabaseClient,
    localPath: string,
    episodeNo: number,
): Promise<string> {
    const key = `${PREFIX}/episode-${episodeNo}-${Date.now()}.mp4`;
    const body = fs.readFileSync(localPath);

    const { error } = await db.storage.from(BUCKET).upload(key, body, {
        contentType: 'video/mp4',
        upsert: true,
    });
    if (error) throw new Error(`[money] Video upload failed: ${error.message}`);

    const { data } = db.storage.from(BUCKET).getPublicUrl(key);
    if (!data?.publicUrl) throw new Error('[money] Upload succeeded but no public URL came back.');
    return data.publicUrl;
}

export async function recordEpisode(
    db: SupabaseClient,
    input: {
        topic: ScheduledTopic;
        episodeNo: number;
        script: MoneyScript;
        videoUrl: string;
        status?: EpisodeStatus;
    },
): Promise<EpisodeRow> {
    const { data, error } = await db
        .from('money_episodes')
        .insert({
            topic_id: input.topic.id,
            episode_no: input.episodeNo,
            step_number: input.topic.stepNumber,
            // The generated English hook, because that is the line the reel
            // actually opens with — a more useful label on the approve page than
            // the curriculum's Hindi working title, which is never drawn.
            title: input.script.hook?.trim() || input.topic.title,
            status: input.status ?? 'pending_approval',
            script: input.script,
            video_url: input.videoUrl,
            rendered_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw new Error(`[money] Could not record the episode: ${error.message}`);
    return data as EpisodeRow;
}

/** Everything approved and not yet published, oldest first. */
export async function approvedEpisodes(db: SupabaseClient): Promise<EpisodeRow[]> {
    const { data, error } = await db
        .from('money_episodes')
        .select('*')
        .eq('status', 'approved')
        .order('episode_no', { ascending: true });
    if (error) throw new Error(`[money] Could not read approved episodes: ${error.message}`);
    return (data ?? []) as EpisodeRow[];
}

export async function markPublished(db: SupabaseClient, id: string): Promise<void> {
    const { error } = await db
        .from('money_episodes')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw new Error(`[money] Could not mark ${id} published: ${error.message}`);
}

/**
 * Deletes the stored MP4 of episodes published more than `keepDays` ago.
 *
 * Once a reel is on Instagram, Meta holds its own copy — the URL here was only
 * ever a delivery mechanism, so keeping it forever just fills a 1 GB free tier
 * at about 130 MB a month. The grace period exists because "published" is not
 * quite "finished": a post can be taken down, or want re-posting elsewhere, and
 * getting the file back after deletion means re-rendering and paying for the
 * voice again.
 *
 * Three rails, because a cleanup job with a bug is the worst kind:
 *   1. Only rows with status='published' — never pending or approved.
 *   2. Only keys under `money/`. The Rajneeti reels sit at the bucket root as
 *      pm-interview-*.mp4, so this cannot reach them even if a URL is malformed.
 *   3. Anything whose key does not parse to that prefix is skipped and reported,
 *      not guessed at.
 */
/**
 * The storage key for a video URL, or null if it is not one of ours.
 *
 * Pulled out and exported purely so it can be tested, because this is the
 * function that decides what gets deleted. It returns null rather than
 * guessing: an unrecognised URL is reported and left alone.
 *
 * The Rajneeti reels live at the bucket root (pm-interview-*.mp4), so requiring
 * the `money/` prefix is what makes it impossible for this to reach them.
 */
export function storageKeyFromUrl(url: string): string | null {
    if (!url) return null;
    // Match the FULL Supabase public-object path, not just the bucket name.
    // `/automated-reels/` alone appears in any URL that happens to contain it —
    // including one pointing at another host entirely — and we would then
    // cheerfully derive a key and delete that file from OUR bucket.
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const at = url.indexOf(marker);
    if (at < 0) return null;

    const key = url.slice(at + marker.length).split('?')[0];
    if (!key.startsWith(`${PREFIX}/`)) return null;
    // A traversal segment could climb out of the prefix on some backends.
    if (key.includes('..')) return null;
    return key;
}

export async function pruneOldVideos(
    db: SupabaseClient,
    opts: { keepDays?: number; dryRun?: boolean } = {},
): Promise<{ deleted: number; freedBytes: number; skipped: string[] }> {
    const keepDays = opts.keepDays ?? 7;
    const cutoff = new Date(Date.now() - keepDays * 86_400_000).toISOString();

    const { data, error } = await db
        .from('money_episodes')
        .select('id, episode_no, video_url, published_at')
        .eq('status', 'published')
        .lt('published_at', cutoff)
        .not('video_url', 'is', null);

    if (error) throw new Error(`[money] Could not list old episodes: ${error.message}`);

    const rows = (data ?? []) as { id: string; episode_no: number; video_url: string }[];
    const skipped: string[] = [];
    const keys: { id: string; key: string }[] = [];

    for (const row of rows) {
        const key = storageKeyFromUrl(row.video_url);
        if (!key) {
            skipped.push(`episode ${row.episode_no}: "${row.video_url}" is not a ${PREFIX}/ object`);
            continue;
        }
        keys.push({ id: row.id, key });
    }

    if (!keys.length) return { deleted: 0, freedBytes: 0, skipped };

    if (opts.dryRun) {
        console.log(`[money] --dry-run: would delete ${keys.length} file(s):`);
        for (const k of keys) console.log(`   ${k.key}`);
        return { deleted: 0, freedBytes: 0, skipped };
    }

    const { error: delErr } = await db.storage.from(BUCKET).remove(keys.map((k) => k.key));
    if (delErr) throw new Error(`[money] Storage cleanup failed: ${delErr.message}`);

    // Clear the URL too, so the approve page never offers a dead video.
    await db.from('money_episodes').update({ video_url: null }).in('id', keys.map((k) => k.id));

    return { deleted: keys.length, freedBytes: 0, skipped };
}

/**
 * Records a failure ON the row rather than only in the CI log.
 *
 * A run that fails silently in Actions is a run nobody notices — which is
 * exactly how the nightly reels published nothing for weeks. The approve page
 * can surface this.
 */
export async function markFailed(db: SupabaseClient, id: string, detail: string): Promise<void> {
    await db.from('money_episodes').update({ status: 'failed', error_log: detail.slice(0, 2000) }).eq('id', id);
}
