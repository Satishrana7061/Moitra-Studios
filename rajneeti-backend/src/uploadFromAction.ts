import { SocialUploadService } from "./services/socialUploadService.js";
import fetch from "node-fetch";

async function run() {
    const videoUrl = process.env.VIDEO_URL;
    const title = process.env.VIDEO_TITLE;
    const description = process.env.VIDEO_DESCRIPTION || "Political update from Rajneeti TV Network.";

    console.log("=== SERVERLESS YOUTUBE UPLOAD ===");
    console.log(`Title: ${title}`);
    console.log(`Video URL: ${videoUrl}`);

    if (!videoUrl || !title) {
        console.error("❌ Missing required payload: videoUrl or title");
        process.exit(1);
    }

    try {
        console.log("📥 Downloading video from Supabase...");
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video. Status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        console.log(`✅ Downloaded video (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        console.log("📤 Uploading to YouTube...");
        const success = await SocialUploadService.uploadToYouTube(videoBuffer, title, description);

        if (success) {
            console.log("🎉 Successfully uploaded to YouTube!");
            process.exit(0);
        } else {
            console.error("❌ Failed to upload to YouTube.");
            process.exit(1);
        }
    } catch (err) {
        console.error("❌ Error during serverless upload:", err);
        process.exit(1);
    }
}

run();
