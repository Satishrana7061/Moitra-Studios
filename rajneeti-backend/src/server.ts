// src/server.ts
import express from "express";
import cors from "cors";
import { fetchFilteredNews } from "./rssFetcher.js";
import { processNewsWithAI } from "./aiProcessor.js";
import { RajneetiEvent } from "./types.js";
import { PORT, REFRESH_INTERVAL_MS } from "./config.js";
import { runAutomatedReelPipeline } from "./services/automatedReelPipeline.js";
import { google } from 'googleapis';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });


const app = express();
app.use(cors());
app.use(express.json());

let cachedEvents: RajneetiEvent[] = [];
let lastRefresh: string | null = null;

// Candidate list for the AI prompt
const CANDIDATE_LIST_TEXT = `
- Narendra Modi, BJP, National (stateCode: DL)
- Rahul Gandhi, Congress, National (stateCode: UP)
- Amit Shah, BJP, National (stateCode: DL)
- Arvind Kejriwal, AAP, Delhi (stateCode: DL)
- Mamata Banerjee, TMC, West Bengal (stateCode: WB)
- Yogi Adityanath, BJP, Uttar Pradesh (stateCode: UP)
- M.K. Stalin, DMK, Tamil Nadu (stateCode: TN)
- Nitish Kumar, JDU, Bihar (stateCode: BR)
- Akhilesh Yadav, SP, Uttar Pradesh (stateCode: UP)
- Uddhav Thackeray, Shiv Sena (UBT), Maharashtra (stateCode: MH)
- Mallikarjun Kharge, Congress, National (stateCode: KA)
- Nirmala Sitharaman, BJP, National (stateCode: TN)
- Rajnath Singh, BJP, National (stateCode: UP)
- Smriti Irani, BJP, Uttar Pradesh (stateCode: UP)
- Mayawati, BSP, Uttar Pradesh (stateCode: UP)
- Lalu Prasad Yadav, RJD, Bihar (stateCode: BR)
- Tejaswi Yadav, RJD, Bihar (stateCode: BR)
- Bhagwant Mann, AAP, Punjab (stateCode: PB)
- Pinarayi Vijayan, CPI(M), Kerala (stateCode: KL)
- N. Chandrababu Naidu, TDP, Andhra Pradesh (stateCode: AP)
- Prashant Kishor, Jan Suraaj, Bihar (stateCode: BR)
- Priyanka Gandhi, Congress, Uttar Pradesh (stateCode: UP)

FALLBACK RULES:
1. If news is about a state but NO specific candidate above is involved, attribute to:
   - "National Front" (for BJP/NDA news)
   - "Regional Front" (for Opposition/Regional news like TMC, DMK, SP, etc.)
2. NEVER attribute news to journalists, authors, or news organizations.
`;

// ── Refresh Logic ───────────────────────────────────────────────
async function refreshEvents() {
    try {
        console.log("\n🔄 Refreshing news feed...");
        const rawNews = await fetchFilteredNews();
        console.log(`  📰 Fetched ${rawNews.length} raw articles (after filtering)`);

        if (rawNews.length === 0) {
            console.log("  ⚠️  No articles passed filters, keeping cached events.");
            return;
        }

        const events = await processNewsWithAI(rawNews, CANDIDATE_LIST_TEXT);

        if (events.length > 0) {
            // Merge new events on top, keep max 50
            const mergedIds = new Set(events.map((e) => e.id));
            const oldUnseen = cachedEvents.filter((e) => !mergedIds.has(e.id));
            cachedEvents = [...events, ...oldUnseen].slice(0, 50);
        }

        lastRefresh = new Date().toISOString();
        console.log(
            `  ✅ Done — ${events.length} new events, ${cachedEvents.length} total cached`
        );

        if (cachedEvents.length === 0) {
            console.log("  ⚠️  Feed empty, injecting mock news for testing...");
            cachedEvents = [
                {
                    id: "test-reel-cloud-" + Math.floor(Math.random() * 1000),
                    stateCode: "DL",
                    stateName: "Delhi",
                    politicianName: "Arvind Kejriwal",
                    partyName: "AAP",
                    delta: 3,
                    sentiment: "positive",
                    summary: "Major infrastructure project approved for Delhi NCR, boosting regional connectivity.",
                    hindi_content: "दिल्ली एन.सी.आर. के लिए बड़ी बुनियादी ढांचा परियोजना को मंजूरी दी गई है, जिससे क्षेत्रीय संपर्क को बढ़ावा मिलेगा।",
                    mainPhrase: "DELHI GROWTH HUB",
                    shareUrl: "/rajneeti/dl/test-reel-cloud",
                    createdAt: new Date().toISOString()
                }
            ];
        }
    } catch (err) {
        console.error("❌ Failed to refresh events:", err);
    }
}


