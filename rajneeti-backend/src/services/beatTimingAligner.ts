/**
 * Maps each beat onto the real speech, so cuts land where the voice actually is.
 *
 * Until now every `startSec`/`endSec` in a storyboard was a hand-typed estimate,
 * which means every cut landed on a guess. ElevenLabs returns per-word
 * timestamps for the whole voiceover; this walks that word list and works out
 * where each segment genuinely begins and ends.
 *
 * The voiceover is spoken in a fixed order — hookSaid, then each beat's `say`,
 * then the cta — so the word stream can be consumed segment by segment.
 *
 * The hard part is that ElevenLabs does not tokenise the way `split(/\s+/)`
 * does: it may split on punctuation, merge clitics, or emit a bare "।". So this
 * matches on CHARACTER CONTENT rather than word count — accumulate words until
 * the concatenated letters equal the segment's letters. That survives any
 * tokenisation difference. If a segment still fails to match (a retry produced
 * different text, say), the whole alignment falls back to a proportional split
 * rather than throwing, because a slightly-off reel beats no reel.
 */

export interface WordTiming {
    word: string;
    start: number;
    end: number;
}

export interface AlignedSegment {
    startSec: number;
    endSec: number;
    /** False when this segment was placed proportionally rather than matched. */
    matched: boolean;
}

export interface AlignmentResult {
    hook: AlignedSegment;
    beats: AlignedSegment[];
    cta: AlignedSegment;
    /** End of the last spoken word. */
    speechEndSec: number;
    /** True when every segment matched the word stream exactly. */
    fullyMatched: boolean;
}

/**
 * Letters and digits only. Devanagari is kept, punctuation and spaces dropped,
 * so "रुपये।" and "रुपये" compare equal.
 */
const letters = (s: string): string =>
    s.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

/** Proportional fallback: split the timeline by each segment's share of text. */
const proportionalSplit = (
    segments: string[],
    startSec: number,
    endSec: number,
): AlignedSegment[] => {
    const weights = segments.map((s) => Math.max(1, letters(s).length));
    const total = weights.reduce((a, b) => a + b, 0);
    const span = Math.max(0.001, endSec - startSec);

    let cursor = startSec;
    return weights.map((w) => {
        const dur = (w / total) * span;
        const seg = { startSec: cursor, endSec: cursor + dur, matched: false };
        cursor += dur;
        return seg;
    });
};

/**
 * Consumes words from `words` starting at `index` until their combined letters
 * equal the target's letters. Returns null when the stream diverges.
 */
const consumeSegment = (
    words: WordTiming[],
    index: number,
    target: string,
): { segment: AlignedSegment; nextIndex: number } | null => {
    const want = letters(target);
    if (!want) {
        // Empty segment (e.g. no cta): zero-length at the current position.
        const at = words[index]?.start ?? words[words.length - 1]?.end ?? 0;
        return { segment: { startSec: at, endSec: at, matched: true }, nextIndex: index };
    }

    let acc = '';
    let i = index;
    const startSec = words[index]?.start ?? 0;

    while (i < words.length) {
        acc += letters(words[i].word);
        const endSec = words[i].end;
        i += 1;

        if (acc === want) {
            return { segment: { startSec, endSec, matched: true }, nextIndex: i };
        }
        // Overshoot or divergence — the streams do not correspond.
        if (!want.startsWith(acc)) return null;
    }

    return null; // ran out of words before completing the segment
};

/**
 * Aligns the spoken segments to real word timings.
 *
 * `segments` must be in spoken order: [hookSaid, ...beats.map(say), cta].
 */
export function alignToSpeech(
    hookSaid: string,
    beatSays: string[],
    cta: string,
    words: WordTiming[],
): AlignmentResult {
    const ordered = [hookSaid, ...beatSays, cta];
    const speechEndSec = words.length ? words[words.length - 1].end : 0;

    if (words.length) {
        const aligned: AlignedSegment[] = [];
        let index = 0;
        let ok = true;

        for (const text of ordered) {
            const result = consumeSegment(words, index, text);
            if (!result) {
                ok = false;
                break;
            }
            aligned.push(result.segment);
            index = result.nextIndex;
        }

        if (ok && aligned.length === ordered.length) {
            // Close the gaps: each segment runs until the next one starts, so a
            // breath between sentences does not leave the screen mid-transition.
            for (let i = 0; i < aligned.length - 1; i++) {
                aligned[i].endSec = aligned[i + 1].startSec;
            }
            return {
                hook: aligned[0],
                beats: aligned.slice(1, -1),
                cta: aligned[aligned.length - 1],
                speechEndSec,
                fullyMatched: true,
            };
        }
    }

    const fallback = proportionalSplit(ordered, 0, speechEndSec || ordered.length * 3);
    return {
        hook: fallback[0],
        beats: fallback.slice(1, -1),
        cta: fallback[fallback.length - 1],
        speechEndSec: speechEndSec || fallback[fallback.length - 1].endSec,
        fullyMatched: false,
    };
}
