import { runAutomatedReelPipeline } from './services/automatedReelPipeline.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Standalone test script for the FULL automated pipeline.
 * This tests:
 * 1. News fetching (rssFetcher)
 * 2. AI Processing (aiProcessor)
 * 3. Voice Generation (ElevenLabs)
 * 4. Video Generation (Puppeteer + React Headless)
 * 5. Storage Upload (Supabase)
 * 6. Social Upload (YouTube Shorts)
 */
async function testFullAutomation() {
    console.log("🚀 STARTING FULL REEL AUTOMATION TEST...");
    console.log("-----------------------------------------");
    console.log("Target: YouTube Shorts + Supabase Storage");
    console.log("Voice: ElevenLabs (Hindi)");
    console.log("-----------------------------------------");

    try {
        await runAutomatedReelPipeline();
        console.log("\n✅ FULL AUTOMATION TEST COMPLETED!");
        console.log("Check your YouTube Studio and Supabase Bucket to see the results.");
    } catch (err: any) {
        console.error("\n❌ FULL AUTOMATION TEST FAILED!");
        console.error("Error details:", err.message || err);
    }
}

testFullAutomation();
