import { generateAudio } from './services/elevenLabsService.js';
import { generateHeadlessVideo } from './services/puppeteerVideoGenerator.js';
import { getNextVerifiedPromiseForReel, verifyNextPromise } from './services/truthEngine.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function buildHindiScript(promise: {
    title: string;
    description: string;
    source_manifesto_year: number;
    status: string;
    verdict_summary: string;
    fulfilled_details?: string;
    unfulfilled_details?: string;
}): string {
    let script = `प्रधानमंत्री नरेंद्र मोदी का बड़ा वादा: ${promise.title}। `;
    script += `यह वादा ${promise.source_manifesto_year} के चुनावी घोषणापत्र में किया गया था। `;
    script += `मूल वादा था कि: ${promise.description}। `;
    script += `हमारा निष्पक्ष विश्लेषण: `;

    if (promise.status === 'Fulfilled') {
        script += `यह वादा पूर्ण रूप से पूरा हो चुका है। `;
        if (promise.fulfilled_details) script += `${promise.fulfilled_details} `;
    } else if (promise.status === 'Partially Fulfilled') {
        script += `यह वादा आंशिक रूप से ही पूरा हो सका है। `;
        if (promise.fulfilled_details) script += `${promise.fulfilled_details} `;
        if (promise.unfulfilled_details) script += `हालांकि, ${promise.unfulfilled_details} `;
    } else if (promise.status === 'In Progress') {
        script += `इस वादे पर कार्य अभी प्रगति पर है। `;
        if (promise.fulfilled_details) script += `${promise.fulfilled_details} `;
        if (promise.unfulfilled_details) script += `लेकिन ${promise.unfulfilled_details} `;
    } else if (promise.status === 'Not Fulfilled') {
        script += `यह वादा अधूरा रह गया है। `;
        if (promise.unfulfilled_details) script += `${promise.unfulfilled_details} `;
    } else {
        script += `${promise.verdict_summary} `;
    }

    script += `सच्चे और निष्पक्ष विश्लेषण के लिए Moitra Studios को फॉलो करें।`;
    return script.replace(/\s+/g, ' ').trim();
}

async function runLocalReelTest() {
    console.log("🚀 Starting Local Reel Generation Test (Non-Publishing)...");
    console.log("----------------------------------------------------------");
    
    // Set custom frontend URL if needed (default to dev port if running local dev server)
    process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log(`[Test] Frontend URL configured to: ${process.env.FRONTEND_URL}`);

    let testPromise: any = null;

    try {
        // Try to fetch a verified promise from Supabase
        console.log("[Test] Checking Supabase for a verified promise...");
        testPromise = await getNextVerifiedPromiseForReel();

        // If none verified, try verifying one now
        if (!testPromise) {
            console.log("[Test] No verified promise found. Attempting to verify one using Truth Engine...");
            const verified = await verifyNextPromise();
            if (verified) {
                testPromise = verified;
            }
        }
    } catch (dbErr) {
        console.warn("[Test] Failed to query Supabase. Using mock promise data for test.");
    }

    // Fallback Mock Promise if DB is empty or fails
    if (!testPromise) {
        console.log("[Test] Using mock promise for local rendering...");
        testPromise = {
            id: 'mock-test-id',
            title: 'National Highway Expansion',
            description: 'To construct 10,000 km of new national highways across the country to improve connectivity.',
            source_manifesto_year: 2019,
            category: 'Infrastructure',
            status: 'Partially Fulfilled',
            verdict_summary: 'Major sections of highways have been constructed, though some target milestones were delayed.',
            slug: 'national-congress-nehru-tribute-plus-3', // use existing valid slug route
            fulfilled_details: 'Over 8,500 km of highways were successfully laid.',
            unfulfilled_details: 'Land acquisition issues delayed the remaining stretches.'
        };
    }

    console.log(`[Test] Targeted Promise: "${testPromise.title}"`);
    console.log(`[Test] Status: ${testPromise.status}`);

    // Build the script
    const hindiScript = buildHindiScript(testPromise);
    console.log(`[Test] Script: "${hindiScript}"`);

    // Generate Audio
    console.log("\n[Test] Generating Audio via ElevenLabs...");
    let audioBuffer = Buffer.alloc(0);
    if (!process.env.ELEVENLABS_API_KEY) {
        console.warn("[Test] ⚠️ ELEVENLABS_API_KEY is missing. Generating silent reel for video layout test.");
    } else {
        try {
            audioBuffer = await generateAudio(hindiScript);
            console.log(`[Test] Successfully generated voice audio: ${audioBuffer.length} bytes`);
        } catch (e: any) {
            console.error(`[Test] ❌ ElevenLabs generation failed: ${e.message}. Falling back to silent video.`);
        }
    }

    // Generate Video
    console.log("\n[Test] Launching Puppeteer to generate video...");
    process.env.NEWS_TITLE = `PM Promise: ${testPromise.title}`;
    process.env.NEWS_SUMMARY = testPromise.verdict_summary;

    try {
        const videoBuffer = await generateHeadlessVideo(testPromise.slug, audioBuffer);
        const outputPath = path.join(process.cwd(), 'local-test-reel.mp4');
        fs.writeFileSync(outputPath, videoBuffer);
        console.log("\n==========================================================");
        console.log(`✅ SUCCESS! Local test reel generated successfully.`);
        console.log(`Saved to: ${outputPath}`);
        console.log(`File Size: ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
        console.log("==========================================================");
    } catch (videoErr: any) {
        console.error("\n❌ Video generation failed:", videoErr.message || videoErr);
    }
}

runLocalReelTest();
