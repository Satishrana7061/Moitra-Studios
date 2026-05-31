async function testGeminiImageModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in environment");
        return;
    }
    console.log("Testing gemini-3.1-flash-image with key:", apiKey.slice(0, 10) + "...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: "A beautiful professional photograph of a modern solar farm in India, sunrise, cinematic lighting, photorealistic, 4k"
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseModalities: ["IMAGE"]
                }
            })
        });

        if (!res.ok) {
            console.error("HTTP error:", res.status, await res.text());
            return;
        }

        const data: any = await res.json();
        const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        const base64Str = part?.inlineData?.data;

        if (base64Str) {
            console.log("✅ Success! Image bytes received. Size:", base64Str.length, "chars");
        } else {
            console.log("❌ Response did not contain inlineData:", JSON.stringify(data));
        }
    } catch (err: any) {
        console.error("Exception:", err);
    }
}

testGeminiImageModel();
