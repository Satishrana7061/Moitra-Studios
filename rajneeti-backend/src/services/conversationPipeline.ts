import { generateAudio } from "./elevenLabsService.js";
import { generateAudioWithTimestamps } from "./elevenLabsService.js";
import { generateSubtitleReel, estimateWordTimings } from "./ffmpegVideoGenerator.js";
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
 * AI completion call to generate the dialogue script using OpenAI/Gemini
 * Passes a list of news events and asks the AI to pick the most important national issue.
 */
async function generateDialogueScript(newsEvents: any[]): Promise<any> {
    const apiKey = OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || '';

    const prompt = `
You are an AI political analyst writing a daily PM Open Press Conference script for Rajneeti TV Network.
You are given a list of recent news events. Your FIRST task is to select the most important NATIONAL level problem (e.g., NEET/CBSE paper leaks, inflation, market crashes, national infrastructure) and ignore state-level or regional news.

NEWS EVENTS:
${newsEvents.map((e, idx) => `[${idx}] DATE: ${e.news_date} | TITLE: ${e.ticker_headline || e.blog_title} | STATE: ${e.state || 'National'} | SUMMARY: ${e.blog_content || 'N/A'}`).join('\n\n')}

TASK:
1. Select the index of the most critical national-level news event from the list above.
2. Formulate a short, punchy title (max 5 words) for this press conference briefing in English.
3. Write a 4-turn sarcastic, extremely brief, and sharp dialogue (conversation) between a news journalist/reporter and PM Narendra Modi:
   - Turn 1 (Reporter): A sharp, accountable question in Hindi (with common Hinglish vocabulary) demanding details on the selected national problem. (Keep it to exactly 1 short sentence, max 12-15 words).
   - Turn 2 (PM Modi): PM Modi's initial response in Hindi (with common Hinglish vocabulary), speaking in his characteristic style (using first person plural 'hum', referring to government efforts, etc.). (Keep it to exactly 1-2 short sentences, max 20-25 words).
   - Turn 3 (Reporter): A short, sharp, slightly sarcastic follow-up question or counter-argument in Hindi based on the PM's response. (Keep it to exactly 1 short sentence, max 10-12 words).
   - Turn 4 (PM Modi): PM Modi's second response in Hindi, addressing the follow-up question with a quick verified data point. (Keep it to exactly 1-2 short sentences, max 20-25 words).
   Ensure every sentence is extremely concise and short. Long sentences must be avoided. The total dialogue should be fast-paced and fit for a quick social media reel.
4. Write a 1-2 sentence background context summarizing the audited facts or statistics used in Hindi.

CRITICAL DATA CONSTRAINT:
PM Modi's replies must be strictly backed by genuine and authentic data, referring to official budgets, ministry reports, verified dates, or actual legislative acts. DO NOT make up statistics or figures. Highlight official resource allocations or policy audits objectively.

OUTPUT FORMAT (Respond with STRICT JSON ONLY, no extra text, no markdown fences):
{
   "selected_index": <number>,
   "title": "Short English Title",
   "reporter_q1": "Hindi first question from reporter...",
   "modi_a1": "Hindi first answer from PM Modi...",
   "reporter_q2": "Hindi short follow-up question from reporter...",
   "modi_a2": "Hindi second answer from PM Modi...",
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

        const { data: fetchedNews, error: newsError } = await query.limit(10);

        if (newsError) {
            throw new Error(`Failed to query news events: ${newsError.message}`);
        }

        let newsEvents = fetchedNews || [];
        if (newsEvents.length === 0) {
            console.log('[Conversational Pipeline] No fresh daily news events found. Falling back to latest news events overall.');
            const { data: allNews } = await (supabase as any)
                .from('news_events')
                .select('*')
                .order('news_date', { ascending: false })
                .limit(10);
            
            newsEvents = allNews || [];
        }

        if (newsEvents.length === 0) {
            console.log('[Conversational Pipeline] No news events found in database. Cannot run pipeline.');
            return;
        }

        // 2. Generate Dialogue Script using AI (AI will pick the most important national news event)
        console.log('\n📝 Step 2: Generating Q&A dialogue script and selecting top national issue...');
        const script = await generateDialogueScript(newsEvents);
        
        const selectedIndex = typeof script.selected_index === 'number' ? script.selected_index : 0;
        const newsEvent = newsEvents[selectedIndex] || newsEvents[0];
        
        console.log(`[Conversational Pipeline] AI Selected news event: "${newsEvent.ticker_headline}" (${newsEvent.news_date})`);
        console.log(`[Conversational Pipeline] Script generated successfully.`);
        console.log(`   Title: "${script.title}"`);

        const q1 = script.reporter_q1 || '';
        const a1 = script.modi_a1 || '';
        const q2 = script.reporter_q2 || '';
        const a2 = script.modi_a2 || '';

        const combinedQuestion = q2 ? `1. ${q1}\n\n2. ${q2}` : q1;
        const combinedAnswer = a2 ? `1. ${a1}\n\n2. ${a2}` : a1;

        console.log(`   Q1: "${q1.slice(0, 40)}..."`);
        console.log(`   A1: "${a1.slice(0, 40)}..."`);
        if (q2) {
            console.log(`   Q2: "${q2.slice(0, 40)}..."`);
            console.log(`   A2: "${a2.slice(0, 40)}..."`);
        }

        // 3. Select reporter and voice parameters
        const { count } = await (supabase as any)
            .from('pm_interviews')
            .select('*', { count: 'exact', head: true });
        
        const rotationIndex = (count || 0) % REPORTERS.length;
        const selectedReporter = REPORTERS[rotationIndex];
        console.log(`[Conversational Pipeline] Rotated Reporter: ${selectedReporter.name} (Voice ID: ${selectedReporter.voiceId})`);

        // 4. Create temp directory first
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-'));

        // Helper to synthesize a turn
        const synthesizeTurn = async (text: string, voiceId: string, filename: string, defaultDuration: number) => {
            const filePath = path.join(tmpDir, filename);
            let audioBuffer: Buffer;
            let wordTimings: { word: string; start: number; end: number }[];
            let duration = defaultDuration;
            
            try {
                const result = await generateAudioWithTimestamps(text, voiceId);
                audioBuffer = result.audioBuffer;
                wordTimings = result.wordTimings;
                fs.writeFileSync(filePath, audioBuffer);
                duration = parseFloat(
                    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`)
                        .toString()
                        .trim()
                );
            } catch (err: any) {
                console.warn(`[Conversational Pipeline] ElevenLabs failed for turn. Generating silent fallback audio: ${err.message}`);
                execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${defaultDuration} -q:a 9 "${filePath}"`, { stdio: 'ignore' });
                audioBuffer = fs.readFileSync(filePath);
                duration = defaultDuration;
                wordTimings = estimateWordTimings(text, duration);
            }
            return { text, audioBuffer, wordTimings, duration, filePath };
        };

        console.log('\n🎙️ Step 4: Synthesizing dialogue turn audios...');
        const turnsToGenerate = [
            { text: q1, voiceId: selectedReporter.voiceId, file: 'q1.mp3', dur: 5.0, speaker: 'reporter' as const },
            { text: a1, voiceId: MODI_VOICE_ID, file: 'a1.mp3', dur: 10.0, speaker: 'modi' as const }
        ];

        if (q2) {
            turnsToGenerate.push(
                { text: q2, voiceId: selectedReporter.voiceId, file: 'q2.mp3', dur: 4.0, speaker: 'reporter' as const },
                { text: a2, voiceId: MODI_VOICE_ID, file: 'a2.mp3', dur: 10.0, speaker: 'modi' as const }
            );
        }

        const generatedTurns = [];
        for (const t of turnsToGenerate) {
            const gen = await synthesizeTurn(t.text, t.voiceId, t.file, t.dur);
            generatedTurns.push({
                speaker: t.speaker,
                text: gen.text,
                audioBuffer: gen.audioBuffer,
                wordTimings: gen.wordTimings,
                duration: gen.duration,
                filePath: gen.filePath
            });
        }

        // 5. Stitch audios and measure durations using ffmpeg
        console.log('\n🎛️ Step 5: Stitching audio tracks and calculating timeline...');
        const inputsStr = generatedTurns.map(t => `-i "${t.filePath}"`).join(' ');
        const concatStr = generatedTurns.map((_, idx) => `[${idx}:a]`).join('') + `concat=n=${generatedTurns.length}:v=0:a=1[a]`;
        const stitchedPath = path.join(tmpDir, 'stitched.mp3');

        execSync(`ffmpeg -y ${inputsStr} -filter_complex "${concatStr}" -map "[a]" "${stitchedPath}"`, { stdio: 'pipe' });
        const stitchedAudioBuffer = fs.readFileSync(stitchedPath);
        console.log(`[Conversational Pipeline] Combined audio generated successfully (${stitchedAudioBuffer.length} bytes)`);

        // 6. Save transcript/data to pm_interviews table
        console.log('\n✏️ Step 6: Upserting PM Interview transcript to Supabase...');
        const interviewPayload = {
            title: script.title,
            news_date: newsEvent.news_date,
            reporter_name: selectedReporter.name,
            reporter_voice_id: selectedReporter.voiceId,
            question: combinedQuestion,
            answer: combinedAnswer,
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
                console.warn(`[Conversational Pipeline] ⚠️ Failed to save PM interview to Supabase: ${insertError.message}`);
            } else if (insertedInterview) {
                interviewId = insertedInterview.id;
                console.log(`[Conversational Pipeline] Saved to database with ID: ${interviewId}`);
            }
        } catch (dbErr: any) {
            console.warn(`[Conversational Pipeline] ⚠️ Database write failed: ${dbErr.message}. Continuing...`);
        }

        // 7. Render Video via ffmpeg
        console.log('\n🎥 Step 7: Generating video via ffmpeg...');
        const videoBuffer = await generateSubtitleReel(
            generatedTurns,
            {
                title: script.title,
                reporterName: selectedReporter.name,
                newsContext: script.news_context,
            }
        );

        // 8. Upload to Supabase Storage
        console.log('\n☁️ Step 8: Uploading MP4 to Supabase Storage...');
        const fileName = `pm-interview-${targetSlug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (!publicUrl) {
            throw new Error('Supabase Storage video upload failed.');
        }
        console.log(`[Conversational Pipeline] Video stored at: ${publicUrl}`);

        // Update database with video_url so it persists
        try {
            await (supabase as any)
                .from('pm_interviews')
                .update({ video_url: publicUrl })
                .eq('id', interviewId);
            console.log(`[Conversational Pipeline] Saved video_url to pm_interviews for ID: ${interviewId}`);
        } catch (dbErr: any) {
            console.warn(`[Conversational Pipeline] ⚠️ Failed to save video_url to database: ${dbErr.message}`);
        }

        // 9. Publish to Social Media
        console.log('\n📱 Step 9: Publishing to social platforms...');
        const igCaption = `PM Daily accountability: ${script.title} 🎤\n\nReporter ${selectedReporter.name} questions PM Narendra Modi.\n\n#IndianPolitics #PMModi #FactCheck #NewsIndia #MoitraStudios #Rajneeti`;
        const ytTitle = `PM Modi Interview: ${script.title.slice(0, 50)} #Shorts #News`;
        const ytDescription = `Daily direct interview briefing with Prime Minister Narendra Modi. Reporter ${selectedReporter.name} audits latest national developments.`;
        const ytTags = ['PM Modi', 'Narendra Modi', 'Indian Politics', 'News', 'Fact Check', 'Rajneeti', 'Moitra Studios'];

        const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, igCaption);
        const fbSuccess = await SocialUploadService.uploadToFacebook(publicUrl, igCaption);
        const ytSuccess = await SocialUploadService.uploadToYouTube(videoBuffer, ytTitle, ytDescription, ytTags);

        // Cleanup temp files
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        console.log('\n=== CONVERSATIONAL REEL PIPELINE COMPLETED SUCCESSFULLY ===');
        console.log(`   Social posts: IG=${igSuccess} FB=${fbSuccess} YT=${ytSuccess}`);

    } catch (err: any) {
        console.error('\n=== CONVERSATIONAL REEL PIPELINE FAILED ===', err.message || err);
        throw err;
    }
}

