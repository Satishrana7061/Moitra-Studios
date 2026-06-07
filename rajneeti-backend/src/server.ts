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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, '../tokens.json');

const app = express();
app.use(cors());
app.use(express.json());

let cachedEvents: RajneetiEvent[] = [];

/**
 * Splits text content into 3 slide segments for kinetic typography reels.
 * Used by the manual reel trigger endpoint.
 */
function splitIntoSlides(text: string): { text: string; type: 'headline' | 'fact' | 'verdict' }[] {
    const sentences = text.split(/[।\.\n]+/).filter((s: string) => s.trim().length > 0);
    
    if (sentences.length <= 3) {
        const types: ('headline' | 'fact' | 'verdict')[] = ['headline', 'fact', 'verdict'];
        return sentences.map((s: string, i: number) => ({
            text: s.trim(),
            type: types[Math.min(i, 2)],
        }));
    }
    
    // Group into 3 slides
    const third = Math.ceil(sentences.length / 3);
    return [
        { text: sentences.slice(0, third).join('। ').trim(), type: 'headline' as const },
        { text: sentences.slice(third, third * 2).join('। ').trim(), type: 'fact' as const },
        { text: sentences.slice(third * 2).join('। ').trim(), type: 'verdict' as const },
    ];
}

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

// ── Helper: Save YouTube Tokens ─────────────────────────────────
function saveTokens(tokens: any) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

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

// ── YouTube OAuth ───────────────────────────────────────────────
app.get("/api/youtube/connect", (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI || "http://localhost:4000/api/youtube/callback"
    );

    const scopes = ['https://www.googleapis.com/auth/youtube'];

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

// ── Instagram Setup ─────────────────────────────────────────────
app.post("/api/admin/setup-instagram", async (req, res) => {
    const { appId, appSecret, userAccessToken } = req.body;

    if (!appId || !appSecret || !userAccessToken) {
        return res.status(400).json({ error: "Missing appId, appSecret, or userAccessToken" });
    }

    try {
        console.log("[Instagram Setup] Exchanging short-lived user token for long-lived user token...");
        
        // 1. Exchange token
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData: any = await exchangeRes.json();

        if (exchangeData.error) {
            throw new Error(`Meta Token Exchange Error: ${exchangeData.error.message}`);
        }

        const longLivedUserToken = exchangeData.access_token;
        console.log("[Instagram Setup] Successfully obtained long-lived user access token.");

        // 2. Fetch pages
        const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData: any = await pagesRes.json();

        if (pagesData.error) {
            throw new Error(`Meta Fetch Pages Error: ${pagesData.error.message}`);
        }

        const pages = pagesData.data || [];
        console.log(`[Instagram Setup] Found ${pages.length} Facebook Page(s) managed by user.`);

        let instagramUserId = "";
        let instagramAccessToken = "";
        let connectedPageName = "";

        // 3. Find connected Instagram Business Account
        for (const page of pages) {
            console.log(`[Instagram Setup] Checking Page: ${page.name} (ID: ${page.id})...`);
            const igUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
            const igRes = await fetch(igUrl);
            const igData: any = await igRes.json();

            if (igData.instagram_business_account) {
                instagramUserId = igData.instagram_business_account.id;
                instagramAccessToken = page.access_token; // Permanent page access token!
                connectedPageName = page.name;
                console.log(`[Instagram Setup] Found connected Instagram account ID: ${instagramUserId} on page ${connectedPageName}`);
                break;
            }
        }

        if (!instagramUserId || !instagramAccessToken) {
            return res.status(404).json({
                error: "No connected Instagram Business Account found.",
                details: "Make sure you have an Instagram Business Account connected to at least one of your Facebook Pages, and that you granted 'instagram_basic' and 'instagram_content_publish' permissions.",
                pagesFound: pages.map((p: any) => p.name)
            });
        }

        // 4. Update or create .env file in rajneeti-backend
        const envPath = path.join(__dirname, '../.env');
        let envContent = "";
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Helper to replace or append env vars
        const updateEnvVar = (key: string, value: string) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        };

        updateEnvVar("INSTAGRAM_ACCESS_TOKEN", instagramAccessToken);
        updateEnvVar("INSTAGRAM_USER_ID", instagramUserId);

        fs.writeFileSync(envPath, envContent.trim() + "\n");
        console.log("[Instagram Setup] Successfully saved Instagram credentials to rajneeti-backend/.env");

        res.json({
            success: true,
            message: `Instagram Reels setup completed successfully via Facebook Page "${connectedPageName}"!`,
            instagramUserId,
            instagramAccessTokenSnippet: instagramAccessToken.substring(0, 15) + "..."
        });
    } catch (err: any) {
        console.error("[Instagram Setup] Error:", err.message || err);
        res.status(500).json({ error: err.message || "Internal server error during Instagram setup." });
    }
});

