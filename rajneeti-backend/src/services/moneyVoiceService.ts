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

import { generateAudioWithTimestamps, type WordTiming } from './elevenLabsService.js';
import { voiceoverText, type MoneyScript } from './moneyScriptGenerator.js';

/** Default read for this channel. Overridden per-run by the voice lab. */
export const MONEY_VOICE_ID = process.env.ELEVENLABS_VOICE_ID__MONEY || '';

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
): Promise<MoneyVoiceResult> {
    const text = voiceoverText(script);
    if (!text.trim()) throw new Error('[money] Refusing to call TTS with an empty voiceover.');

    const { audioBuffer, wordTimings, spokenText } = await generateAudioWithTimestamps(
        text,
        voiceId || undefined,
        { normalizeNumerals: false },
    );

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