// ── API Endpoints ───────────────────────────────────────────────
app.get("/api/rajneeti-events", (_req, res) => {
    res.json({
        events: cachedEvents,
        lastRefresh,
        count: cachedEvents.length,
    });
});

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        events: cachedEvents.length,
        lastRefresh,
    });
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, '../tokens.json');

// Helper to save tokens
function saveTokens(tokens: any) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

app.get("/api/youtube/connect", (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI || "http://localhost:4000/api/youtube/callback"
    );

    const scopes = ['https://www.googleapis.com/auth/youtube.upload'];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

    res.redirect(url);
});

app.get("/api/youtube/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
        res.status(400).send("No code provided.");
        return;
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI || "http://localhost:4000/api/youtube/callback"
    );

    try {
        const { tokens } = await oauth2Client.getToken(code as string);
        saveTokens({ YOUTUBE_REFRESH_TOKEN: tokens.refresh_token });
        
        console.log("=== YOUTUBE CONNECTED SUCCESSFULLY ===");
        console.log("Refresh token saved to tokens.json automatically.");
        res.send(`<h1>YouTube Connected!</h1><p>Your YouTube account has been successfully connected to Moitra Studios. The refresh token is saved securely on the server.</p>`);
    } catch (err) {
        console.error("Error retrieving tokens:", err);
        res.status(500).send("Error connecting to YouTube.");
    }
});

app.get("/api/youtube/disconnect", (req, res) => {
    saveTokens({}); // Clear tokens
    res.send(`<h1>Disconnected</h1><p>YouTube has been disconnected successfully.</p>`);
});

app.post("/api/youtube/upload", async (_req, res) => {
    // This triggers the pipeline, which includes uploading to YouTube
    runAutomatedReelPipeline().catch(console.error);
    res.json({ message: "Test upload triggered via pipeline in background." });
});

