import { runConversationalReelPipeline } from './services/conversationPipeline.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enable autoposting in memory for test run
process.env.ENABLE_AUTO_POSTING = 'true';
process.env.FRONTEND_URL = 'http://localhost:3001';

async function testConversationalPipeline() {
    console.log("🚀 STARTING CONVERSATIONAL REEL AUTOMATION TEST...");
    console.log("-----------------------------------------");
    console.log("Target: Q&A Video Reel Generation");
    console.log("Visual Layout: Conversational (Reporter + PM Modi)");
    console.log("-----------------------------------------");

    try {
        await runConversationalReelPipeline();
        console.log("\n✅ CONVERSATIONAL PIPELINE TEST RUN COMPLETED SUCCESSFULLY!");
    } catch (err: any) {
        console.error("\n❌ CONVERSATIONAL PIPELINE TEST RUN FAILED!");
        console.error("Error details:", err.message || err);
        process.exit(1);
    }
}

testConversationalPipeline();
