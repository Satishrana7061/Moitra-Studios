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

// ── Hindi numeral normalization map for TTS ─────────────────────
const HINDI_NUMERAL_MAP: Record<string, string> = {
    '2014': 'do hazaar chaudah',
    '2019': 'do hazaar unnees',
    '2024': 'do hazaar chaubis',
    '2025': 'do hazaar pachees',
    '2026': 'do hazaar chhabbees',
    '1': 'ek',
    '2': 'do',
    '3': 'teen',
    '4': 'chaar',
    '5': 'paanch',
    '6': 'chheh',
    '7': 'saat',
    '8': 'aath',
    '9': 'nau',
    '10': 'das',
    '100': 'sau',
};

/**
 * Normalizes bare numerals in text to Hindi spoken words for TTS.
 * Converts years (2014, 2019, 2024) and common numbers to their
 * Hindi spoken equivalents so ElevenLabs pronounces them correctly.
 */
function normalizeNumeralsForTTS(text: string): string {
    let normalized = text;

    // Replace years first (longer patterns before shorter ones)
    const yearKeys = Object.keys(HINDI_NUMERAL_MAP)
        .filter(k => k.length === 4)
        .sort((a, b) => b.length - a.length);

    for (const year of yearKeys) {
        // Use word boundary regex to only replace standalone numbers
        const regex = new RegExp(`\\b${year}\\b`, 'g');
        normalized = normalized.replace(regex, HINDI_NUMERAL_MAP[year]);
    }

    return normalized;
}

/**
 * Builds hashtags for Instagram based on content.
 * Always includes: #IndianPolitics #FactCheckIndia #godimedia #MoitraStudios
 * Conditional: #NarendraModi (if Modi), #elections/#ElectionPromises (if manifesto)
 * Plus one broad: #news or #IndiaNews
 */
function buildInstagramHashtags(promise: {
    title: string;
    source_manifesto_year: number;
    status: string;
}, reelNumber: number): string {
    // Always-include base tags
    const tags = ['#IndianPolitics', '#FactCheckIndia', '#godimedia', '#MoitraStudios'];

    // If reel mentions Modi
    const titleLower = promise.title.toLowerCase();
    if (titleLower.includes('modi') || titleLower.includes('narendra')) {
        tags.push('#NarendraModi');
    }

    // If about elections/manifesto/promises
    if (reelNumber % 2 === 0) {
        tags.push('#ElectionPromises');
    } else {
        tags.push('#elections');
    }

    // Alternate broad news tags
    if (reelNumber % 3 === 0) {
        tags.push('#IndiaNews');
    } else {
        tags.push('#news');
    }

    return tags.join(' ');
}

/**
 * Builds hashtags for YouTube Shorts.
 * Always starts with #Shorts, then political + broad tags.
 */
function buildYouTubeHashtags(promise: {
    title: string;
    source_manifesto_year: number;
    status: string;
}, reelNumber: number): { descriptionTags: string; metaTags: string[] } {
    const baseTags = ['#Shorts', '#IndianPolitics'];
    const metaTags = ['shorts', 'IndianPolitics', 'FactCheckIndia', 'godimedia', 'MoitraStudios'];

    const titleLower = promise.title.toLowerCase();
    if (titleLower.includes('modi') || titleLower.includes('narendra')) {
        baseTags.push('#NarendraModi', '#FactCheckIndia');
        metaTags.push('NarendraModi');
    } else {
        baseTags.push('#FactCheckIndia');
    }

    // Alternate broad tags
    if (reelNumber % 2 === 0) {
        baseTags.push('#news', '#godimedia');
        metaTags.push('news');
    } else {
        baseTags.push('#IndiaNews', '#godimedia');
        metaTags.push('IndiaNews', 'elections');
    }

    // Add promise-specific tags
    if (promise.source_manifesto_year) {
        metaTags.push(`manifesto${promise.source_manifesto_year}`);
    }

    return {
        descriptionTags: baseTags.join(' '),
        metaTags: [...new Set(metaTags)],
    };
}

/**
 * Builds the YouTube title in the specified format:
 * "Promise No. X | Leader Year Manifesto | Topic | Verdict: Status"
 */
function buildYouTubeTitle(promise: {
    title: string;
    source_manifesto_year: number;
    status: string;
}, reelNumber: number): string {
    // Extract a short topic from the title (first 40 chars)
    const topic = promise.title.length > 40
        ? promise.title.slice(0, 40).trim()
        : promise.title;

    const title = `Promise No. ${reelNumber} | Narendra Modi ${promise.source_manifesto_year} Manifesto | ${topic} | Verdict: ${promise.status}`;

    // YouTube title max is 100 chars
    return title.slice(0, 100);
}

/**
 * Builds the YouTube description in bilingual format.
 */
