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

    return {
        ok: true as const,
        audio,
        chars: chars.length,
        words,
        durationSec: starts.length ? starts[starts.length - 1] : 0,
    };
}

async function main() {
    if (!KEY) throw new Error('ELEVENLABS_API_KEY is not set.');
    fs.mkdirSync(OUT, { recursive: true });

    console.log(`\nVoice ${VOICE}. Same Hindi line, four ways.\n`);
    console.log('Word timings are the gate. A model that returns none cannot be');
    console.log('used here regardless of how it sounds — every cut and every');
    console.log('caption is placed from them.\n');

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
        } catch (err: any) {
            console.log(`FAILED — ${err.message}`);
        }
    }

    console.log(`\nAudio written to ${OUT}. Judge naturalness by ear;`);
    console.log('the timing counts above decide what is even allowed.\n');
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
});
