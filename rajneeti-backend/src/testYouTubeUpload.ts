import { SocialUploadService } from './services/socialUploadService.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function runTest() {
    console.log("🚀 Starting standalone YouTube upload test...");

    const title = "Manual Test Reel - " + new Date().toLocaleString();
    const description = "This is a manual test of the Rajneeti TV Network YouTube upload pipeline.\n\n#shorts #news #rajneeti";

    // Look for a test file in the backend root
    const testFilePath = path.join(process.cwd(), 'test-video.mp4');
    let videoBuffer: Buffer;

    if (fs.existsSync(testFilePath)) {
        console.log(`📦 Reading test video from: ${testFilePath}`);
        videoBuffer = fs.readFileSync(testFilePath);
    } else {
        console.error("❌ Error: 'test-video.mp4' not found in the rajneeti-backend directory.");
        console.log("💡 Please place a valid .mp4 file named 'test-video.mp4' in 'c:/Users/Owner/OneDrive/Desktop/Projects/moitra-studios/rajneeti-backend' and run this script again.");
        process.exit(1);
    }

    console.log(`📤 Uploading to YouTube... (Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    try {
        const success = await SocialUploadService.uploadToYouTube(videoBuffer, title, description);
        
        if (success) {
            console.log("\n✅ SUCCESS! The video has been uploaded to YouTube Shorts.");
            console.log("Check your YouTube Studio to see the results.");
        } else {
            console.log("\n❌ FAILED. The upload did not complete. Check the logs above for details.");
        }
    } catch (err: any) {
        console.error("\n❌ CRITICAL ERROR during upload:", err.message || err);
    }
}

runTest();
