import { generateAudio } from "./elevenLabsService.js";
import { generateHeadlessVideo } from "./puppeteerVideoGenerator.js";
import { SocialUploadService } from "./socialUploadService.js";
import { SupabaseStorageService } from "./supabaseStorage.js";
import { verifyNextPromise, getNextVerifiedPromiseForReel } from "./truthEngine.js";
import { createClient } from '@supabase/supabase-js';
import { OPENAI_API_KEY } from "../config.js";

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

        // Calculate the current Reel Number dynamically
        let reelNumber = 1;
        if (supabase) {
            try {
                const { count, error: countError } = await (supabase as any)
                    .from('manifesto_promises')
                    .select('*', { count: 'exact', head: true })
                    .eq('reel_posted', true);
                if (!countError && count !== null) {
                    reelNumber = count + 1;
                }
            } catch (countErr) {
                console.warn('[Pipeline] Failed to fetch reel number. Defaulting to 1.');
            }
        }
        console.log(`[Pipeline] Calculated current Reel Number: #${reelNumber}`);

        // ── Step 3: Generate Casual Hinglish Delhi Teen script and Hindi Slides ─────────
        console.log('\n📝 Step 3: Building Casual Hinglish Delhi Teen script and Hindi Slides...');
        
        let voiceoverText = `Yo guys! PM Promise Audit, Reel number ${reelNumber}! ${reelPromise.source_manifesto_year} manifesto ka ek bada vada tha: ${reelPromise.title}. Real truth check? ${reelPromise.status}! Data source: Internet reports.`;
        let slide1 = `${reelPromise.title.slice(0, 35)}`;
        let slide2 = `Verdict: ${reelPromise.status}`;
        let slide3 = `Source: Internet Evidence`;

        if (OPENAI_API_KEY) {
            try {
                console.log('[Pipeline] Querying OpenAI for casual Delhi Teen Hinglish script & short Hindi slides...');
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { 
                                role: 'system', 
                                content: 'You are an 18-year-old local Delhi student auditing election promises from home. You talk in a polite, natural, yet casual Hinglish street tone (like a normal Delhi teen talking on camera). Output ONLY valid JSON.' 
                            },
                            { 
                                role: 'user', 
                                content: `We are auditing a Prime Minister promise: "${reelPromise.title}" from the ${reelPromise.source_manifesto_year} manifesto.
Reality Fact-check status: "${reelPromise.status}"
Evidence details: "${reelPromise.verdict_summary}"

Generate a short Hinglish script and 3 short Hindi slide points.
Tone & Content guidelines:
- Speak in a natural, casual Delhi teen Hinglish tone (use simple words like "bhai", "yaar", "reality check", "chalo dekhte hain").
- CRITICAL: Do NOT use low-quality street slang like "locha", "laphda", "jhol" or offensive language. Keep it polite, clean, but informal.
- Keep it extremely short (voiceover MUST be under 30-35 words, so it takes exactly 9-10 seconds to read).
- Clearly mention the manifesto year (${reelPromise.source_manifesto_year}) and the sequential Reel Number: ${reelNumber}.
- Mention the specific data source/evidence (e.g. "Supreme Court judgment", "Ministry report", "Official data") for the audit.
- If the status is 'In Progress' or 'Partially Fulfilled', briefly state what is left and future plans.

Slide formatting rules (to prevent text overlap/truncation):
- Keep slide1, slide2, and slide3 extremely short (MAX 5-6 words per slide!).
- slide1 MUST be a short translation of the promise topic in Hindi.
- slide2 MUST state the status and source in Hindi.
- slide3 MUST state progress or future plans in Hindi.

Output STRICT JSON ONLY (no markdown, no extra text):
{
    "voiceover": "Casual Delhi Hinglish voiceover script...",
    "slide1": "Short Hindi title (max 5-6 words)...",
    "slide2": "Short Hindi status/evidence (max 6-8 words)...",
    "slide3": "Short Hindi source & progress info (max 6-8 words)..."
}`
                            }
                        ],
                        response_format: { type: 'json_object' },
                        max_tokens: 400,
                        temperature: 0.8,
                    }),
                });

                if (res.ok) {
                    const data: any = await res.json();
                    const content = data.choices?.[0]?.message?.content?.trim();
                    if (content) {
                        const parsed = JSON.parse(content);
                        voiceoverText = parsed.voiceover || voiceoverText;
                        slide1 = parsed.slide1 || slide1;
                        slide2 = parsed.slide2 || slide2;
                        slide3 = parsed.slide3 || slide3;
                        console.log(`[Pipeline] Successfully generated Delhi Teen Hinglish Script!`);
                        console.log(`[Pipeline] Voiceover: "${voiceoverText}"`);
                        console.log(`[Pipeline] Slide 1: "${slide1}"`);
                        console.log(`[Pipeline] Slide 2: "${slide2}"`);
                        console.log(`[Pipeline] Slide 3: "${slide3}"`);
                    }
                } else {
                    console.warn(`[Pipeline] OpenAI API returned status ${res.status}. Using fallback.`);
                }
            } catch (err: any) {
                console.warn(`[Pipeline] OpenAI script generation failed: ${err.message}. Using Hinglish fallback.`);
            }
        }

        // ── Step 4: Generate Audio via ElevenLabs ────────────────
        console.log('\n🎤 Step 4: Generating ElevenLabs audio...');
        let audioBuffer: Buffer;
        try {
            audioBuffer = await generateAudio(voiceoverText);
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
        process.env.SLIDE_1 = slide1;
        process.env.SLIDE_2 = slide2;
        process.env.SLIDE_3 = slide3;
        process.env.REEL_NUM = String(reelNumber);
        process.env.MANIFESTO_YEAR = String(reelPromise.source_manifesto_year);

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
