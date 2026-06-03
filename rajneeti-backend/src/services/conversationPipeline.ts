import { generateAudio } from "./elevenLabsService.js";
import { generateHeadlessVideo } from "./puppeteerVideoGenerator.js";
import { SocialUploadService } from "./socialUploadService.js";
import { SupabaseStorageService } from "./supabaseStorage.js";
import { createClient } from '@supabase/supabase-js';
import { OPENAI_API_KEY } from "../config.js";
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const createSlug = (text: string): string => {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

// Anchor voice rotation mapping
const REPORTERS = [
    { name: 'Kanika', voiceId: 'y2H4TwIU5I2L0JXOdBeX' },
    { name: 'Amit Gupta', voiceId: 'ltvR0942IpmQjl5QbXL1' },
    { name: 'Sia', voiceId: 'YJpPt0sBEgMzYwcMkF5o' },
    { name: 'Mitali', voiceId: 'onQAwbsky3pmzMu2uapN' }
];
const MODI_VOICE_ID = process.env.ELEVENLABS_MODI_VOICE_ID || 'TM3DRXe9gqZUKdw8qnXA';

/**
 * AI completion call to generate the dialogue script using OpenAI gpt-5.4
 */
async function generateDialogueScript(newsEvent: any): Promise<any> {
    const apiKey = OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || '';

    const prompt = `
You are an AI political analyst writing a daily PM Open Press Conference script for Rajneeti TV Network.
Based on the following news event about India, generate a professional, fact-based Q&A dialogue script:

NEWS DATE: ${newsEvent.news_date}
TITLE: ${newsEvent.ticker_headline || newsEvent.blog_title || 'Latest Briefing'}
SUMMARY: ${newsEvent.blog_content || 'No details provided'}
STATE: ${newsEvent.state || 'National'}

TOPICS & ISSUES DIRECTIVE:
If the news relates or can be linked to any major national crises, prioritize auditing top-level front-page issues such as:
- NEET/CBSE paper leaks and exam grading controversies.
- High inflation, consumer price index hikes, or household budget impacts.
- Stock market bloodbaths, net FDI/FPI outflows, and foreign portfolio investors pulling out capital.
- National infrastructure projects and employment.

TASK:
1. Formulate a short, punchy title (max 5 words) for this press conference briefing in English.
2. Write a sharp, accountable question in Hindi (with common Hinglish vocabulary) that a news journalist/reporter would ask PM Narendra Modi at the press conference. Focus directly on the national problem and demand accountability.
3. Write a professional, factual, data-backed answer in Hindi (with common Hinglish vocabulary) by PM Narendra Modi. Make it sound exactly like Modi's speech style (speaking in the first person plural 'hum', referencing national growth and cooperative efforts). Keep it concise (3-4 sentences maximum so it fits vertical reel timing).
4. Write a 1-2 sentence background context summarizing the audited facts or statistics used.

CRITICAL DATA CONSTRAINT:
The PM's reply must be strictly backed by genuine and authentic data, referring to official budgets, ministry reports, verified dates, or actual legislative acts. DO NOT make up statistics or figures. Highlight official resource allocations or policy audits objectively.

OUTPUT FORMAT (Respond with STRICT JSON ONLY, no extra text, no markdown fences):
{
   "title": "Short English Title",
   "question": "Hindi question from reporter...",
   "answer": "Hindi answer from PM Modi...",
   "news_context": "Brief factual background context in Hindi..."
}
`.trim();


    let rawContent = "";

    if (apiKey) {
        console.log(`[Conversational Pipeline] Querying OpenAI gpt-5.4 for dialogue script...`);
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-5.4",
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs strict JSON only." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 1000,
                temperature: 0.3,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        rawContent = data.choices?.[0]?.message?.content?.trim() || "";
    } else if (geminiKey) {
        console.log(`[Conversational Pipeline] OPENAI_API_KEY not found. Querying Gemini (gemini-2.5-flash) as fallback...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                }
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        console.log("[Conversational Pipeline] Gemini response data structure:", JSON.stringify(data, null, 2));
        rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
        throw new Error("Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured on the backend.");
    }

    // Strip potential markdown blocks
    const cleaned = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (parseError: any) {
        console.error("[Conversational Pipeline] JSON Parse Error: ", parseError.message);
        console.error("[Conversational Pipeline] Raw AI Response was:\n", rawContent);
        throw parseError;
    }
}

/**
 * Runs the automated conversational reels & PM Daily Interview pipeline.
 */
export async function runConversationalReelPipeline() {
    if (!supabase) {
        console.error("[Conversational Pipeline] Supabase client not initialized.");
        return;
    }

    console.log('\n=== STARTING AUTOMATED CONVERSATIONAL REEL PIPELINE ===');

    try {
        // 1. Fetch news events that haven't had a PM Interview created yet
        console.log('\n📋 Step 1: Querying news events...');
        const { data: interviews, error: intError } = await (supabase as any)
            .from('pm_interviews')
            .select('news_date');

        if (intError) {
            throw new Error(`Failed to query interviews: ${intError.message}`);
        }

        const usedDates = interviews?.map((i: any) => i.news_date) || [];
        console.log(`[Conversational Pipeline] Found ${usedDates.length} news dates with existing interviews.`);

        let query = (supabase as any)
            .from('news_events')
            .select('*')
            .order('news_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (usedDates.length > 0) {
            query = query.not('news_date', 'in', `(${usedDates.map((d: any) => `"${d}"`).join(',')})`);
        }

        const { data: newsEvents, error: newsError } = await query.limit(1);

        if (newsError) {
            throw new Error(`Failed to query news events: ${newsError.message}`);
        }

        let newsEvent = newsEvents?.[0];
        if (!newsEvent) {
            console.log('[Conversational Pipeline] No fresh daily news events found. Falling back to latest news event overall.');
            const { data: allNews } = await (supabase as any)
                .from('news_events')
                .select('*')
                .order('news_date', { ascending: false })
                .limit(1);
            
            newsEvent = allNews?.[0];
        }

        if (!newsEvent) {
            console.log('[Conversational Pipeline] No news events found in database. Cannot run pipeline.');
            return;
        }

        console.log(`[Conversational Pipeline] Selected news event: "${newsEvent.ticker_headline}" (${newsEvent.news_date})`);

        // 2. Generate Dialogue Script using AI
        console.log('\n📝 Step 2: Generating Q&A dialogue script...');
        const script = await generateDialogueScript(newsEvent);
        console.log(`[Conversational Pipeline] Script generated successfully.`);
        console.log(`   Title: "${script.title}"`);
        console.log(`   Q: "${script.question.slice(0, 40)}..."`);
        console.log(`   A: "${script.answer.slice(0, 40)}..."`);

        // 3. Select reporter and voice parameters
        const { count } = await (supabase as any)
            .from('pm_interviews')
            .select('*', { count: 'exact', head: true });
        
        const rotationIndex = (count || 0) % REPORTERS.length;
        const selectedReporter = REPORTERS[rotationIndex];
        console.log(`[Conversational Pipeline] Rotated Reporter: ${selectedReporter.name} (Voice ID: ${selectedReporter.voiceId})`);

        // 4. Create temp directory first
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-'));
        const reporterPath = path.join(tmpDir, 'reporter.mp3');
        const modiPath = path.join(tmpDir, 'modi.mp3');
        const stitchedPath = path.join(tmpDir, 'stitched.mp3');

        // 4. Generate audios from ElevenLabs
        console.log('\n🎙️ Step 4: Synthesizing reporter and Modi audios...');
        let reporterAudioBuffer: Buffer;
        let reporterDuration = 5.0;
        try {
            reporterAudioBuffer = await generateAudio(script.question, selectedReporter.voiceId);
            fs.writeFileSync(reporterPath, reporterAudioBuffer);
            reporterDuration = parseFloat(
                execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${reporterPath}"`)
                    .toString()
                    .trim()
            );
        } catch (err: any) {
            console.warn(`[Conversational Pipeline] ElevenLabs failed for Reporter. Generating silent fallback audio: ${err.message}`);
            execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -q:a 9 "${reporterPath}"`, { stdio: 'ignore' });
            reporterAudioBuffer = fs.readFileSync(reporterPath);
            reporterDuration = 5.0;
        }

        let modiAudioBuffer: Buffer;
        let modiDuration = 10.0;
        try {
            modiAudioBuffer = await generateAudio(script.answer, MODI_VOICE_ID);
            fs.writeFileSync(modiPath, modiAudioBuffer);
            modiDuration = parseFloat(
                execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${modiPath}"`)
                    .toString()
                    .trim()
            );
        } catch (err: any) {
            console.warn(`[Conversational Pipeline] ElevenLabs failed for Modi. Generating silent fallback audio: ${err.message}`);
            execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -q:a 9 "${modiPath}"`, { stdio: 'ignore' });
            modiAudioBuffer = fs.readFileSync(modiPath);
            modiDuration = 10.0;
        }

        // 5. Stitch audios and measure durations using ffmpeg
        console.log('\n🎛️ Step 5: Stitching audio tracks and calculating timeline...');
        console.log(`[Conversational Pipeline] Speaker durations: Reporter=${reporterDuration.toFixed(2)}s, Modi=${modiDuration.toFixed(2)}s`);

        // Stitch together using an audio filter
        execSync(`ffmpeg -y -i "${reporterPath}" -i "${modiPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" "${stitchedPath}"`, { stdio: 'pipe' });
        const stitchedAudioBuffer = fs.readFileSync(stitchedPath);
        console.log(`[Conversational Pipeline] Combined audio generated successfully (${stitchedAudioBuffer.length} bytes)`);

        // 6. Save transcript/data to pm_interviews table
        console.log('\n✏️ Step 6: Upserting PM Interview transcript to Supabase...');
        const interviewPayload = {
            title: script.title,
            news_date: newsEvent.news_date,
            reporter_name: selectedReporter.name,
            reporter_voice_id: selectedReporter.voiceId,
            question: script.question,
            answer: script.answer,
            news_context: script.news_context,
            source_url: newsEvent.original_url || 'https://moitrastudios.com'
        };

        let interviewId = newsEvent.id || 'mock-test-id';
        const targetSlug = createSlug(script.title) || 'pm-briefing';

        try {
            const { data: insertedInterview, error: insertError } = await (supabase as any)
                .from('pm_interviews')
                .upsert(interviewPayload, { onConflict: 'news_date' })
                .select()
                .single();

            if (insertError) {
                console.warn(`[Conversational Pipeline] ⚠️ Failed to save PM interview to Supabase (RLS policy block): ${insertError.message}`);
                console.warn(`[Conversational Pipeline] This is expected if running locally with an Anon/Publishable key. Continuing video generation...`);
            } else if (insertedInterview) {
                interviewId = insertedInterview.id;
                console.log(`[Conversational Pipeline] Saved to database with ID: ${interviewId}`);
            }
        } catch (dbErr: any) {
            console.warn(`[Conversational Pipeline] ⚠️ Database write failed: ${dbErr.message}. Continuing video generation...`);
        }

        // 7. Render Video via Puppeteer
        console.log('\n🎥 Step 7: Capturing video from Headless Browser...');
        process.env.NEWS_TITLE = script.title;
        process.env.NEWS_SUMMARY = script.news_context;
        
        // Pass empty array since HeadlessReelGenerator resolves reporter/Modi/parliament visuals internally
        const videoBuffer = await generateHeadlessVideo(
            interviewId, 
            stitchedAudioBuffer, 
            [], 
            reporterDuration, 
            modiDuration
        );

        // 8. Upload to Supabase Storage
        console.log('\n☁️ Step 8: Uploading MP4 to Supabase Storage...');
        const fileName = `pm-interview-${targetSlug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (!publicUrl) {
            throw new Error('Supabase Storage video upload failed.');
        }
        console.log(`[Conversational Pipeline] Video stored at: ${publicUrl}`);

        // 9. Publish to Social Media
        console.log('\n📱 Step 9: Publishing to social platforms...');
        
        // Captain layouts
        const igCaption = `PM Daily accountability: ${script.title} 🎤\n\nReporter ${selectedReporter.name} questions PM Narendra Modi about the latest developments.\n\nWatch full briefings and audits on our hub!\n\n#IndianPolitics #PMModi #FactCheck #NewsIndia #MoitraStudios #Rajneeti`;
        const ytTitle = `PM Modi Interview: ${script.title.slice(0, 50)} #Shorts #News`;
        const ytDescription = `Daily direct interview briefing with Prime Minister Narendra Modi. Reporter ${selectedReporter.name} audits latest national developments. Factual responses verified against official records.`;
        const ytTags = ['PM Modi', 'Narendra Modi', 'Indian Politics', 'News', 'Fact Check', 'Rajneeti', 'Moitra Studios'];

        const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, igCaption);
        if (!igSuccess) console.warn('[Conversational Pipeline] Instagram upload failed, continuing...');

        const fbSuccess = await SocialUploadService.uploadToFacebook(publicUrl, igCaption);
        if (!fbSuccess) console.warn('[Conversational Pipeline] Facebook upload failed, continuing...');

        const ytSuccess = await SocialUploadService.uploadToYouTube(videoBuffer, ytTitle, ytDescription, ytTags);
        if (!ytSuccess) console.warn('[Conversational Pipeline] YouTube Shorts upload failed.');

        // Cleanup temp files
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        console.log('\n=== CONVERSATIONAL REEL PIPELINE COMPLETED SUCCESSFULLY ===');
        console.log(`   Briefing: "${script.title}"`);
        console.log(`   Date: ${newsEvent.news_date}`);
        console.log(`   Social posts: IG=${igSuccess} FB=${fbSuccess} YT=${ytSuccess}`);

    } catch (err: any) {
        console.error('\n=== CONVERSATIONAL REEL PIPELINE FAILED ===', err.message || err);
        throw err;
    }
}

