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
        let reelPromise;
        const manualSlug = process.env.NEWS_SLUG;
        if (manualSlug) {
            console.log(`[Pipeline] Manual override detected for slug: ${manualSlug}`);
            if (supabase) {
                const { data, error } = await (supabase as any)
                    .from('manifesto_promises')
                    .select('*')
                    .eq('slug', manualSlug)
                    .single();
                if (error || !data) {
                    throw new Error(`Failed to find promise for manual override slug: ${manualSlug}`);
                }
                reelPromise = data;
            } else {
                throw new Error(`Supabase client not initialized for manual override slug: ${manualSlug}`);
            }
        } else {
            reelPromise = verifiedPromise; // Use the freshly verified promise from Step 1
        }

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
                console.log('[Pipeline] Querying OpenAI for casual Delhi Teen Hinglish script & fuller Hindi slides...');
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-5.4',
                        messages: [
                            { 
                                role: 'system', 
                                content: `You are writing a short-form political explainer reel script for the brand "Rajneeti".

Your job:
Write a highly natural, professional, fact-based Hindi/Hinglish reel script for YouTube Shorts and Facebook Reels about one specific political promise and its current status.

Core identity of the voice:
The script must sound like it was written by an intelligent 18-year-old Indian boy from a middle-class family who is deeply interested in politics and current affairs.
He is not a TV anchor.
He is not a comedian.
He is not a government spokesperson.
He is not a formal journalist.
He is a sharp, serious, relatable young creator who explains politics simply and honestly.

Voice style:
- Natural Hindi/Hinglish spoken by Indian youth.
- Clear, confident, grounded, simple.
- Respectful and serious, but never stiff.
- Slightly conversational, like talking to an audience on mobile video.
- Professional enough to build trust, but casual enough to feel human.
- Must never sound robotic, over-polished, or obviously AI-generated.

Audience:
Hindi-speaking Indian viewers, especially youth and middle-class audiences who want simple and trustworthy updates about political promises.

What you must do:
1. Understand the promise and latest verified status.
2. Write a reel script of 24 to 32 seconds (maximum 30 seconds).
3. Focus on one promise only.
4. Explain what was promised, what happened, and what the current status seems to be.
5. Use only the verified facts provided in the input (mention only legit resources/sources).
6. If the facts are mixed or incomplete, say so honestly.
7. Keep the language balanced and credible.
8. Make the script feel native to Shorts/Reels, not like an article or essay.

Mandatory writing rules:
- Start with a hook in the first line.
- The first 2 seconds must make the viewer curious.
- Use short spoken lines.
- Prefer simple sentences over long sentences.
- Use easy Hindi with natural English words where normal.
- Use around 75% Hindi and 25% English.
- Mention the promise clearly.
- Mention the current status clearly.
- Mention or hint at the source credibility naturally.
- End with a short follow/next-part CTA.
- Keep the full script concise and editable for voiceover.

Tone constraints:
- Do NOT sound like a news channel anchor.
- Do NOT sound like a press release.
- Do NOT sound like a YouTube guru.
- Do NOT use heavy ideological or partisan wording.
- Do NOT exaggerate.
- Do NOT use dramatic emotional manipulation.
- Do NOT use repeated filler words like “bilkul”, “dosto” in every line, “aaiye jaante hain”, “authentic sources”, “transparent analysis”, “non-partisan accountability”.
- Do NOT over-explain the research process.
- Do NOT say “we will use authentic sources” again and again.
- Do NOT use textbook Hindi.
- Do NOT use cringe Gen Z slang.
- Do NOT use too many English corporate words.
- Do NOT write anything that feels copied from AI marketing language.

Humanization rules:
Make it feel like a real teenager wrote it by:
- using direct, simple observations,
- keeping sentence length uneven,
- using natural spoken rhythm,
- sounding curious and honest,
- avoiding polished PR language,
- avoiding perfect symmetry in every sentence.

But still:
- stay grammatically clean,
- stay factually disciplined,
- stay mature and trustworthy.

Structure to follow:
Line 1: Hook MUST explicitly state the sequence of the promise being tracked (e.g., "Aaj hum track kar rahe hain manifesto ka promise number ${reelNumber}...").
Line 2: What was promised
Line 3: What actually happened / where things stand
Line 4: Name the EXACT verified sources (e.g., "According to The Hindu...", "Official government data shows...", "Independent platforms report...")
Line 5: Simple conclusion
Line 6: CTA for next reel or follow

If the status is unclear:
Use phrases like:
- “picture thodi mixed hai”
- “record dekhkar lagta hai…”
- “official level par claim alag hai, lekin ground update mixed dikhta hai”
- “available records ke basis par…”

If the promise seems completed:
Say it in a calm and specific way, not celebratory.

If the promise seems unfulfilled or partial:
Say it in a neutral and evidence-based way, not angry or sarcastic.

Output STRICT JSON ONLY (no markdown, no extra text):
{
    "voiceover": "Final Hinglish voiceover script (around 75-85 words, maximum 30 seconds, following all the rules)...",
    "slide1": "Fuller Hindi promise description sentence (6-10 words)...",
    "slide2": "Fuller Hindi status & source sentence (6-12 words)...",
    "slide3": "Fuller Hindi 2026 progress or budget sentence (6-12 words)..."
}` 
                             },
                             { 
                                 role: 'user', 
                                 content: `INPUT DATA:
- Promise Sequence Number: ${reelNumber}
- Promise title: "${reelPromise.title}"
- Year: ${reelPromise.source_manifesto_year}
- Latest verified status: "${reelPromise.status}"
- Verified facts / Evidence details: "${reelPromise.verdict_summary}"
- Source list / details: "${reelPromise.fulfilled_details || ''} ${reelPromise.unfulfilled_details || ''}"

Write the script of 24 to 32 seconds (max 30 seconds, Voiceover must be under 30 seconds when spoken naturally, which is around 75 to 85 words).
Make sure to only mention facts from the verified data, explicitly naming the legitimate news media or government sources. Output ONLY the JSON with fields: voiceover, slide1, slide2, slide3.`
                            }
                        ],
                        response_format: { type: 'json_object' },
                        max_tokens: 600,
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
