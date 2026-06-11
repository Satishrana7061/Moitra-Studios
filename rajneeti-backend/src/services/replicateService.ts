import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Calls Replicate to generate a talking head video from an image and audio buffer.
 * Automatically saves audio to a temporary file for the upload, polls for completion,
 * and downloads the finished video to a temporary path.
 * 
 * @param imagePath - Absolute path to the source avatar image
 * @param audioBuffer - Buffer containing the speaker's voice audio
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
    const useEnhancer = process.env.SADTALKER_USE_ENHANCER === 'true';
    const imageSize = parseInt(process.env.SADTALKER_IMAGE_SIZE || '256', 10);

    console.log(`[Replicate] Starting lip-sync for ${speakerName} using ${provider}...`);
    console.log(`[Replicate] Source image: ${path.basename(imagePath)} (${(fs.statSync(imagePath).size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`[Replicate] Audio length: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

    // 1. Prepare green-screen image (composites transparent PNG onto solid green #00FF00)
    const tmpGreenImagePath = path.join(os.tmpdir(), `${speakerName}_green_${Date.now()}.png`);
    let activeSourceImagePath = imagePath;
    
    try {
        console.log(`[Replicate] Getting avatar dimensions...`);
        const dims = execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${imagePath}"`,
            { timeout: 10000 }
        ).toString().trim();
        
        console.log(`[Replicate] Rendering green-screen canvas for avatar overlay (size: ${dims})...`);
        execSync(
            `ffmpeg -y -f lavfi -i color=c=0x00ff00:s=${dims} -i "${imagePath}" -filter_complex "[0:v][1:v]overlay=format=auto" -frames:v 1 -update 1 "${tmpGreenImagePath}"`,
            { stdio: 'ignore', timeout: 15000 }
        );
        
        activeSourceImagePath = tmpGreenImagePath;
        console.log(`[Replicate] Green-screen render successful: ${path.basename(tmpGreenImagePath)}`);
    } catch (err: any) {
        console.warn(`[Replicate] Warning: Failed to generate green screen image, fallback to raw PNG: ${err.message}`);
    }

    // 2. Write the audio buffer to a temporary file
    const tmpAudioPath = path.join(os.tmpdir(), `${speakerName}_voice_${Date.now()}.mp3`);
    fs.writeFileSync(tmpAudioPath, audioBuffer);

    // 3. Prepare inputs as streams
    const imageStream = fs.createReadStream(activeSourceImagePath);
    const audioStream = fs.createReadStream(tmpAudioPath);

    let outputUrl: string;

    try {
        if (provider === 'wav2lip') {
            // devxpy/cog-wav2lip model version ID
            const modelVersion = "devxpy/cog-wav2lip:cd532e0c0617300c14457e5e33d0277df6063e00cf7cd7be40854746fefefefb";
            console.log(`[Replicate] Triggering devxpy/cog-wav2lip model run...`);
            
            const output = await replicate.run(modelVersion, {
                input: {
                    face: imageStream,
                    audio: audioStream,
                }
            }) as any;

            outputUrl = typeof output === 'string' ? output : output[0];
        } else {
            // cjwbw/sadtalker model version ID
            const modelVersion = "cjwbw/sadtalker:2b4d7c04e2ad2d55c3270b76e8e750170a4843b0d70f074d221804b40742f1f5";
            console.log(`[Replicate] Triggering cjwbw/sadtalker model run (enhancer=${useEnhancer}, size=${imageSize})...`);

            const output = await replicate.run(modelVersion, {
                input: {
                    source_image: imageStream,
                    driven_audio: audioStream,
                    still_mode: true,
                    preprocess: "full",
                    use_enhancer: useEnhancer,
                    size_of_image: imageSize,
                }
            }) as any;

            outputUrl = typeof output === 'string' ? output : output[0];
        }

        if (!outputUrl) {
            throw new Error("Replicate returned an empty output URL.");
        }

        console.log(`[Replicate] Model finished successfully! Output URL: ${outputUrl}`);

        // 3. Download the generated video to a temporary path
        const downloadPath = path.join(os.tmpdir(), `${speakerName}_talking_${Date.now()}.mp4`);
        console.log(`[Replicate] Downloading speaking video to: ${downloadPath}`);
        
        const response = await fetch(outputUrl);
        if (!response.ok) {
            throw new Error(`Failed to download Replicate output video: ${response.statusText}`);
        }
        
        const fileStream = fs.createWriteStream(downloadPath);
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(downloadPath, Buffer.from(arrayBuffer));
        
        console.log(`[Replicate] Download complete. File size: ${(fs.statSync(downloadPath).size / 1024).toFixed(2)} KB`);
        return downloadPath;

    } finally {
        // Cleanup local temporary audio file
        try {
            if (fs.existsSync(tmpAudioPath)) {
                fs.unlinkSync(tmpAudioPath);
            }
        } catch (err) {
            console.warn(`[Replicate] Warning: Failed to delete temp audio file: ${tmpAudioPath}`);
        }
        // Cleanup local temporary green screen image
        try {
            if (fs.existsSync(tmpGreenImagePath)) {
                fs.unlinkSync(tmpGreenImagePath);
            }
        } catch (err) {
            console.warn(`[Replicate] Warning: Failed to delete temp green image file: ${tmpGreenImagePath}`);
        }
    }
}
