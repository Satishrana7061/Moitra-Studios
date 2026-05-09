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
        // 1. Handle Manual Override or Fetch Top National News
        let news: any = null;

        const manualSlug = process.env.NEWS_SLUG;
        const manualTitle = process.env.NEWS_TITLE;
        const manualSummary = process.env.NEWS_SUMMARY;

        if (manualSlug && manualTitle) {
            console.log(`[Pipeline] Manual override detected for slug: ${manualSlug}`);
            news = {
                id: manualSlug,
                stateName: "India",
                politicianName: "National Update",
                title: manualTitle,
                blog_title: manualTitle,
                summary: manualSummary || "Latest political update from Rajneeti Network TV.",
                hindi_content: manualSummary || manualTitle 
            };

            
            // If it's a manual trigger, we might still want to use AI to get a better Hindi script 
            // but for now we use the provided summary to be fast.
        } else {
            console.log(`[Pipeline] Fetching latest national news...`);
            const rawNews = await fetchFilteredNews();
            
            if (rawNews.length === 0) {
                console.log(`[Pipeline] No news found. Exiting pipeline.`);
                return;
            }

            const topNewsRaw = rawNews.slice(0, 1);
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
            news = events[0];
        }

        if (!news) throw new Error("No news item found to process.");

        
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
        const videoBuffer = await generateHeadlessVideo(news.id, audioBuffer);

        console.log(`[Pipeline] Video generated successfully. Size: ${videoBuffer.length} bytes`);

        // 4. Upload to Supabase Storage (Required for Instagram)
        console.log(`[Pipeline] Uploading to Supabase Storage...`);
        const safeSlug = news.id ? news.id.slice(0, 50) : "reel";
        const fileName = `${safeSlug}-${Date.now()}.mp4`;
        const publicUrl = await SupabaseStorageService.uploadVideo(videoBuffer, fileName);

        if (!publicUrl) {
            throw new Error("Supabase upload failed. Check bucket permissions and secrets.");
        }
        console.log(`[Pipeline] Successfully uploaded to Supabase: ${publicUrl}`);

        // 5. Upload to Social Media
        console.log(`[Pipeline] Starting Social Uploads...`);
        const caption = `${news.title}\n\n#Rajneeti #IndiaNews #Politics #Trending`;
        
        const igSuccess = await SocialUploadService.uploadToInstagram(publicUrl, caption);
        if (!igSuccess) {
            console.warn("[Pipeline] Instagram upload failed, but continuing to YouTube...");
        }
        
        const youtubeTitle = (news.blog_title || news.title || "Rajneeti News Update").slice(0, 100);
        const youtubeDescription = `${news.blog_title || news.title || "Political Update"}\n\nPolitical update for ${news.stateName || 'India'}.\n\nRead more: https://moitrastudios.com/rajneeti-tv-network\n\n#Rajneeti #News #India #Politics #Shorts #Trending`;
        
        // Generate dynamic tags to make the reel viral
        const dynamicTags = [
            news.stateName?.toLowerCase().replace(/\s+/g, ''),
            news.politicianName?.toLowerCase().replace(/\s+/g, ''),
            'election',
            'viral',
            'newsupdate'
        ].filter(Boolean) as string[];

        const ytSuccess = await SocialUploadService.uploadToYouTube(videoBuffer, youtubeTitle, youtubeDescription, dynamicTags);


        if (!ytSuccess) {
            throw new Error("YouTube upload failed. Check refresh token and quotas.");
        }



        // 6. Cleanup old files
        await SupabaseStorageService.cleanupOldVideos();

        console.log("=== AUTOMATED REEL PIPELINE COMPLETED SUCCESSFULLY ===");
    } catch (err: any) {
        console.error("=== AUTOMATED REEL PIPELINE FAILED ===", err);
        throw err; // Ensure the process exits with failure
    }

}
