import dotenv from 'dotenv';

// Use a simple prompt via fetch to Gemini API to translate and add pacing
export async function translateToHindi(englishText: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not set.");

    const prompt = `You are a professional Hindi news anchor translator. Translate the following news summary into highly engaging, formal Hindi suitable for a news broadcast. 
Insert natural pauses using commas, and emphasize important points. DO NOT use any English words if there is a common Hindi equivalent, but you can use English names. Return ONLY the translated Hindi text without any conversational filler or quotes.

News:
${englishText}`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.candidates?.[0]?.content?.parts?.[0]?.text || englishText;
    } catch (e) {
        console.error("Translation Error:", e);
        return englishText; // Fallback to English if translation fails
    }
}

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
