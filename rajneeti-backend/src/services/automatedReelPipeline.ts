import { generateAudio } from "./elevenLabsService.js";
import { generateHeadlessVideo } from "./puppeteerVideoGenerator.js";
import { SocialUploadService } from "./socialUploadService.js";
import { SupabaseStorageService } from "./supabaseStorage.js";
import { verifyNextPromise, getNextVerifiedPromiseForReel } from "./truthEngine.js";
import { createClient } from '@supabase/supabase-js';

// ── Supabase client for marking reels as posted ─────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Builds a professional Hindi script for a manifesto promise reel.
 */
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

/**
 * The master pipeline that orchestrates the entire automated reel process.
 * 
 * Flow:
 * 1. Check if auto-posting is enabled
 * 2. Verify one unverified promise (dual-model fact-check)
 * 3. Pick a verified promise for reel generation
 * 4. Generate Hindi audio → capture video → upload to all platforms
 * 5. Mark promise as posted in Supabase
 */
export async function runAutomatedReelPipeline() {
    // ── GATE: Check if auto-posting is enabled ──────────────────
    if (process.env.ENABLE_AUTO_POSTING !== 'true') {
        console.log('\n⏸️  [Pipeline] Auto-posting is DISABLED. Set ENABLE_AUTO_POSTING=true in .env to enable.');
        console.log('   [Pipeline] You can still manually trigger reels from the frontend Creator Studio.');
        return;
    }

    console.log('\n=== STARTING AUTOMATED REEL PIPELINE ===');

    try {
        // ── Step 1: Verify one promise (daily fact-check) ────────
        console.log('\n📋 Step 1: Running Truth Engine verification...');
        const verifiedPromise = await verifyNextPromise();
        if (verifiedPromise) {
            console.log(`[Pipeline] Verified: "${verifiedPromise.title}" → ${verifiedPromise.status}`);
        } else {
            console.log('[Pipeline] No new promise to verify (all done or conflict detected).');
        }

        // ── Step 2: Get next verified promise for reel ───────────
        console.log('\n🎬 Step 2: Selecting next verified promise for reel...');
        const reelPromise = await getNextVerifiedPromiseForReel();

        if (!reelPromise) {
            console.log('[Pipeline] No verified promises waiting for reel generation. Pipeline complete.');
            return;
        }

        console.log(`[Pipeline] Generating reel for: "${reelPromise.title}" (${reelPromise.source_manifesto_year})`);

        // ── Step 3: Generate Hindi AI Script ─────────────────────
        console.log('\n📝 Step 3: Building Hindi voiceover script...');
        const hindiScript = buildHindiScript(reelPromise);
        console.log(`[Pipeline] Script length: ${hindiScript.length} characters`);

        // ── Step 4: Generate Audio via ElevenLabs ────────────────
        console.log('\n🎤 Step 4: Generating ElevenLabs audio...');
        let audioBuffer: Buffer;
        try {
            audioBuffer = await generateAudio(hindiScript);
            console.log(`[Pipeline] Audio generated: ${audioBuffer.length} bytes`);
        } catch (err: any) {
            console.error(`[Pipeline] ElevenLabs failed: ${err.message}. Continuing without audio.`);
            audioBuffer = Buffer.alloc(0);
        }

        // ── Step 5: Generate Video via Puppeteer ─────────────────
        console.log('\n🎥 Step 5: Capturing headless video...');

        // Set env vars for the puppeteer video generator
        process.env.NEWS_TITLE = `PM Promise: ${reelPromise.title}`;
        process.env.NEWS_SUMMARY = reelPromise.verdict_summary;

        const videoBuffer = await generateHeadlessVideo(reelPromise.slug, audioBuffer);
        console.log(`[Pipeline] Video generated: ${videoBuffer.length} bytes`);

        // ── Step 6: Upload to Supabase Storage ───────────────────
        console.log('\n☁️ Step 6: Uploading to Supabase Storage...');
        const safeSlug = reelPromise.slug.slice(0, 50);
        const fileName = `promise-reel-${safeSlug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (!publicUrl) {
            throw new Error('Supabase upload failed. Check bucket permissions and secrets.');
        }
        console.log(`[Pipeline] Stored at: ${publicUrl}`);

        // ── Step 7: Publish to Social Media ──────────────────────
        console.log('\n📱 Step 7: Publishing to social platforms...');
        const caption = `PM Promise Audit: ${reelPromise.title}\n\n` +
            `Verdict: ${reelPromise.status}\n` +
            `${reelPromise.verdict_summary}\n\n` +
            `#Rajneeti #PMPromises #IndiaNews #Politics #Accountability #Trending`;

        // Instagram
        const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, caption);
        if (!igSuccess) console.warn('[Pipeline] Instagram upload failed, but continuing...');

        // Facebook
        const fbSuccess = await SocialUploadService.uploadToFacebook(publicUrl, caption);
        if (!fbSuccess) console.warn('[Pipeline] Facebook upload failed, but continuing...');

        // YouTube
        const ytTitle = `PM Promise: ${reelPromise.title} | ${reelPromise.status}`.slice(0, 100);
        const ytDescription = `${reelPromise.title}\n\n` +
            `Promise: "${reelPromise.description}"\n\n` +
            `Verdict: ${reelPromise.status}\n` +
            `${reelPromise.verdict_summary}\n\n` +
            `—\n📺 MOITRA STUDIOS\nNon-Partisan Political Accountability Tracker\n🌐 https://moitrastudios.com/prime-ministers-promises\n\n` +
            `#Shorts #PMPromises #Rajneeti #IndiaNews #Politics`;

        const dynamicTags = [
            reelPromise.category?.toLowerCase().replace(/\s+/g, ''),
            `manifesto${reelPromise.source_manifesto_year}`,
            'accountability',
            'factcheck',
        ].filter(Boolean) as string[];

        const ytSuccess = await SocialUploadService.uploadToYouTube(videoBuffer, ytTitle, ytDescription, dynamicTags);
        if (!ytSuccess) console.warn('[Pipeline] YouTube upload failed.');

        // ── Step 8: Mark promise as posted in Supabase ───────────
        if (supabase) {
            console.log('\n✏️ Step 8: Marking promise as reel-posted in database...');
            const { error: markError } = await (supabase as any)
                .from('manifesto_promises')
                .update({
                    reel_posted: true,
                    reel_link: publicUrl,
                })
                .eq('id', reelPromise.id);

            if (markError) {
                console.error(`[Pipeline] Failed to mark as posted: ${markError.message}`);
            }
        }

        // ── Step 9: Cleanup old videos ───────────────────────────
        await SupabaseStorageService.cleanupOldVideos();

        console.log('\n=== AUTOMATED REEL PIPELINE COMPLETED SUCCESSFULLY ===');
        console.log(`   Promise: "${reelPromise.title}"`);
        console.log(`   Status: ${reelPromise.status}`);
        console.log(`   Platforms: IG=${igSuccess} FB=${fbSuccess} YT=${ytSuccess}`);

    } catch (err: any) {
        console.error('\n=== AUTOMATED REEL PIPELINE FAILED ===', err.message || err);
        throw err;
    }
}
