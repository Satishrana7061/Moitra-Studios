import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Quick connection test — verifies the Replicate API token is valid.
 * Returns true if the token works, false otherwise.
 */
export async function testReplicateConnection(): Promise<boolean> {
    if (!process.env.REPLICATE_API_TOKEN) {
        console.error('[Replicate] No REPLICATE_API_TOKEN set.');
        return false;
    }
    try {
        // A lightweight API call to validate the token
        const models = await replicate.models.list();
        console.log(`[Replicate] ✅ Connection OK — token is valid (found ${models.results?.length ?? 0} models in listing).`);
        return true;
    } catch (err: any) {
        console.error(`[Replicate] ❌ Connection test FAILED: ${err.message}`);
        return false;
    }
}

/**
 * Calls Replicate SadTalker to generate a talking head video from a single
 * avatar image + a single turn's audio buffer.
 *
 * Changes from previous version:
 *  - Uses fs.readFileSync + new File() for SDK v1.4+ compatibility (not ReadStream)
 *  - Disables face enhancer by default (saves cost, better for CGI/cartoon avatars)
 *  - Adds retry logic (1 retry on failure)
 *  - Adds detailed error logging with full error objects
 *  - Removes green-screen compositing (not needed for per-turn approach)
 *
 * @param imagePath - Absolute path to the source avatar image
 * @param audioBuffer - Buffer containing the speaker's voice audio for ONE turn
 * @param speakerName - Name of the speaker (for logging/tmp files)
 * @returns Path to the downloaded talking head .mp4 file
 */
export async function generateTalkingHead(
    imagePath: string,
    audioBuffer: Buffer,
    speakerName: string
): Promise<string> {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is not set in environment variables.");
    }

    const provider = (process.env.LIP_SYNC_PROVIDER || 'sadtalker').toLowerCase();
    // Disable enhancer by default — GFPGAN degrades CGI/cartoon faces and doubles cost
    const useEnhancer = process.env.SADTALKER_USE_ENHANCER === 'true';
    const imageSize = parseInt(process.env.SADTALKER_IMAGE_SIZE || '256', 10);

    console.log(`[Replicate] Starting lip-sync for "${speakerName}" using ${provider}...`);
    console.log(`[Replicate]   Source image: ${path.basename(imagePath)} (${(fs.statSync(imagePath).size / 1024).toFixed(1)} KB)`);
    console.log(`[Replicate]   Audio length: ${(audioBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`[Replicate]   Enhancer: ${useEnhancer}, Image size: ${imageSize}`);

    // Write the audio buffer to a temporary file
    const tmpAudioPath = path.join(os.tmpdir(), `${speakerName}_voice_${Date.now()}.mp3`);
    fs.writeFileSync(tmpAudioPath, audioBuffer);

    const maxRetries = 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            console.log(`[Replicate] Retry attempt ${attempt}/${maxRetries} for ${speakerName}...`);
            // Wait 3 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        try {
            // Read files as Buffers and create File objects (SDK v1.4+ compatible)
            const imageData = fs.readFileSync(imagePath);
            const audioData = fs.readFileSync(tmpAudioPath);

            const imageFile = new File([imageData], path.basename(imagePath), { type: 'image/png' });
            const audioFile = new File([audioData], path.basename(tmpAudioPath), { type: 'audio/mpeg' });

            let outputUrl: string;
            const startTime = Date.now();

            if (provider === 'wav2lip') {
                console.log(`[Replicate] Triggering devxpy/cog-wav2lip...`);
                const output = await replicate.run(
                    "devxpy/cog-wav2lip:cd532e0c0617300c14457e5e33d0277df6063e00cf7cd7be40854746fefefefb",
                    {
                        input: {
                            face: imageFile,
                            audio: audioFile,
                        }
                    }
                ) as any;
                outputUrl = typeof output === 'string' ? output : (output?.url || output?.[0] || String(output));
            } else {
                // SadTalker — use model name without pinned version hash for latest
                console.log(`[Replicate] Triggering cjwbw/sadtalker (enhancer=${useEnhancer}, size=${imageSize})...`);
                const output = await replicate.run(
                    "cjwbw/sadtalker" as any,
                    {
                        input: {
                            source_image: imageFile,
                            driven_audio: audioFile,
                            still_mode: true,
                            preprocess: "full",
                            use_enhancer: useEnhancer,
                            size_of_image: imageSize,
                        }
                    }
                ) as any;
                outputUrl = typeof output === 'string' ? output : (output?.url || output?.[0] || String(output));
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[Replicate] Model finished in ${elapsed}s! Output URL: ${outputUrl}`);

            if (!outputUrl || outputUrl === 'undefined' || outputUrl === 'null') {
                throw new Error(`Replicate returned empty/invalid output: ${JSON.stringify(outputUrl)}`);
            }

            // Download the generated video to a temporary path
            const downloadPath = path.join(os.tmpdir(), `${speakerName}_talking_${Date.now()}.mp4`);
            console.log(`[Replicate] Downloading result video...`);

            const response = await fetch(outputUrl);
            if (!response.ok) {
                throw new Error(`Download failed (${response.status}): ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(downloadPath, Buffer.from(arrayBuffer));

            const fileSizeKB = (fs.statSync(downloadPath).size / 1024).toFixed(1);
            console.log(`[Replicate] ✅ ${speakerName} talking head ready: ${fileSizeKB} KB (took ${elapsed}s)`);

            // Cleanup temp audio
            try { if (fs.existsSync(tmpAudioPath)) fs.unlinkSync(tmpAudioPath); } catch {}

            return downloadPath;

        } catch (err: any) {
            lastError = err;
            console.error(`[Replicate] ❌ Attempt ${attempt + 1} failed for ${speakerName}:`);
            console.error(`[Replicate]   Error type: ${err.constructor?.name}`);
            console.error(`[Replicate]   Message: ${err.message}`);
            if (err.response) {
                console.error(`[Replicate]   HTTP Status: ${err.response.status}`);
                try {
                    const body = await err.response.text?.();
                    if (body) console.error(`[Replicate]   Response body: ${body.slice(0, 500)}`);
                } catch {}
            }
            if (err.stack) {
                console.error(`[Replicate]   Stack: ${err.stack.split('\n').slice(0, 3).join('\n')}`);
            }
        }
    }

    // Cleanup temp audio on final failure
    try { if (fs.existsSync(tmpAudioPath)) fs.unlinkSync(tmpAudioPath); } catch {}

    throw lastError || new Error(`Replicate generation failed for ${speakerName} after ${maxRetries + 1} attempts`);
}
