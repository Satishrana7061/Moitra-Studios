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
    // The cell run 2 said we should have tested first. v2+punctuation held more
    // silence than either v3 configuration, and v3+tags held LESS than v3 plain
    // — so the combination the evidence actually points at had never been run.
    { label: 'v3-punctuated', model: 'eleven_v3', text: PUNCTUATED },
    { label: 'v3-tagged', model: 'eleven_v3', text: TAGGED },
];

/**
 * How many times to run each configuration.
 *
 * Run 2 decided a design question off one sample per cell, which is thinner
 * evidence than the conclusion deserved — TTS is not deterministic, and pause
 * placement is exactly the kind of thing that moves between generations. Three
 * runs will not give a confidence interval worth the name, but it does separate
 * "this configuration pauses more" from "this generation happened to".
 */
const REPEATS = Number(process.env.PROBE_REPEATS ?? 3);

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

    const summary: { label: string; sec: number; pauses: number; pauseSec: number; spread: number }[] = [];

    for (const take of TAKES) {
        const runs: { sec: number; pauses: number; pauseSec: number; words: number }[] = [];
        console.log(`${take.label.padEnd(16)} [${take.model}]`);

        for (let i = 1; i <= REPEATS; i++) {
            try {
                const r = await run(take);
                if (!r.ok) {
                    console.log(`  run ${i}: UNAVAILABLE — ${r.detail}`);
                    continue;
                }
                // Only the first take of each configuration is kept as audio.
                // Three near-identical MP3s per cell would make the artifact
                // harder to listen through, not more informative.
                const file = path.join(OUT, i === 1 ? `${take.label}.mp3` : `${take.label}-run${i}.mp3`);
                if (r.audio) fs.writeFileSync(file, r.audio);

                const p = r.audio ? pauses(file) : { count: 0, totalSec: 0 };
                if (i > 1) fs.rmSync(file, { force: true });

                runs.push({ sec: r.durationSec, pauses: p.count, pauseSec: p.totalSec, words: r.words });
                console.log(
                    `  run ${i}: ${r.words} words, ${r.durationSec.toFixed(1)}s, ` +
                        `${p.count} pause(s), ${p.totalSec.toFixed(2)}s silence` +
                        (r.words === 0 ? '   ⚠️  NO TIMINGS — unusable' : ''),
                );

                if (i === 1 && r.tagChars > 0) {
                    // The honest measure is a RATE, not a stopwatch. Run 1 of
                    // this probe reported 0.30s of tag alignment and an absolute
                    // threshold called it "borderline" — but 0.30s across 39 tag
                    // characters is 7.7ms each, against 77ms for every character
                    // the voice actually speaks. Ten times faster than speech is
                    // not speech. An absolute cut-off also scales wrongly: a
                    // longer script carries more tags and would trip it while
                    // being just as silent.
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
                        `          tags: ${(tagRate * 1000).toFixed(1)}ms/char vs ` +
                            `${(spokenRate * 1000).toFixed(1)}ms/char spoken (${ratio.toFixed(1)}x)  →  ${verdict}`,
                    );
                }
            } catch (err: any) {
                console.log(`  run ${i}: FAILED — ${err.message}`);
            }
        }

        if (runs.length) {
            const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
            const sil = runs.map((r) => r.pauseSec);
            summary.push({
                label: take.label,
                sec: mean(runs.map((r) => r.sec)),
                pauses: mean(runs.map((r) => r.pauses)),
                pauseSec: mean(sil),
                spread: Math.max(...sil) - Math.min(...sil),
            });
        }
    }

    // The comparison the decision actually rests on. Ranked by held silence,
    // with the spread beside it — a configuration that wins by less than its own
    // run-to-run variation has not won anything.
    console.log('\nheld silence, mean of ' + REPEATS + ' runs (spread = max - min):');
    const ranked = [...summary].sort((a, b) => b.pauseSec - a.pauseSec);
    for (const t of ranked) {
        console.log(
            `  ${t.label.padEnd(16)} ${t.pauseSec.toFixed(2)}s  ±${(t.spread / 2).toFixed(2)}  ` +
                `(${t.pauses.toFixed(1)} pauses, ${t.sec.toFixed(1)}s long)`,
        );
    }

    const best = ranked[0];
    const runnerUp = ranked[1];
    if (best && runnerUp) {
        const margin = best.pauseSec - runnerUp.pauseSec;
        const noise = Math.max(best.spread, runnerUp.spread) / 2;
        console.log(
            margin > noise
                ? `\n  ${best.label} leads by ${margin.toFixed(2)}s, more than the ±${noise.toFixed(2)}s run-to-run spread.`
                : `\n  ${best.label} leads by only ${margin.toFixed(2)}s against a ±${noise.toFixed(2)}s spread — ` +
                  'too close to call from this sample. Decide by ear.',
        );
    }

    // Silence is a PROXY for a natural read, not the thing itself: a halting
    // delivery also scores well here. The numbers narrow the field; the MP3s
    // settle it.
    console.log('\nSilence is a proxy, not the answer — a halting read scores well too.');
    console.log('These numbers narrow the field; the audio decides.\n');

    console.log(`\nAudio written to ${OUT}. Judge naturalness by ear;`);
    console.log('the measurements above decide what is even allowed.\n');
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
