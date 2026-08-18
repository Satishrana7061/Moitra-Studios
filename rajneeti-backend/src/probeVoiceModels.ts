/**
 * Which ElevenLabs model should read this channel — decided by evidence.
 *
 * Two things must both be true, and they pull against each other:
 *
 *   1. It has to sound like a person. v3 (public since March 2026) takes inline
 *      audio tags — [pause], [breathes], [slows down] — which is exactly the
 *      control that was missing when the first episode came back sounding
 *      synthetic.
 *   2. It has to return WORD TIMINGS. Those are what put every cut and every
 *      caption on the syllable it belongs to. A model that cannot return them
 *      is rejected however good it sounds, because losing them silently
 *      degrades every reel to a proportional guess.
 *
 * So this generates the same Hindi line four ways and reports, for each,
 * whether timings came back and how many. The audio is written out to be judged
 * by ear; the timings decide whether the option is admissible at all.
 *
 *   npx tsx src/probeVoiceModels.ts
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import { ffmpegBin } from './services/audioMixService.js';

const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID__MONEY || 'Ms9OTvWb99V6DwRHZn6q';
const OUT = path.resolve(process.argv[process.argv.indexOf('--out') + 1] || '../out/voice');

/** A real line from the curriculum, not a lorem sample — pacing depends on content. */
const PLAIN =
    'क्रेडिट कार्ड पर हर महीने साढ़े तीन प्रतिशत ब्याज लगता है। ' +
    'साल भर में ये बयालीस प्रतिशत बैठता है। यही वजह है कि कार्ड पहले चुकाना है।';

/** The same line with pacing marks a person would naturally use. */
const PUNCTUATED =
    'क्रेडिट कार्ड पर हर महीने... साढ़े तीन प्रतिशत ब्याज लगता है। ' +
    'साल भर में? ये बयालीस प्रतिशत बैठता है। ' +
    'यही वजह है, कि कार्ड पहले चुकाना है।';

/** v3 audio tags. These live INSIDE the text and are not spoken. */
const TAGGED =
    '[thoughtful] क्रेडिट कार्ड पर हर महीने साढ़े तीन प्रतिशत ब्याज लगता है। [pause] ' +
    '[emphatic] साल भर में ये बयालीस प्रतिशत बैठता है। [breathes] ' +
    'यही वजह है कि कार्ड पहले चुकाना है।';

interface Take {
    label: string;
    model: string;
    text: string;
}

const TAKES: Take[] = [
    { label: 'v2-as-today', model: 'eleven_multilingual_v2', text: PLAIN },
    { label: 'v2-punctuated', model: 'eleven_multilingual_v2', text: PUNCTUATED },
    { label: 'v3-plain', model: 'eleven_v3', text: PLAIN },
    { label: 'v3-tagged', model: 'eleven_v3', text: TAGGED },
];

