import { runAutomatedReelPipeline } from './services/automatedReelPipeline.js';

// Load env vars if running locally (GitHub Actions sets them directly)
import dotenv from 'dotenv';
dotenv.config();

console.log("🚀 Starting standalone automated reel pipeline execution...");

runAutomatedReelPipeline().then(() => {
    console.log("✅ Pipeline execution finished successfully.");
    process.exit(0);
}).catch((err) => {
    console.error("❌ Pipeline execution failed:", err);
    process.exit(1);
});
