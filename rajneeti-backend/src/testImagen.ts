import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testImagen4() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in .env");
        return;
    }
    console.log("Testing Imagen 4 with key:", apiKey.slice(0, 10) + "...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: "A beautiful professional photograph of a modern solar farm in India, sunrise, cinematic lighting, photorealistic, 4k"
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '9:16',
                    outputMimeType: 'image/jpeg'
                }
            })
        });

        if (!res.ok) {
            console.error("HTTP error:", res.status, await res.text());
            return;
        }

        const data: any = await res.json();
        const prediction = data.predictions?.[0];
        const base64Str = prediction?.bytesBase64Encoded || prediction?.structValue?.fields?.bytesBase64Encoded?.stringValue;

        if (base64Str) {
            console.log("✅ Success! Image bytes received. Size:", base64Str.length, "chars");
        } else {
            console.log("❌ Response did not contain image bytes:", JSON.stringify(data));
        }
    } catch (err: any) {
        console.error("Exception:", err);
    }
}

testImagen4();