// ── Upload Endpoints ────────────────────────────────────────────

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

        // 2. Upload to YouTube Shorts & Instagram Reels
        const { SocialUploadService } = await import("./services/socialUploadService.js");
        
        if (publicUrl) {
            console.log(`[Direct Upload] Publishing to Instagram Reels...`);
            const caption = `${title}\n\n${description || "Political update from Rajneeti TV Network."}\n\n#Rajneeti #Reels #News`;
            const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, caption);
            if (!igSuccess) {
                console.warn("[Direct Upload] Instagram upload failed or skipped.");
            }

            console.log(`[Direct Upload] Publishing to Facebook Reels...`);
            const fbSuccess = await SocialUploadService.uploadToFacebook(publicUrl, caption);
            if (!fbSuccess) {
                console.warn("[Direct Upload] Facebook upload failed or skipped.");
            }
        }

        console.log(`[Direct Upload] Publishing to YouTube Shorts...`);
        const success = await SocialUploadService.uploadToYouTube(
            videoBuffer,
            title,
            description || "Political update from Rajneeti TV Network."
        );

        if (success) {
            res.json({ 
                success: true, 
                message: "Successfully published to YouTube Shorts & Instagram Reels!",
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

    try {
        const { generateAudio } = await import("./services/elevenLabsService.js");
        const { generateKineticReel } = await import("./services/ffmpegVideoGenerator.js");
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

        // 2. Video — pure ffmpeg kinetic typography (no Puppeteer)
        console.log(`[Manual Pipeline] Generating kinetic typography video via ffmpeg...`);
        const contentText = hindi_content || summary || title;
        const slides = splitIntoSlides(contentText);
        const videoBuffer = await generateKineticReel(
            audioBuffer,
            slides,
            { reelNumber: 1, year: '2024', title: title || 'Rajneeti Update' }
        );

        // 3. Storage
        console.log(`[Manual Pipeline] Uploading to Storage...`);
        const fileName = `manual-reel-${slug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        // 4. Social
        if (publicUrl) {
            console.log(`[Manual Pipeline] Publishing to Instagram Reels...`);
            const caption = `${title || "Rajneeti Update"}\n\n${summary || ""}\n\n#Rajneeti #Reels #News #Politics`;
            const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, caption);
            if (!igSuccess) {
                console.warn("[Manual Pipeline] Instagram upload failed or skipped.");
            }

            console.log(`[Manual Pipeline] Publishing to Facebook Reels...`);
            const fbSuccess = await SocialUploadService.uploadToFacebook(publicUrl, caption);
            if (!fbSuccess) {
                console.warn("[Manual Pipeline] Facebook upload failed or skipped.");
            }
        }

        console.log(`[Manual Pipeline] Publishing to YouTube...`);
        const success = await SocialUploadService.uploadToYouTube(
            videoBuffer, 
            title || "Rajneeti Update", 
            (summary || "") + "\n\n#Rajneeti #Shorts #News"
        );

        if (success) {
            res.json({ 
                success: true, 
                message: "Full pipeline test successful! Reel is live on YouTube & Instagram.",
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

// Endpoint to trigger manual reel generation for a specific PM Open Press Conference Q&A
app.post("/api/admin/trigger-conversational-reel", async (req, res) => {
    const { interviewId } = req.body;
    
    if (!interviewId) {
        return res.status(400).json({ error: "Missing interviewId" });
    }

    console.log(`[Server] Manual conversational reel compile requested for ID: ${interviewId}`);

    try {
        const { generateReelForInterviewId } = await import("./services/conversationPipeline.js");
        const publicUrl = await generateReelForInterviewId(interviewId);
        
        res.json({
            success: true,
            message: "Conversational reel compiled and uploaded successfully!",
            publicUrl
        });
    } catch (err: any) {
        console.error("[Conversational Trigger] Error compiling reel:", err.message || err);
        res.status(500).json({ error: err.message || "Failed to compile conversational reel." });
    }
});

// Endpoint to seed the satirical PM interviews
app.post("/api/admin/seed-satirical", async (_req, res) => {
    console.log("[Server] Seeding satirical PM briefings into Supabase...");
    try {
        const { supabase } = await import("./services/supabaseStorage.js");
        if (!supabase) {
            return res.status(500).json({ error: "Supabase client not initialized." });
        }

        const satiricalInterviews = [
            {
                title: "NEET Exam early access",
                news_date: "2026-06-02",
                reporter_name: "Sia",
                reporter_voice_id: "YJpPt0sBEgMzYwcMkF5o",
                question: "1. NTA ne paper leak ke baad May third ka NEET-UG exam cancel kar diya. Sarkar is system breakdown ko kaise theek kar rahi hai?\n\n2. Lekin is cancellation se twenty two lakh bacchon ka nuksaan ho raha hai. Telegram channels block karne se kya hoga?",
                answer: "1. Dekhiye, sabse pehle toh negative shabdon ka istemal band kijiye. Yeh leak nahi, premium candidates ke liye Exclusive Early Access Program tha.\n\n2. NTA ne Zero Error exam policy ka vaada kiya tha. Guess paper WhatsApp leak se one hundred percent match hua, toh zero error hi hua na! Aur Telegram block kar diya, kyunki mirror todne se pimple dikhna band ho jata hai! Baar-baar exam cancel karke sarkar ensure kar rahi hai ki koi fail hi na ho!",
                news_context: "NTA cancels May third NEET-UG exam for twenty two lakh students over WhatsApp paper leak; blocks one hundred and twenty Telegram channels in response.",
                source_url: "https://moitrastudios.com",
                video_url: null
            },
            {
                title: "Century Bound Rupee",
                news_date: "2026-06-03",
                reporter_name: "Amit Gupta",
                reporter_voice_id: "ltvR0942IpmQjl5QbXL1",
                question: "1. Indian Rupee dollar ke khilaaf lagatar girte hue ninety five point eighty three tak pahunch gaya hai. Hamari currency itni kamzor kyun ho rahi hai?\n\n2. Lekin isse imports mehnge ho rahe hain aur aam janta par bojh badh raha hai.",
                answer: "1. Aap ise anti-national lens se dekh rahe hain. Rupee gir nahi raha, dollar ke aage cultural respect mein jhuk raha hai—Atithi Devo Bhava!\n\n2. NRIs jab New Jersey se ten dollars birthday gift bhejenge, toh aap sudden millionaire feel karenge! Hum toh wait kar rahe hain kab Rupee hundred hit kare aur hum bat raise karke pure desh mein sweets baant sakein!",
                news_context: "Indian Rupee reaches historical low, approaching ninety five point eighty three against the US Dollar amid global currency adjustments.",
                source_url: "https://moitrastudios.com",
                video_url: null
            },
            {
                title: "RBI Inflation Warnings",
                news_date: "2026-06-04",
                reporter_name: "Mitali",
                reporter_voice_id: "onQAwbsky3pmzMu2uapN",
                question: "1. RBI ne inflation par cautious stance liya hai aur aam janta ki savings khatam ho rahi hain. Log kaise survive karenge?\n\n2. Lekin savings ke bina common man ka future kaise chalega?",
                answer: "1. RBI ka cautious approach toh bas middle class se poochne ka ek highly educated tareeqa hai ki: 'Wait, kya sach mein abhi bhi tum logo ke paas paise bache hain?'.\n\n2. Hum middle class ko ancient art of minimalism aur detachment seekha rahe hain. Jab life insurance se lekar saans lene par eighteen percent GST lag raha ho, toh savings account ki kya zaroorat hai!",
                news_context: "RBI warns of inflation pressures and low household savings as eighteen percent GST on health and life insurance premiums faces public debate.",
                source_url: "https://moitrastudios.com",
                video_url: null
            },
            {
                title: "State sponsored fuel fitness",
                news_date: "2026-06-05",
                reporter_name: "Kanika",
                reporter_voice_id: "y2H4TwIU5I2L0JXOdBeX",
                question: "1. Global crude prices girne ke baad bhi India mein petrol ke daam itne painfully high kyun hain?\n\n2. Lekin log heavy taxes de rahe hain aur badle mein unhe bas potholes milte hain.",
                answer: "1. Petrol ke daam high bolna galat hai. Yeh sarkar ki flagship National Health and Fitness Scheme hai—daam mehnge honge toh aap walk karenge aur India fit hoga!\n\n2. Arey, unhi taxes se toh hum election se pehle ek hi pothole ko six times patch karne ka world-class infrastructure fund karte hain! Yeh petrol nahi, premium liquid nationalism hai!",
                news_context: "Fuel and petrol prices remain elevated in India despite global crude price drops, drawing focus before state elections.",
                source_url: "https://moitrastudios.com",
                video_url: null
            }
        ];

        const { data: inserted, error } = await (supabase as any)
            .from('pm_interviews')
            .upsert(satiricalInterviews, { onConflict: 'news_date' })
            .select();

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: `Successfully seeded ${inserted.length} satirical interviews!`,
            interviews: inserted
        });
    } catch (err: any) {
        console.error("[Server] Seeding error:", err.message || err);
        res.status(500).json({ error: err.message || "Failed to seed satirical interviews." });
    }
});

// ── Admin/Pipeline Endpoints ────────────────────────────────────

// Endpoint to manually trigger the full automated pipeline for testing
app.post("/api/admin/trigger-pipeline", async (_req, res) => {
    runAutomatedReelPipeline().catch(console.error);
    res.json({ message: "Pipeline triggered in background." });
});

// Endpoint to manually trigger the Truth Engine verification (test one promise)
app.post("/api/admin/verify-promise", async (_req, res) => {
    try {
        const { verifyNextPromise } = await import("./services/truthEngine.js");
        const result = await verifyNextPromise();
        if (result) {
            res.json({
                success: true,
                message: `Verified: "${result.title}" → ${result.status}`,
                promise: result,
            });
        } else {
            res.json({
                success: false,
                message: "No unverified promises found, or the two AI models disagreed.",
            });
        }
    } catch (err: any) {
        console.error("[Verify Promise] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🏛️  Rajneeti backend listening on http://localhost:${PORT}`);
    console.log(`   Refresh interval: ${REFRESH_INTERVAL_MS / 60000} minutes\n`);

    // Initial fetch
    await refreshEvents();

    // Schedule periodic refreshes
    setInterval(refreshEvents, REFRESH_INTERVAL_MS);
    
    // Schedule the automated social reel pipeline (every 24 hours) — gated by env var
    if (process.env.ENABLE_AUTO_POSTING === 'true') {
        const PIPELINE_INTERVAL_MS = 12 * 60 * 60 * 1000;
        setInterval(runAutomatedReelPipeline, PIPELINE_INTERVAL_MS);
        console.log('🚀 Auto-posting ENABLED! Pipeline will run every 12 hours (2 reels/day).');
    } else {
        console.log('⏸️  Auto-posting is DISABLED. Set ENABLE_AUTO_POSTING=true in .env to enable.');
    }
});
