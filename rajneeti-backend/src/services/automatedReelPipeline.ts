import { translateToHindi, generateAudio } from './elevenLabsService.js';
import { generateHeadlessVideo } from './puppeteerVideoGenerator.js';
import { SocialUploadService } from './socialUploadService.js';

// We assume we have a way to fetch from supabase in the backend, 
// but for the sake of this pipeline, we will simulate the fetch
// If you have a supabase client in backend, use it here.
async function fetchTopNewsCampaigns() {
    console.log("[Pipeline] Fetching top news campaigns from Supabase...");
    // Mock return of a campaign slug and text.
    // In production, this would query Supabase for `status='live'` or high `total_votes`.
    return [
        {
            slug: 'delhi-pollution-crisis-2026',
            title: 'Delhi Pollution Crisis',
            summary: 'The air quality index in Delhi has reached hazardous levels, prompting an emergency response from both the state and central governments. Schools have been shut and construction halted as political blame games continue over stubble burning in neighboring states.'
        }
    ];
}

export async function runAutomatedReelPipeline() {
    console.log("=== STARTING AUTOMATED REEL PIPELINE ===");

    try {
        const topNews = await fetchTopNewsCampaigns();
        
        if (topNews.length === 0) {
            console.log("[Pipeline] No top news found today.");
            return;
        }

        for (const news of topNews) {
            console.log(`[Pipeline] Processing campaign: ${news.slug}`);
            
            // 1. Translate and add pacing
            console.log(`[Pipeline] Translating to Hindi...`);
            const hindiScript = await translateToHindi(`${news.title}. ${news.summary}`);
            console.log(`[Pipeline] Translated Script: ${hindiScript}`);

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

            // 4. Upload to Social Media
            console.log(`[Pipeline] Saving video locally for demonstration...`);
            fs.writeFileSync('test_reel.mp4', videoBuffer);
            console.log(`[Pipeline] Saved locally to test_reel.mp4`);

            console.log(`[Pipeline] Starting Social Uploads...`);
            const caption = `${news.title}\n\n#Rajneeti #IndiaNews #Politics #Trending`;
            
            await SocialUploadService.uploadToInstagram(videoBuffer, caption);
            await SocialUploadService.uploadToYouTube(videoBuffer, news.title, news.summary);
            // await SocialUploadService.uploadToTikTok(videoBuffer, caption); // Disabled

            console.log(`[Pipeline] Finished processing campaign: ${news.slug}`);
        }
        console.log("=== AUTOMATED REEL PIPELINE COMPLETE ===");
    } catch (err) {
        console.error("=== AUTOMATED REEL PIPELINE FAILED ===", err);
    }
}