function buildYouTubeDescription(promise: {
    title: string;
    description: string;
    source_manifesto_year: number;
    status: string;
    verdict_summary: string;
}, reelNumber: number): string {
    const ytHashtags = buildYouTubeHashtags(promise, reelNumber);

    return [
        `Promise No. ${reelNumber} from Narendra Modi's ${promise.source_manifesto_year} manifesto: "${promise.title}".`,
        ``,
        `Is reel mein hum dekhte hain ki is vaade par kitna actual kaam hua.`,
        `Verdict: ${promise.status}`,
        ``,
        promise.verdict_summary,
        ``,
        `—`,
        `📺 MOITRA STUDIOS`,
        `Non-Partisan Political Accountability Tracker`,
        `🌐 https://moitrastudios.com/prime-ministers-promises`,
        ``,
        ytHashtags.descriptionTags,
    ].join('\n');
}

/**
 * Builds the Instagram caption in bilingual format with hashtags.
 */
function buildInstagramCaption(promise: {
    title: string;
    description: string;
    source_manifesto_year: number;
    status: string;
    verdict_summary: string;
}, reelNumber: number): string {
    const igHashtags = buildInstagramHashtags(promise, reelNumber);

    return [
        `Promise No. ${reelNumber} | Narendra Modi ${promise.source_manifesto_year} Manifesto`,
        ``,
        `${promise.title}`,
        ``,
        `Is reel mein hum dekhte hain ki is vaade par kitna actual kaam hua.`,
        `Verdict: ${promise.status}`,
        ``,
        `📺 Moitra Studios | Rajneeti`,
        `🌐 moitrastudios.com`,
        ``,
        igHashtags,
    ].join('\n');
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

        // Pre-compute spoken year for TTS normalization
        const yearSpokenHi = HINDI_NUMERAL_MAP[String(reelPromise.source_manifesto_year)] || String(reelPromise.source_manifesto_year);

        // ── Step 3: Generate young-explainer Hinglish script ─────────
        console.log('\n📝 Step 3: Building young-explainer Hinglish script with TTS normalization...');
        
        // Fallback script using the new format
        let voiceoverText = `Aaj ki is video mein hum baat karenge Narendra Modi ke ${yearSpokenHi} manifesto ke Promise number ${reelNumber} ki. Vaada tha: ${reelPromise.title}. Lekin sawaal yeh hai, kya yeh vaada sach mein poora hua? Hamare analysis ke mutaabik, verdict hai: ${reelPromise.status}. Sach aur nishpaksh analysis ke liye Moitra Studios ko follow karein.`;
        let slide1 = `${reelPromise.title.slice(0, 35)}`;
        let slide2 = `Verdict: ${reelPromise.status}`;
        let slide3 = `Source: Verified Evidence`;

        if (OPENAI_API_KEY) {
            try {
                console.log('[Pipeline] Querying OpenAI for young-explainer Hinglish script...');
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
                                content: `You are writing a short-form political explainer reel script for the brand "Rajneeti" by Moitra Studios.

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

CRITICAL TTS RULES FOR NUMBERS:
All years and large numbers MUST be written as Hindi spoken words, NOT as digits.
This is because the text will be sent to a Hindi TTS engine that cannot pronounce bare numerals correctly.
- "2014" must be written as "do hazaar chaudah"
- "2019" must be written as "do hazaar unnees"  
- "2024" must be written as "do hazaar chaubis"
- "2025" must be written as "do hazaar pachees"
- "2026" must be written as "do hazaar chhabbees"
- Never write bare years like "2014", "2019" etc. in the voiceover field.
- Promise numbers should be spoken naturally: "Promise number ${reelNumber}"

MANDATORY SCRIPT FORMAT:
Follow this exact opening/closing pattern:

Opening line format: "Aaj ki is video mein hum baat karenge [Leader Name] ke [year in Hindi words] manifesto ke Promise number [N] ki, jahan [what was promised]."
Second line format: "Lekin sawaal yeh hai — kya yeh vaada sach mein poora hua, ya sirf aadha?"
Then: Explain what happened with specific facts and sources.
Then: Give the verdict clearly.
Closing: "Aise hi aur promise audits ke liye Moitra Studios ko follow karein."

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
- ALL YEARS MUST BE IN HINDI WORDS, NOT DIGITS.

Tone constraints:
- Do NOT sound like a news channel anchor.
- Do NOT sound like a press release.
- Do NOT sound like a YouTube guru.
- Do NOT use heavy ideological or partisan wording.
- Do NOT exaggerate.
- Do NOT use dramatic emotional manipulation.
- Do NOT use repeated filler words like "bilkul", "dosto" in every line, "aaiye jaante hain", "authentic sources", "transparent analysis", "non-partisan accountability".
- Do NOT over-explain the research process.
- Do NOT say "we will use authentic sources" again and again.
- Do NOT use textbook Hindi.
- Do NOT use cringe Gen Z slang.
- Do NOT use too many English corporate words.
- Do NOT write anything that feels copied from AI marketing language.
- Do NOT say "yo guys" or "backword".

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
Line 1: Hook — opening line using the format above with the promise number.
Line 2: Challenge question — "Lekin sawaal yeh hai..."
Line 3-4: What actually happened / evidence with named sources.
Line 5: Simple verdict conclusion.
Line 6: CTA — follow Moitra Studios.

If the status is unclear:
Use phrases like:
- "picture thodi mixed hai"
- "record dekhkar lagta hai…"
- "official level par claim alag hai, lekin ground update mixed dikhta hai"
- "available records ke basis par…"

If the promise seems completed:
Say it in a calm and specific way, not celebratory.

If the promise seems unfulfilled or partial:
Say it in a neutral and evidence-based way, not angry or sarcastic.

Output STRICT JSON ONLY (no markdown, no extra text):
{
    "voiceover": "Final Hinglish voiceover script (around 75-85 words, maximum 30 seconds, ALL YEARS IN HINDI WORDS not digits)...",
    "year_spoken_hi": "The year written in Hindi spoken words (e.g. do hazaar chaudah)",
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
- Year in Hindi: "${yearSpokenHi}"
- Leader: Narendra Modi
- Latest verified status: "${reelPromise.status}"
- Verified facts / Evidence details: "${reelPromise.verdict_summary}"
- Source list / details: "${reelPromise.fulfilled_details || ''} ${reelPromise.unfulfilled_details || ''}"

IMPORTANT: Write ALL years as Hindi spoken words (${reelPromise.source_manifesto_year} = "${yearSpokenHi}"). Do NOT use any bare numerals for years in the voiceover.

Write the script of 24 to 32 seconds (max 30 seconds, Voiceover must be under 30 seconds when spoken naturally, which is around 75 to 85 words).
Make sure to only mention facts from the verified data, explicitly naming the legitimate news media or government sources. Output ONLY the JSON with fields: voiceover, year_spoken_hi, slide1, slide2, slide3.`
                            }
                        ],
                        response_format: { type: 'json_object' },
                        max_completion_tokens: 600,
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
                        console.log(`[Pipeline] Successfully generated young-explainer script!`);
                        console.log(`[Pipeline] Voiceover: "${voiceoverText}"`);
                        console.log(`[Pipeline] Slide 1: "${slide1}"`);
                        console.log(`[Pipeline] Slide 2: "${slide2}"`);
                        console.log(`[Pipeline] Slide 3: "${slide3}"`);
                    }
                } else {
                    console.warn(`[Pipeline] OpenAI API returned status ${res.status}. Using fallback.`);
                }
            } catch (err: any) {
                console.warn(`[Pipeline] OpenAI script generation failed: ${err.message}. Using fallback.`);
            }
        }

        // ── Step 3.5: Normalize numerals in voiceover for TTS ────
        console.log('\n🔤 Step 3.5: Normalizing numerals for TTS...');
        const originalVoiceover = voiceoverText;
        voiceoverText = normalizeNumeralsForTTS(voiceoverText);
        if (originalVoiceover !== voiceoverText) {
            console.log(`[Pipeline] TTS normalization applied. Numerals converted to Hindi words.`);
            console.log(`[Pipeline] Final TTS text: "${voiceoverText}"`);
        } else {
            console.log(`[Pipeline] No bare numerals found — TTS text is clean.`);
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

        // Build platform-specific captions, titles, descriptions, and tags
        const igCaption = buildInstagramCaption(reelPromise, reelNumber);
        const ytTitle = buildYouTubeTitle(reelPromise, reelNumber);
        const ytDescription = buildYouTubeDescription(reelPromise, reelNumber);
        const ytHashtags = buildYouTubeHashtags(reelPromise, reelNumber);

        // Facebook uses the same caption as Instagram
        const fbCaption = igCaption;

        console.log(`[Pipeline] YT Title: "${ytTitle}"`);
        console.log(`[Pipeline] IG Hashtags: "${buildInstagramHashtags(reelPromise, reelNumber)}"`);
        console.log(`[Pipeline] YT Tags: [${ytHashtags.metaTags.join(', ')}]`);

        // Instagram
        const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, igCaption);
        if (!igSuccess) console.warn('[Pipeline] Instagram upload failed, but continuing...');

        // Facebook
        const fbSuccess = await SocialUploadService.uploadToFacebook(publicUrl, fbCaption);
        if (!fbSuccess) console.warn('[Pipeline] Facebook upload failed, but continuing...');

        // YouTube
        const ytSuccess = await SocialUploadService.uploadToYouTube(videoBuffer, ytTitle, ytDescription, ytHashtags.metaTags);
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
        console.log(`   Reel #: ${reelNumber}`);
        console.log(`   Platforms: IG=${igSuccess} FB=${fbSuccess} YT=${ytSuccess}`);

    } catch (err: any) {
        console.error('\n=== AUTOMATED REEL PIPELINE FAILED ===', err.message || err);
        throw err;
    }
}
