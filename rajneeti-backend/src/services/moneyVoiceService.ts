/**
 * Hindi voiceover for the money channel.
 *
 * A thin wrapper over elevenLabsService, but the two things it enforces are the
 * difference between cuts that land on the syllable and cuts that land on a
 * guess:
 *
 * 1. **Numeral normalisation is off.** The shared service rewrites digit runs
 *    into ENGLISH words for the news pipeline. In a Hindi read that is wrong
 *    twice over: "₹10,000" is matched by `\b\d+\b` as "10" and "000"
 *    separately, so it is sent as "ten zero", and eleven_multilingual_v2 then
 *    pronounces English in the middle of a Hindi sentence.
 *
 * 2. **The text sent is verified against the text we align to.** The aligner
 *    matches beats by character content; if TTS silently altered the string,
 *    every segment fails to match and the whole reel quietly degrades to a
 *    proportional split. That is a failure worth seeing, so it throws.
 */

import {
    generateAudioWithTimestamps,
    type VoiceSettings,
    type WordTiming,
} from './elevenLabsService.js';
import { voiceoverText, type MoneyScript } from './moneyScriptGenerator.js';

/**
 * Monika Sogam — young female Hindi, "pleasant", conversational.
 *
 * Chosen over Abhii (tVeibrRmkweME2rrFZAs) deliberately: Abhii is the Rajneeti
 * game's voice, and reusing it would make both channels sound like the same
 * person. A female read is also the rarer one in Hindi finance, which is
 * differentiation for free.
 *
 * Hard-coded rather than left to a secret. A voice id is not sensitive, and a
 * missing env var would silently fall back to ElevenLabs' default voice —
 * a wrong voice that still produces a publishable-looking reel.
 */
export const MONEY_VOICE_ID = process.env.ELEVENLABS_VOICE_ID__MONEY || 'Ms9OTvWb99V6DwRHZn6q';

/**
 * Tuned away from the news-reader defaults, which is what made the first
 * episode sound synthetic.
 *
 * `stability` is inverted from how it reads: HIGH means flat and identical
 * sentence to sentence, which is precisely the quality people hear as "AI".
 * Dropping it to 0.35 lets pitch and pace move; raising `style` gives the read
 * some attitude. `similarity_boost` stays high so the voice still sounds like
 * Monika rather than drifting.
 *
 * These are a starting point, not a settled answer — they have to be judged by
 * ear, and the voice lab exists to make that cheap. Override per run with
 * MONEY_VOICE_STABILITY / MONEY_VOICE_STYLE.
 */
export const MONEY_VOICE_SETTINGS: VoiceSettings = {
    stability: Number(process.env.MONEY_VOICE_STABILITY ?? 0.35),
    similarity_boost: 0.8,
    style: Number(process.env.MONEY_VOICE_STYLE ?? 0.45),
    use_speaker_boost: true,
};

// ── v3 direction ─────────────────────────────────────────────────────────────

/**
 * Which model reads this channel.
 *
 * Pinned per call, never through ELEVENLABS_MODEL_ID: that env var is global,
 * so setting it to move this channel to v3 would drag the Rajneeti news
 * pipeline along with it. Two channels, two reads, two decisions.
 *
 * v3 by measurement, not by preference. The probe settled both questions it
 * had to:
 *
 *   - It returns word timings — 27 for the same line v2 returns 27 for. That
 *     was the gate; without timings every cut and caption falls back to a guess.
 *   - The direction tags are not spoken. Their characters occupy 7.7ms each
 *     against 77ms for every character the voice actually says, and the tagged
 *     take came back 0.1s SHORTER than the untagged one despite carrying 39
 *     more characters. Had they been read aloud it would have been ~3s longer.
 *
 * Set MONEY_TTS_MODEL=eleven_multilingual_v2 to go back; nothing else changes,
 * because the tags are only added for a model that accepts them.
 */
export const MONEY_TTS_MODEL = process.env.MONEY_TTS_MODEL || 'eleven_v3';

/** v3 reads inline [tags] as direction. v2 has no such concept and says them. */
export const acceptsAudioTags = (modelId: string): boolean => /^eleven_v3/.test(modelId);

/**
 * The only tags this channel uses, and deliberately a short list.
 *
 * These four are the ones the probe actually sent and got audio back for. The
 * tag set is not a documented closed list, so an untested one may simply be
 * read aloud as a word — a failure that costs a full episode of credits and is
 * audible only, never visible in a log. A fifth tag means probing it first.
 */
export const TAG_VOCABULARY = ['[thoughtful]', '[pause]', '[emphatic]', '[breathes]'] as const;

/**
 * Removes v3 audio tags from text.
 *
 * They are direction, not speech — but they live inside the text string, so
 * anything comparing what we sent against what we meant has to ignore them.
 */
