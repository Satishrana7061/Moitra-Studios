/**
 * ElevenLabs Text-to-Speech Service
 * Handles Hindi/Hinglish audio generation for news reels.
 * 
 * Uses eleven_multilingual_v2 for proper Hindi pronunciation.
 * Text should be pre-normalized (years → Hindi words) before calling this.
 * 
 * Two modes:
 *   1. generateAudio() — Standard TTS, returns audio buffer only
 *   2. generateAudioWithTimestamps() — TTS with word-level timing data
 */

export interface WordTiming {
    word: string;
    start: number;  // seconds
    end: number;    // seconds
}

/**
 * Converts numbers to their English spoken word equivalents.
 */
function numberToEnglishWord(num: number): string {
    if (num === 0) return 'zero';
    
    // For years (like 2014, 2024, 1999), it is best pronounced as "twenty fourteen" or "twenty twenty four"
    if (num >= 1900 && num <= 2099) {
        const firstHalf = Math.floor(num / 100);
        const secondHalf = num % 100;
        if (secondHalf === 0) {
            return `${numberToEnglishWord(firstHalf)} hundred`;
        }
        if (secondHalf < 10) {
            return `${numberToEnglishWord(firstHalf)} oh ${numberToEnglishWord(secondHalf)}`;
        }
        return `${numberToEnglishWord(firstHalf)} ${numberToEnglishWord(secondHalf)}`;
    }

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    let words = '';

    if (num >= 1000) {
        words += ones[Math.floor(num / 1000)] + ' thousand ';
        num %= 1000;
    }

    if (num >= 100) {
        words += ones[Math.floor(num / 100)] + ' hundred ';
        num %= 100;
    }

    if (num >= 20) {
        words += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
    }

    if (num > 0) {
        words += ones[num] + ' ';
    }

    return words.trim();
}

/**
 * Replaces sequences of digits (years, single digits, larger counts) with their English words.
 */
export function normalizeNumeralsForTTS(text: string): string {
    return text.replace(/\b\d+\b/g, (match) => {
        const num = parseInt(match, 10);
        return numberToEnglishWord(num);
    });
}

/**
 * Standard TTS — generates audio buffer from text.
 * Used by PM Promises pipeline where word-level sync is not needed.
 */
export async function generateAudio(text: string, voiceId?: string): Promise<Buffer> {
    const normalizedText = normalizeNumeralsForTTS(text);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const finalVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || 'tVeibrRmkweME2rrFZAs'; // User defined voice

    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: normalizedText,
                // Use multilingual v2 for proper Hindi/Hinglish pronunciation
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.55,
                    similarity_boost: 0.75,
                    style: 0.15, // Subtle style for natural delivery
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errBody}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`[ElevenLabs] Audio generated successfully (${arrayBuffer.byteLength} bytes) using eleven_multilingual_v2`);
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error("ElevenLabs Error:", e);
        throw e;
    }
}


/**
 * TTS with timestamps — generates audio AND word-level timing data.
 * Uses the /with-timestamps endpoint that returns character-level alignment.
 * Characters are aggregated into word-level timings for subtitle sync.
 * 
 * Used by PM Interview pipeline for phrase-by-phrase caption sync.
 */
