/**
 * ElevenLabs Text-to-Speech Service
 * Handles Hindi audio generation for news reels using the Monika voice.
 */

export async function generateAudio(text: string): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'Ms9OTvWb99V6DwRHZn6q'; // Default to Monika

    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
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
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.2, // A bit of style for news anchoring
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errBody}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error("ElevenLabs Error:", e);
        throw e;
    }
}