export const stripAudioTags = (s: string): string =>
    s.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * True for a timing token that is genuinely spoken rather than a tag.
 *
 * Holds because every spoken token in this channel is Devanagari or bare
 * punctuation: `languageIssues` rejects a `say` line containing no Devanagari,
 * and separately rejects digits and ₹/$/% in spoken lines. So a token carrying
 * Latin letters and no Devanagari can only have come from a tag. That is an
 * assumption about another module, so `checkgen` asserts it instead of trusting
 * it.
 */
const isSpokenToken = (w: WordTiming): boolean =>
    /[\u0900-\u097F]/.test(w.word) || /^[^\p{L}]*$/u.test(w.word);

/**
 * Drops tag tokens out of the returned word timings.
 *
 * The probe caught this: the same line came back as 27 timed words plain and
 * **31 with four audio tags**, the character count growing by exactly the
 * tags' length. They sit in the alignment stream as though spoken. Left in,
 * `beatTimingAligner` would try to match "[thoughtful]" against the script,
 * fail, and fall back to a proportional split — losing the exact property v3
 * was adopted to improve, and losing it silently.
 */
export const dropTagTimings = (words: WordTiming[]): WordTiming[] => words.filter(isSpokenToken);

/**
 * How many seconds of audio the dropped tag tokens occupy.
 *
 * This is the measurement that answers the question the probe left open. The
 * tags come back inside the alignment — but that alone does not say whether
 * they were VOCALISED. If v3 treats them as direction their spans collapse to
 * near zero and this returns roughly 0. If it said "thoughtful" out loud, each
 * occupies a real speaking duration and this returns something near a second.
 *
 * Cutting is safe either way, because the tokens are filtered before alignment.
 * The audio is not: a read that says "pause" aloud is a ruined episode that
 * every automated check still passes. So it is logged on every run, and the
 * probe reports it per tag.
 */
export const tagAudibleSeconds = (words: WordTiming[]): number =>
    words.filter((w) => !isSpokenToken(w)).reduce((sum, w) => sum + Math.max(0, w.end - w.start), 0);

/**
 * Builds the voiceover string with v3 direction woven in.
 *
 * Structure-aware on purpose. Given only the joined string there is no reliable
 * way to find the sentence carrying the key figure — spoken lines spell their
 * numbers in Hindi words, so there are no digits to search for. Given the
 * script, the beat holding a `bigNumber` visual IS the beat about the number,
 * by construction.
 *
 * Four placements, every one of them at a boundary between complete lines, so
 * no beat's own word run is ever interrupted. That keeps each beat contiguous
 * in the filtered timing stream, which is what the aligner walks.
 *
 *   [thoughtful]        opens the hook, setting the register before the provocation
 *   [breathes]          after the hook, where the explanation begins
 *   [pause] [emphatic]  before the beat carrying the number — silence, then hit it
 *   [breathes]          before the CTA, where the read turns to the viewer
 *
 * Restrained by design: four or five marks across a forty-second read. Tagging
 * every sentence produces a different artificial voice, not a human one.
 *
 * Stripping the result must return `voiceoverText(script)` exactly — asserted
 * offline for every fixture, and enforced again at runtime by the drift guard.
 */
export function directedVoiceoverText(script: MoneyScript, modelId: string = MONEY_TTS_MODEL): string {
    const plain = voiceoverText(script);
    if (!acceptsAudioTags(modelId)) return plain;

    const spoken = script.beats.filter((b) => (b.say ?? '').trim());
    if (!spoken.length) return plain;

    const hook = (script.hookSaid ?? '').trim();
    const cta = (script.ctaSaid ?? '').trim();

    // Falls back to the first beat rather than to no emphasis at all: emphasis
    // in a defensible place beats a uniformly flat read.
    const found = spoken.findIndex((b) => b.visual?.kind === 'bigNumber');
    const numberAt = found >= 0 ? found : 0;

    const parts: string[] = [];
    if (hook) parts.push('[thoughtful]', hook, '[breathes]');
    spoken.forEach((beat, i) => {
        if (i === numberAt) {
            // The [breathes] after the hook already supplies the gap, so a
            // [pause] here as well would read as a stall rather than a beat.
            if (!(i === 0 && hook)) parts.push('[pause]');
            parts.push('[emphatic]');
        }
        parts.push((beat.say ?? '').trim());
    });
    if (cta) parts.push('[breathes]', cta);

    const directed = parts.join(' ');

    // Cheap, and worth it: a bug here spends real credits on a read that then
    // trips the drift guard, so the failure arrives minutes later in CI with
    // the audio already paid for.
    if (stripAudioTags(directed) !== plain) {
        throw new Error(
            '[money] Direction changed the words, not just the delivery.\n' +
                `  stripped: ${stripAudioTags(directed).slice(0, 160)}\n` +
                `  expected: ${plain.slice(0, 160)}`,
        );
    }
    return directed;
}