/**
 * Compiles a video reel for an existing PM Interview ID.
 * Generates ElevenLabs audio, renders video via Puppeteer, uploads to Storage,
 * and updates the pm_interviews record with the video URL.
 */
export async function generateReelForInterviewId(interviewId: string): Promise<string> {
    if (!supabase) {
        throw new Error("Supabase client not initialized.");
    }

    console.log(`[Conversational Pipeline] Starting manual compilation for interview ID: ${interviewId}`);

    // 1. Fetch interview from database
    const { data: interview, error: fetchErr } = await (supabase as any)
        .from('pm_interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (fetchErr || !interview) {
        throw new Error(`Interview not found in database: ${fetchErr?.message || 'Empty result'}`);
    }

    console.log(`[Conversational Pipeline] Loaded interview: "${interview.title}"`);

    // 2. Select reporter voice (or fallback)
    const reporterVoiceId = interview.reporter_voice_id || REPORTERS[0].voiceId;
    const MODI_VOICE_ID = process.env.ELEVENLABS_MODI_VOICE_ID || 'TM3DRXe9gqZUKdw8qnXA';

    // 3. Create temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-manual-'));
    const reporterPath = path.join(tmpDir, 'reporter.mp3');
    const modiPath = path.join(tmpDir, 'modi.mp3');
    const stitchedPath = path.join(tmpDir, 'stitched.mp3');

    try {
        // 4. Generate audio via ElevenLabs
        console.log(`[Conversational Pipeline] Synthesizing audio for Q&A...`);
        let reporterAudioBuffer: Buffer;
        let reporterDuration = 5.0;
        try {
            reporterAudioBuffer = await generateAudio(interview.question, reporterVoiceId);
            fs.writeFileSync(reporterPath, reporterAudioBuffer);
            reporterDuration = parseFloat(
                execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${reporterPath}"`)
                    .toString()
                    .trim()
            );
        } catch (err: any) {
            console.warn(`[Conversational Pipeline] ElevenLabs failed for Reporter. Using fallback silence: ${err.message}`);
            execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -q:a 9 "${reporterPath}"`, { stdio: 'ignore' });
            reporterAudioBuffer = fs.readFileSync(reporterPath);
            reporterDuration = 5.0;
        }

        let modiAudioBuffer: Buffer;
        let modiDuration = 10.0;
        try {
            modiAudioBuffer = await generateAudio(interview.answer, MODI_VOICE_ID);
            fs.writeFileSync(modiPath, modiAudioBuffer);
            modiDuration = parseFloat(
                execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${modiPath}"`)
                    .toString()
                    .trim()
            );
        } catch (err: any) {
            console.warn(`[Conversational Pipeline] ElevenLabs failed for PM Modi. Using fallback silence: ${err.message}`);
            execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -q:a 9 "${modiPath}"`, { stdio: 'ignore' });
            modiAudioBuffer = fs.readFileSync(modiPath);
            modiDuration = 10.0;
        }

        // 5. Stitch audios
        console.log(`[Conversational Pipeline] Stitching audios (Reporter: ${reporterDuration.toFixed(2)}s, Modi: ${modiDuration.toFixed(2)}s)...`);
        execSync(`ffmpeg -y -i "${reporterPath}" -i "${modiPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" "${stitchedPath}"`, { stdio: 'pipe' });
        const stitchedAudioBuffer = fs.readFileSync(stitchedPath);

        // 6. Generate Video via Puppeteer
        console.log(`[Conversational Pipeline] Rendering vertical video via Puppeteer...`);
        process.env.NEWS_TITLE = interview.title;
        process.env.NEWS_SUMMARY = interview.news_context;

        const videoBuffer = await generateHeadlessVideo(
            interviewId,
            stitchedAudioBuffer,
            [],
            reporterDuration,
            modiDuration
        );

        // 7. Upload to Supabase Storage
        console.log(`[Conversational Pipeline] Uploading reel to Storage...`);
        const targetSlug = createSlug(interview.title) || 'pm-press-conf';
        const fileName = `pm-press-conf-${targetSlug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (!publicUrl) {
            throw new Error("Failed to upload manual compilation to Storage.");
        }

        // 8. Update database with video URL
        console.log(`[Conversational Pipeline] Updating pm_interviews record with video URL: ${publicUrl}`);
        const { error: updateErr } = await (supabase as any)
            .from('pm_interviews')
            .update({ video_url: publicUrl })
            .eq('id', interviewId);

        if (updateErr) {
            console.warn(`[Conversational Pipeline] Failed to update database record: ${updateErr.message}. Returning public url anyway.`);
        }

        console.log(`[Conversational Pipeline] Manual reel compiled successfully: ${publicUrl}`);
        return publicUrl;

    } finally {
        // Cleanup temp files
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
}

