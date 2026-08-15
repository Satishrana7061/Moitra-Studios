/**
 * Assembles a MoneyStoryboard: script + real speech timings + mastered audio.
 *
 * This is where the reel stops being a guess. Everything before it deals in
 * text; this attaches the text to the moments the voice actually says it, so a
 * cut lands on the syllable it belongs to rather than on a number someone typed.
 */

import { alignToSpeech, type WordTiming } from './beatTimingAligner.js';
import type { MoneyScript } from './moneyScriptGenerator.js';
import type { ScheduledTopic } from './moneyCurriculum.js';

/** Mirrors reel-studio/src/lib/moneySchema.ts. Validated there at render time. */
export interface MoneyStoryboard {
    episode: number;
    topicId: string;
    stepNumber: number;
    stepTitle: string;
    hook: string;
    cta: string;
    beats: {
        onScreen: string;
        visual: Record<string, unknown>;
        startSec: number;
        endSec: number;
    }[];
    audio: { src: string; durationSec: number };
    brand: { seriesName: string; disclaimer: string; layoutVariant: 'a' | 'b' | 'c' };
}

export const SERIES_NAME = 'The Money Ladder';
export const DISCLAIMER = 'General information, not investment advice';

/**
 * Layout variant rotates per episode so consecutive uploads are not
 * pixel-identical. Deterministic on the episode number, so a re-render of the
 * same episode is byte-stable rather than randomly different.
 */
const variantFor = (episode: number): 'a' | 'b' | 'c' =>
    (['a', 'b', 'c'] as const)[episode % 3];

/** The minimum a beat may occupy, so a very short line still reads. */
const MIN_BEAT_SEC = 1.2;

export interface BuildInput {
    script: MoneyScript;
    topic: ScheduledTopic;
    episode: number;
    /** Public URL or staticFile-relative path of the mastered track. */
    audioSrc: string;
    /** True duration of the mastered file, measured not assumed. */
    audioDurationSec: number;
    /** Per-word timings for the whole voiceover, from ElevenLabs. */
    wordTimings: WordTiming[];
}

export function buildMoneyStoryboard(input: BuildInput): {
    storyboard: MoneyStoryboard;
    fullyMatched: boolean;
} {
    const { script, topic, episode, audioSrc, audioDurationSec, wordTimings } = input;

    const alignment = alignToSpeech(
        script.hookSaid,
        script.beats.map((b) => b.say),
        // The SPOKEN close. `script.cta` is English and only drawn.
        script.ctaSaid,
        wordTimings,
    );

    if (!alignment.fullyMatched) {
        // Not fatal: a proportional layout still produces a watchable reel. But
        // it means the cuts are approximate, so it is surfaced for the approval
        // step rather than swallowed.
        console.warn(
            '[money] Beat timings fell back to a proportional split — the spoken text ' +
                'did not line up with the returned word stream. Cuts will be approximate.',
        );
    }

    const beats = script.beats.map((beat, i) => {
        const seg = alignment.beats[i];
        const startSec = seg?.startSec ?? 0;
        const endSec = Math.max(startSec + MIN_BEAT_SEC, seg?.endSec ?? startSec + MIN_BEAT_SEC);
        return {
            onScreen: beat.onScreen,
            visual: beat.visual as unknown as Record<string, unknown>,
            startSec: Number(startSec.toFixed(3)),
            endSec: Number(endSec.toFixed(3)),
        };
    });

    return {
        fullyMatched: alignment.fullyMatched,
        storyboard: {
            episode,
            topicId: topic.id,
            stepNumber: topic.stepNumber,
            // English, because it is drawn in the series bar. The Hindi
            // `stepTitle` is generator guidance and is never rendered.
            stepTitle: topic.stepTitleEn,
            hook: script.hook,
            cta: script.cta,
            beats,
            audio: { src: audioSrc, durationSec: audioDurationSec },
            brand: {
                seriesName: SERIES_NAME,
                disclaimer: DISCLAIMER,
                layoutVariant: variantFor(episode),
            },
        },
    };
}