// Endpoint to manually publish a reel generated from the frontend
app.post("/api/youtube/publish-manual", async (req, res) => {
    const { videoUrl, title, description } = req.body;
    
    if (!videoUrl || !title) {
        return res.status(400).json({ error: "Missing videoUrl or title" });
    }

    console.log(`[Manual Upload] Received request to publish: ${title}`);
    
    try {
        // Download the video buffer from Supabase URL
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error(`Failed to fetch video from ${videoUrl}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        
        // Use the SocialUploadService to push to YouTube
        const { SocialUploadService } = await import("./services/socialUploadService.js");
        const success = await SocialUploadService.uploadToYouTube(
            videoBuffer, 
            title, 
            description || "Political update from Rajneeti TV Network."
        );
        
        if (success) {
            res.json({ success: true, message: "Successfully published to YouTube Shorts!" });
        } else {
            res.status(500).json({ error: "YouTube upload failed. Check server logs." });
        }
    } catch (err: any) {
        console.error("[Manual Upload] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to manually publish a reel blob directly from the frontend
app.post("/api/youtube/publish-direct", upload.single('video'), async (req, res) => {
    const { title, description } = req.body;
    const videoBuffer = req.file?.buffer;

    if (!videoBuffer || !title) {
        return res.status(400).json({ error: "Missing video file or title" });
    }

    console.log(`[Direct Upload] Received video file for: ${title} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    try {
        // 1. Upload to Supabase Storage (Server-side has the service role key)
        const { SupabaseStorageService } = await import("./services/supabaseStorage.js");
        const fileName = `manual-reel-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (publicUrl) {
            console.log(`[Direct Upload] Saved to storage: ${publicUrl}`);
        }

        // 2. Upload to YouTube Shorts
        const { SocialUploadService } = await import("./services/socialUploadService.js");
        const success = await SocialUploadService.uploadToYouTube(
            videoBuffer,
            title,
            description || "Political update from Rajneeti TV Network."
        );

        if (success) {
            res.json({ 
                success: true, 
                message: "Successfully published to YouTube Shorts!",
                storageUrl: publicUrl
            });
        } else {
            res.status(500).json({ error: "YouTube upload failed. Check server logs." });
        }
    } catch (err: any) {
        console.error("[Direct Upload] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to trigger the FULL automated pipeline for a specific news item (with voice)
app.post("/api/admin/trigger-manual-reel", async (req, res) => {
    const { slug, title, summary, hindi_content } = req.body;
    
    if (!slug) {
        return res.status(400).json({ error: "Missing campaign slug" });
    }

    console.log(`[Manual Pipeline Trigger] Starting full pipeline for: ${slug}`);

    // We'll run this in a separate promise so we don't block the request if it takes too long
    // but we'll try to return the result if it's fast enough for the UI to wait.
    try {
        const { generateAudio } = await import("./services/elevenLabsService.js");
        const { generateHeadlessVideo } = await import("./services/puppeteerVideoGenerator.js");
        const { SupabaseStorageService } = await import("./services/supabaseStorage.js");
        const { SocialUploadService } = await import("./services/socialUploadService.js");

        // 1. Audio
        console.log(`[Manual Pipeline] Generating ElevenLabs Audio...`);
        let audioBuffer: Buffer;
        try {
            audioBuffer = await generateAudio(hindi_content || summary || title);
        } catch (err: any) {
            console.error(`[Manual Pipeline] ElevenLabs failed: ${err.message}. Continuing without audio.`);
            audioBuffer = Buffer.alloc(0);
        }

        // 2. Video
        console.log(`[Manual Pipeline] Capturing Headless Video...`);
        const videoBuffer = await generateHeadlessVideo(slug, audioBuffer);

        // 3. Storage
        console.log(`[Manual Pipeline] Uploading to Storage...`);
        const fileName = `manual-reel-${slug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        // 4. Social
        console.log(`[Manual Pipeline] Publishing to YouTube...`);
        const success = await SocialUploadService.uploadToYouTube(
            videoBuffer, 
            title || "Rajneeti Update", 
            (summary || "") + "\n\n#Rajneeti #Shorts #News"
        );

        if (success) {
            res.json({ 
                success: true, 
                message: "Full pipeline test successful! Reel is live on YouTube.",
                publicUrl 
            });
        } else {
            res.status(500).json({ error: "YouTube upload failed. Check server logs." });
        }
    } catch (err: any) {
        console.error("[Manual Pipeline] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});



// Endpoint to manually trigger the pipeline for testing
app.post("/api/admin/trigger-pipeline", async (_req, res) => {
    // In production, add auth here
    runAutomatedReelPipeline().catch(console.error);
    res.json({ message: "Pipeline triggered in background." });
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🏛️  Rajneeti backend listening on http://localhost:${PORT}`);
    console.log(`   Refresh interval: ${REFRESH_INTERVAL_MS / 60000} minutes\n`);

    // Initial fetch
    await refreshEvents();

    // Schedule periodic refreshes
    setInterval(refreshEvents, REFRESH_INTERVAL_MS);
    
    // Schedule the automated social reel pipeline (every 24 hours)
    const PIPELINE_INTERVAL_MS = 24 * 60 * 60 * 1000;
    setInterval(runAutomatedReelPipeline, PIPELINE_INTERVAL_MS);
});