export async function generateAudioWithTimestamps(
    text: string, 
    voiceId?: string
): Promise<{ audioBuffer: Buffer; wordTimings: WordTiming[] }> {
    const normalizedText = normalizeNumeralsForTTS(text);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const finalVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || 'tVeibrRmkweME2rrFZAs';

    if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY is not set.");
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}/with-timestamps`;

    try {
        console.log(`[ElevenLabs] Generating audio with timestamps for ${normalizedText.length} chars...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: normalizedText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.55,
                    similarity_boost: 0.75,
                    style: 0.15,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.warn(`[ElevenLabs] Timestamps endpoint failed (${response.status}): ${errBody}`);
            console.warn('[ElevenLabs] Falling back to standard TTS with estimated timings...');
            return fallbackWithEstimatedTimings(text, voiceId);
        }

        const data: any = await response.json();

        // Extract audio from base64
        const audioBase64 = data.audio_base64;
        if (!audioBase64) {
            console.warn('[ElevenLabs] No audio_base64 in response. Falling back...');
            return fallbackWithEstimatedTimings(text, voiceId);
        }
        const audioBuffer = Buffer.from(audioBase64, 'base64');

        // Extract alignment data — character-level timestamps
        const alignment = data.alignment;
        if (!alignment || !alignment.characters || !alignment.character_start_times_seconds || !alignment.character_end_times_seconds) {
            console.warn('[ElevenLabs] No alignment data in response. Using estimated timings.');
            // Still return the audio, just estimate the timings
            const wordTimings = estimateWordTimingsFromText(text, audioBuffer);
            return { audioBuffer, wordTimings };
        }

        // Aggregate character timestamps into word-level timestamps
        const wordTimings = aggregateCharacterTimings(
            alignment.characters as string[],
            alignment.character_start_times_seconds as number[],
            alignment.character_end_times_seconds as number[]
        );

        console.log(`[ElevenLabs] Audio with timestamps: ${audioBuffer.length} bytes, ${wordTimings.length} words`);
        if (wordTimings.length > 0) {
            console.log(`[ElevenLabs] First word: "${wordTimings[0].word}" at ${wordTimings[0].start.toFixed(3)}s`);
            console.log(`[ElevenLabs] Last word: "${wordTimings[wordTimings.length - 1].word}" at ${wordTimings[wordTimings.length - 1].end.toFixed(3)}s`);
        }

        return { audioBuffer, wordTimings };

    } catch (err: any) {
        console.error(`[ElevenLabs] Timestamps generation error: ${err.message}`);
        console.warn('[ElevenLabs] Falling back to standard TTS with estimated timings...');
        return fallbackWithEstimatedTimings(text, voiceId);
    }
}


/**
 * Aggregates character-level timestamps into word-level timestamps.
 * Groups consecutive non-space characters into words.
 */
function aggregateCharacterTimings(
    characters: string[],
    startTimes: number[],
    endTimes: number[]
): WordTiming[] {
    const words: WordTiming[] = [];
    let currentWord = '';
    let wordStart = -1;
    let wordEnd = -1;

    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const charStart = startTimes[i];
        const charEnd = endTimes[i];

        if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
            // Space or whitespace — flush current word
            if (currentWord.trim()) {
                words.push({
                    word: currentWord.trim(),
                    start: wordStart,
                    end: wordEnd,
                });
            }
            currentWord = '';
            wordStart = -1;
            wordEnd = -1;
        } else {
            // Part of a word
            if (wordStart < 0) {
                wordStart = charStart;
            }
            wordEnd = charEnd;
            currentWord += char;
        }
    }

    // Flush last word
    if (currentWord.trim()) {
        words.push({
            word: currentWord.trim(),
            start: wordStart,
            end: wordEnd,
        });
    }

    return words;
}


/**
 * Fallback: uses standard generateAudio() and estimates word timings
 * by distributing words evenly across the audio duration.
 */
async function fallbackWithEstimatedTimings(
    text: string, 
    voiceId?: string
): Promise<{ audioBuffer: Buffer; wordTimings: WordTiming[] }> {
    const audioBuffer = await generateAudio(text, voiceId);
    const wordTimings = estimateWordTimingsFromText(text, audioBuffer);
    return { audioBuffer, wordTimings };
}


/**
 * Estimates word timings from text when alignment data is unavailable.
 * Uses a simple even distribution across a rough duration estimate.
 */
function estimateWordTimingsFromText(text: string, audioBuffer: Buffer): WordTiming[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    // Rough estimate: ~3 words per second for Hindi speech
    const estimatedDuration = words.length / 3.0;
    const wordDuration = estimatedDuration / words.length;

    return words.map((word, i) => ({
        word,
        start: i * wordDuration,
        end: (i + 1) * wordDuration,
    }));
}