async function run(take: Take) {
    const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`,
        {
            method: 'POST',
            headers: { 'xi-api-key': KEY!, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: take.text,
                model_id: take.model,
                voice_settings: {
                    stability: 0.35,
                    similarity_boost: 0.8,
                    style: 0.45,
                    use_speaker_boost: true,
                },
            }),
            signal: AbortSignal.timeout(120_000),
        },
    );

    if (!res.ok) {
        return { ok: false as const, detail: `${res.status}: ${(await res.text()).slice(0, 240)}` };
    }

    const data: any = await res.json();
    const audio = data.audio_base64 ? Buffer.from(data.audio_base64, 'base64') : null;
    const chars: string[] = data.alignment?.characters ?? [];
    const starts: number[] = data.alignment?.character_start_times_seconds ?? [];

    const ends: number[] = data.alignment?.character_end_times_seconds ?? [];

    // Characters are what the API returns; words are what the aligner needs.
    // Counting the word boundaries is the honest measure of whether beat
    // alignment would survive on this model.
    let words = 0;
    let prevSpace = true;
    for (const c of chars) {
        const isSpace = /\s/.test(c);
        if (!isSpace && prevSpace) words += 1;
        prevSpace = isSpace;
    }

    // The question the first probe run left open.
    //
    // Run 1 proved the tags come back INSIDE the alignment: 31 tokens tagged
    // against 27 plain, and 176 characters against 133. What it could not say
    // is whether they were merely aligned or actually VOCALISED. Dropping them
    // from the timings makes the cuts safe either way — but if v3 read
    // "thoughtful" out loud, the audio is ruined and every automated check
    // still passes, because an MP4 of a bad read has the same streams as an
    // MP4 of a good one.
    //
    // The alignment answers it directly. Sum the time spanned by the
    // characters that sit between brackets. Direction collapses to about zero;
    // a spoken word occupies a real span. So:
    //
    //   ~0.0s  -> tags are direction. Adopt v3 tagged.
    //   >0.4s  -> tags are being read aloud. v3 plain only, no tags.
    let inTag = false;
    let tagSec = 0;
    let tagChars = 0;
    let tagStart = -1;
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === '[') { inTag = true; tagStart = starts[i] ?? 0; }
        if (inTag) tagChars += 1;
        if (chars[i] === ']') {
            inTag = false;
            tagSec += Math.max(0, (ends[i] ?? 0) - tagStart);
        }
    }

    return {
        ok: true as const,
        audio,
        chars: chars.length,
        words,
        tagSec,
        tagChars,
        durationSec: ends.length ? ends[ends.length - 1] : 0,
    };
}

/**
 * Where the read actually stops, measured from the audio.
 *
 * The alignment can say a tag was not spoken; only the waveform can say the
 * direction did anything. If [pause] and [breathes] work, the tagged take has
 * real silences the plain take does not — and pauses are most of what separates
 * a human read from an even one.
 *
 * -34 dB and 160 ms are chosen to catch a deliberate beat while ignoring the
 * micro-gaps between words, which sit well below that length.
 */
function pauses(file: string): { count: number; totalSec: number } {
    const res = spawnSync(
        ffmpegBin(),
        ['-i', file, '-af', 'silencedetect=noise=-34dB:d=0.16', '-f', 'null', '-'],
        { encoding: 'utf-8' },
    );
    const log = `${res.stdout ?? ''}${res.stderr ?? ''}`;
    const durations = [...log.matchAll(/silence_duration:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    // The trailing silence after the last word is not a pause in the read.
    const internal = durations.slice(0, Math.max(0, durations.length - 1));
    return { count: internal.length, totalSec: internal.reduce((a, b) => a + b, 0) };
}

async function main() {
    if (!KEY) throw new Error('ELEVENLABS_API_KEY is not set.');
    fs.mkdirSync(OUT, { recursive: true });

    console.log(`\nVoice ${VOICE}. Same Hindi line, four ways.\n`);
    console.log('Word timings are the gate. A model that returns none cannot be');
    console.log('used here regardless of how it sounds — every cut and every');
    console.log('caption is placed from them.\n');

    const summary: { label: string; sec: number; pauses: number; pauseSec: number }[] = [];

    for (const take of TAKES) {
        process.stdout.write(`${take.label.padEnd(16)} [${take.model}]  `);
        try {
            const r = await run(take);
            if (!r.ok) {
                console.log(`UNAVAILABLE — ${r.detail}`);
                continue;
            }
            const file = path.join(OUT, `${take.label}.mp3`);
            if (r.audio) fs.writeFileSync(file, r.audio);
            console.log(
                `${r.words} words / ${r.chars} chars of timing, ${r.durationSec.toFixed(1)}s` +
                    (r.words === 0 ? '  ⚠️  NO TIMINGS — unusable' : ''),
            );

            const p = r.audio ? pauses(file) : { count: 0, totalSec: 0 };
            console.log(
                `${''.padEnd(16)}   ${p.count} pause(s) of 160ms+, ${p.totalSec.toFixed(2)}s of held silence`,
            );
            summary.push({ label: take.label, sec: r.durationSec, pauses: p.count, pauseSec: p.totalSec });

            if (r.tagChars > 0) {
                // The honest measure is a RATE, not a stopwatch. Run 1 reported
                // 0.30s of tag alignment and an absolute threshold called that
                // "borderline" — but 0.30s across 39 tag characters is 7.7ms
                // each, against 77ms for every character the voice actually
                // speaks. Ten times faster than speech is not speech. An
                // absolute cut-off would also have scaled wrongly: a longer
                // script carries more tags and would trip it while being just
                // as silent.
                const spokenChars = Math.max(1, r.chars - r.tagChars);
                const spokenRate = (r.durationSec - r.tagSec) / spokenChars;
                const tagRate = r.tagSec / r.tagChars;
                const ratio = tagRate > 0 ? spokenRate / tagRate : Infinity;
                const verdict =
                    ratio >= 4
                        ? 'DIRECTION — far too fast to be speech, safe to adopt'
                        : ratio >= 2
                          ? 'borderline — listen before adopting'
                          : '⚠️  AUDIBLE — the tags are being READ ALOUD, do not adopt tagged';
                console.log(
                    `${''.padEnd(16)}   tags: ${r.tagSec.toFixed(2)}s over ${r.tagChars} chars ` +
                        `= ${(tagRate * 1000).toFixed(1)}ms/char vs ${(spokenRate * 1000).toFixed(1)}ms/char spoken ` +
                        `(${ratio.toFixed(1)}x)  →  ${verdict}`,
                );
            }
        } catch (err: any) {
            console.log(`FAILED — ${err.message}`);
        }
    }

    // The second proof, and the one that does not depend on the alignment being
    // honest: identical words in both v3 takes, so if the tags were spoken the
    // tagged take would be SECONDS longer. If instead it is the same length but
    // holds more silence, the direction did exactly what it was asked to.
    const plain = summary.find((t) => t.label === 'v3-plain');
    const tagged = summary.find((t) => t.label === 'v3-tagged');
    if (plain && tagged) {
        console.log('\nv3 plain vs tagged — same words, so any extra length would be spoken tags:');
        console.log(`  length   ${plain.sec.toFixed(1)}s -> ${tagged.sec.toFixed(1)}s  (${(tagged.sec - plain.sec >= 0 ? '+' : '')}${(tagged.sec - plain.sec).toFixed(1)}s)`);
        console.log(`  pauses   ${plain.pauses} -> ${tagged.pauses}   held silence ${plain.pauseSec.toFixed(2)}s -> ${tagged.pauseSec.toFixed(2)}s`);
        console.log(
            tagged.sec - plain.sec > 1.0
                ? '  ⚠️  materially longer — consistent with the tags being read aloud.'
                : tagged.pauseSec > plain.pauseSec + 0.1
                  ? '  ✅ same length, more silence — the direction landed where it was asked to.'
                  : '  ⚠️  no extra silence — the tags are not being read, but they are not doing anything either.',
        );
    }

    console.log(`\nAudio written to ${OUT}. Judge naturalness by ear;`);
    console.log('the measurements above decide what is even allowed.\n');
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