const letters = (s: string): string =>
    s.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

export interface MoneyVoiceResult {
    audioBuffer: Buffer;
    wordTimings: WordTiming[];
    /** The exact string sent to TTS. Equal to voiceoverText(script). */
    spokenText: string;
}

export async function speakMoneyScript(
    script: MoneyScript,
    voiceId: string = MONEY_VOICE_ID,
    modelId: string = MONEY_TTS_MODEL,
): Promise<MoneyVoiceResult> {
    const text = voiceoverText(script);
    if (!text.trim()) throw new Error('[money] Refusing to call TTS with an empty voiceover.');

    // Direction is added only for a model that understands it; on v2 this is
    // the plain text unchanged, so the same script works on either.
    const directed = directedVoiceoverText(script, modelId);

    const raw = await generateAudioWithTimestamps(
        directed,
        voiceId || undefined,
        { normalizeNumerals: false, voiceSettings: MONEY_VOICE_SETTINGS, modelId },
    );
    const audioBuffer = raw.audioBuffer;
    const spokenText = stripAudioTags(raw.spokenText);
    const wordTimings = dropTagTimings(raw.wordTimings);

    // Logged every run, because it is the only place the failure shows up
    // outside of listening. Tags removed from the timings cost nothing; tags
    // that were actually VOCALISED ruin the read while every check still
    // passes. Anything above a few tenths of a second means stop and listen.
    const dropped = raw.wordTimings.length - wordTimings.length;
    if (dropped > 0) {
        // Compared as a RATE against this read's own speaking speed, not against
        // a fixed number of seconds. A longer script carries more tags, so an
        // absolute threshold would start crying wolf on exactly the episodes
        // that are working fine.
        const tagSec = tagAudibleSeconds(raw.wordTimings);
        const spokenSec = wordTimings.reduce((a, w) => a + Math.max(0, w.end - w.start), 0);
        const tagRate = tagSec / dropped;
        const spokenRate = spokenSec / Math.max(1, wordTimings.length);
        const ratio = tagRate > 0 ? spokenRate / tagRate : Infinity;
        console.log(
            `[money] ${dropped} direction tag(s) removed from the timings ` +
                `(${tagSec.toFixed(2)}s, ${ratio.toFixed(1)}x faster than this read's own speech)` +
                (ratio < 2 ? '  ⚠️  slow enough to have been SPOKEN — listen before publishing' : ''),
        );
    }

    if (letters(spokenText) !== letters(text)) {
        throw new Error(
            '[money] TTS altered the script before speaking it, so beat alignment would ' +
                'silently fall back to a proportional split.\n' +
                `  sent:     ${spokenText.slice(0, 160)}\n` +
                `  expected: ${text.slice(0, 160)}`,
        );
    }

    if (!wordTimings.length) {
        throw new Error('[money] TTS returned no word timings; beats cannot be aligned.');
    }

    return { audioBuffer, wordTimings, spokenText };
}

// ── Voice discovery ──────────────────────────────────────────────────────────

export interface VoiceSummary {
    voiceId: string;
    name: string;
    labels: Record<string, string>;
    previewUrl?: string;
}

/**
 * Lists the voices available on the account. Free call, and the only way to
 * choose a real Hindi voice — voice IDs cannot be guessed from outside.
 */
export async function listVoices(): Promise<VoiceSummary[]> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set.');

    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
        signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`ElevenLabs /voices ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const data: any = await res.json();
    return (data.voices ?? []).map((v: any) => ({
        voiceId: v.voice_id,
        name: v.name,
        labels: v.labels ?? {},
        previewUrl: v.preview_url,
    }));
}

/**
 * Ranks voices for this channel: early-20s, warm, and able to carry Hindi.
 *
 * Deliberately a ranking rather than a filter. ElevenLabs labels are
 * inconsistent and often absent, so a strict filter regularly returns nothing;
 * this surfaces the likely candidates first and still lists the rest.
 */
export function rankForMoneyChannel(voices: VoiceSummary[]): VoiceSummary[] {
    const score = (v: VoiceSummary): number => {
        const blob = `${v.name} ${Object.values(v.labels).join(' ')}`.toLowerCase();
        let s = 0;
        if (/hindi|indian|india/.test(blob)) s += 5;
        if (/young|youthful|20s/.test(blob)) s += 3;
        if (/warm|friendly|casual|conversational|relatable/.test(blob)) s += 2;
        if (/narration|social media/.test(blob)) s += 1;
        if (/old|mature|elderly|middle.aged/.test(blob)) s -= 2;
        if (/news|announcer|authoritative/.test(blob)) s -= 1;
        return s;
    };
    return [...voices].sort((a, b) => score(b) - score(a));
}
