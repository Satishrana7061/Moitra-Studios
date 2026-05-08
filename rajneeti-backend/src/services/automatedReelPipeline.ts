import fs from 'fs';
import { fetchFilteredNews } from "../rssFetcher.js";
import { processNewsWithAI } from "../aiProcessor.js";
import { generateAudio } from "./elevenLabsService.js";
import { generateHeadlessVideo } from "./puppeteerVideoGenerator.js";
import { SocialUploadService } from "./socialUploadService.js";
import { SupabaseStorageService } from "./supabaseStorage.js";

/**
 * The master pipeline that orchestrates the entire headless video generation process.
 */
export async function runAutomatedReelPipeline() {
    console.log("=== STARTING AUTOMATED REEL PIPELINE ===");
    try {
        // 1. Fetch Top National News
        console.log(`[Pipeline] Fetching latest national news...`);
        const rawNews = await fetchFilteredNews();
        
        if (rawNews.length === 0) {
            console.log(`[Pipeline] No news found. Exiting pipeline.`);
            return;
        }

        // We'll process just the absolute top news item for the reel to save resources
        const topNewsRaw = rawNews.slice(0, 1);
        
        // candidate context to force it to format as a short news brief
        const CANDIDATE_LIST = `
- Narendra Modi, BJP, National
- Rahul Gandhi, Congress, National
- Amit Shah, BJP, National
- Arvind Kejriwal, AAP, Delhi
- Mamata Banerjee, TMC, West Bengal
- Yogi Adityanath, BJP, Uttar Pradesh
- M.K. Stalin, DMK, Tamil Nadu
- Nitish Kumar, JDU, Bihar
- Akhilesh Yadav, SP, Uttar Pradesh
- Uddhav Thackeray, Shiv Sena (UBT), Maharashtra
- National Front (NDA/BJP)
- Regional Front (Opposition/INDIA)
        `;
        
        const events = await processNewsWithAI(topNewsRaw, CANDIDATE_LIST);
        if (events.length === 0) {
             console.log(`[Pipeline] AI failed to process news. Exiting.`);
             return;
        }


        const news = events[0];
        
        // Ensure Hindi content
        const hindiScript = news.hindi_content;
        if (!hindiScript) {
             throw new Error("No Hindi translation provided by AI.");
        }

        // 2. Generate Audio via ElevenLabs
        console.log(`[Pipeline] Generating ElevenLabs Audio...`);
        let audioBuffer: Buffer;
        try {
            audioBuffer = await generateAudio(hindiScript);
        } catch (err: any) {
            console.error(`[Pipeline] ElevenLabs API failed (Likely Free Tier Restriction): ${err.message}`);
            console.log(`[Pipeline] Falling back to no-audio for demonstration purposes...`);
            audioBuffer = Buffer.alloc(0); // Proceed without audio
        }

        // 3. Generate Video via Puppeteer (pass audio buffer)
        console.log(`[Pipeline] Capturing Headless Video...`);
        const videoBuffer = await generateHeadlessVideo(news.slug, audioBuffer);
        console.log(`[Pipeline] Video generated successfully. Size: ${videoBuffer.length} bytes`);

        // 4. Upload to Supabase Storage (Required for Instagram)
        console.log(`[Pipeline] Uploading to Supabase Storage...`);
        const fileName = `reel-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        // 5. Upload to Social Media
        console.log(`[Pipeline] Starting Social Uploads...`);
        const caption = `${news.title}\n\n#Rajneeti #IndiaNews #Politics #Trending`;
        
        if (publicUrl) {
            await SocialUploadService.uploadToInstagram(publicUrl, caption);
        } else {
            console.warn(`[Pipeline] Skipping Instagram upload because Supabase URL generation failed.`);
        }
        
        
        const youtubeDescription = `${news.blog_title || news.title}\n\nPolitical update for ${news.stateName || 'India'}.\n\nRead more: https://moitrastudios.com/rajneeti-tv-network\n\n#Rajneeti #News #India #Politics #Shorts #Trending`;
        await SocialUploadService.uploadToYouTube(videoBuffer, (news.blog_title || news.title).slice(0, 100), youtubeDescription);


        // 6. Cleanup old files
        await SupabaseStorageService.cleanupOldVideos();

        console.log("=== AUTOMATED REEL PIPELINE COMPLETED SUCCESSFULLY ===");
    } catch (err: any) {
        console.error("=== AUTOMATED REEL PIPELINE FAILED ===", err);
    }
}
