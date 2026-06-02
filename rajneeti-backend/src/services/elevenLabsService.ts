/**
 * ElevenLabs Text-to-Speech Service
 * Handles Hindi/Hinglish audio generation for news reels.
 * 
 * Uses eleven_multilingual_v2 for proper Hindi pronunciation.
 * Text should be pre-normalized (years → Hindi words) before calling this.
 */

export async function generateAudio(text: string, voiceId?: string): Promise<Buffer> {
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
                text: text,
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
