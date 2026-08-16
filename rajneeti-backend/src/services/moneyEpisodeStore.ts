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
 * Records a failure ON the row rather than only in the CI log.
 *
 * A run that fails silently in Actions is a run nobody notices — which is
 * exactly how the nightly reels published nothing for weeks. The approve page
 * can surface this.
 */
export async function markFailed(db: SupabaseClient, id: string, detail: string): Promise<void> {
    await db.from('money_episodes').update({ status: 'failed', error_log: detail.slice(0, 2000) }).eq('id', id);
}