/**
 * Compiles a video reel for an existing PM Interview ID.
 */
export async function generateReelForInterviewId(interviewId: string): Promise<string> {
    if (!supabase) {
        throw new Error("Supabase client not initialized.");
    }

    console.log(`[Conversational Pipeline] Starting manual compilation for interview ID: ${interviewId}`);

    const { data: interview, error: fetchErr } = await (supabase as any)
        .from('pm_interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (fetchErr || !interview) {
        throw new Error(`Interview not found in database: ${fetchErr?.message || 'Empty result'}`);
    }

    console.log(`[Conversational Pipeline] Loaded interview: "${interview.title}"`);

    const reporterVoiceId = interview.reporter_voice_id || REPORTERS[0].voiceId;
    const MODI_VOICE_ID = process.env.ELEVENLABS_MODI_VOICE_ID || 'TM3DRXe9gqZUKdw8qnXA';

    // Parse Q&A turns
    const qParts = (interview.question || '').split('\n\n').map((s: string) => s.replace(/^(1\.|2\.|Q1:|Q2:)\s*/i, '').trim());
    const aParts = (interview.answer || '').split('\n\n').map((s: string) => s.replace(/^(1\.|2\.|A1:|A2:)\s*/i, '').trim());
    
    const q1 = qParts[0] || '';
    const q2 = qParts[1] || '';
    const a1 = aParts[0] || '';
    const a2 = aParts[1] || '';

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-manual-'));

    try {
        const synthesizeTurn = async (text: string, voiceId: string, filename: string, defaultDuration: number) => {
            const filePath = path.join(tmpDir, filename);
            let audioBuffer: Buffer;
            let wordTimings: { word: string; start: number; end: number }[];
            let duration = defaultDuration;
            
            try {
                const result = await generateAudioWithTimestamps(text, voiceId);
                audioBuffer = result.audioBuffer;
                wordTimings = result.wordTimings;
                fs.writeFileSync(filePath, audioBuffer);
                duration = parseFloat(
                    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`)
                        .toString()
                        .trim()
                );
            } catch (err: any) {
                console.warn(`[Conversational Pipeline] ElevenLabs failed for turn. Using fallback silence: ${err.message}`);
                execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${defaultDuration} -q:a 9 "${filePath}"`, { stdio: 'ignore' });
                audioBuffer = fs.readFileSync(filePath);
                duration = defaultDuration;
                wordTimings = estimateWordTimings(text, duration);
            }
            return { text, audioBuffer, wordTimings, duration, filePath };
        };

        console.log(`[Conversational Pipeline] Synthesizing audio for Q&A...`);
        const turnsToGenerate = [
            { text: q1, voiceId: reporterVoiceId, file: 'q1.mp3', dur: 5.0, speaker: 'reporter' as const },
            { text: a1, voiceId: MODI_VOICE_ID, file: 'a1.mp3', dur: 10.0, speaker: 'modi' as const }
        ];

        if (q2) {
            turnsToGenerate.push(
                { text: q2, voiceId: reporterVoiceId, file: 'q2.mp3', dur: 4.0, speaker: 'reporter' as const },
                { text: a2, voiceId: MODI_VOICE_ID, file: 'a2.mp3', dur: 10.0, speaker: 'modi' as const }
            );
        }

        const generatedTurns = [];
        for (const t of turnsToGenerate) {
            const gen = await synthesizeTurn(t.text, t.voiceId, t.file, t.dur);
            generatedTurns.push({
                speaker: t.speaker,
                text: gen.text,
                audioBuffer: gen.audioBuffer,
                wordTimings: gen.wordTimings,
                duration: gen.duration,
                filePath: gen.filePath
            });
        }

        console.log(`[Conversational Pipeline] Stitching audios...`);
        const inputsStr = generatedTurns.map(t => `-i "${t.filePath}"`).join(' ');
        const concatStr = generatedTurns.map((_, idx) => `[${idx}:a]`).join('') + `concat=n=${generatedTurns.length}:v=0:a=1[a]`;
        const stitchedPath = path.join(tmpDir, 'stitched.mp3');

        execSync(`ffmpeg -y ${inputsStr} -filter_complex "${concatStr}" -map "[a]" "${stitchedPath}"`, { stdio: 'pipe' });

        console.log(`[Conversational Pipeline] Rendering vertical video via ffmpeg...`);
        const videoBuffer = await generateSubtitleReel(
            generatedTurns,
            {
                title: interview.title,
                reporterName: interview.reporter_name || REPORTERS[0].name,
                newsContext: interview.news_context,
            }
        );

        console.log(`[Conversational Pipeline] Uploading reel to Storage...`);
        const targetSlug = createSlug(interview.title) || 'pm-press-conf';
        const fileName = `pm-press-conf-${targetSlug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (!publicUrl) {
            throw new Error("Failed to upload manual compilation to Storage.");
        }

        console.log(`[Conversational Pipeline] Manual reel compiled successfully: ${publicUrl}`);

        // Update database with video_url so it persists
        try {
            await (supabase as any)
                .from('pm_interviews')
                .update({ video_url: publicUrl })
                .eq('id', interviewId);
            console.log(`[Conversational Pipeline] Saved video_url to pm_interviews for ID: ${interviewId}`);
        } catch (dbErr: any) {
            console.warn(`[Conversational Pipeline] ⚠️ Failed to save video_url to database: ${dbErr.message}`);
        }

        return publicUrl;

    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
}
