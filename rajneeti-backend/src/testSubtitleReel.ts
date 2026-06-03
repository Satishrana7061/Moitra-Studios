import { generateSubtitleReel } from './services/ffmpegVideoGenerator.js';
import { generateAudioWithTimestamps } from './services/elevenLabsService.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("=== Testing Subtitle Reel Generator ===");
    try {
        const reporterText = "Namaste Pradhan Mantri ji. Mera sawal mudra yojana ke baare mein hai.";
        const modiText = "Mudra yojana se crore on logo ko fayda hua hai.";

        console.log("1. Generating audio + timestamps (Reporter)...");
        const { audioBuffer: reporterAudio, wordTimings: reporterWords } = await generateAudioWithTimestamps(reporterText);

        console.log("2. Generating audio + timestamps (Modi)...");
        const { audioBuffer: modiAudio, wordTimings: modiWords } = await generateAudioWithTimestamps(modiText, process.env.ELEVENLABS_MODI_VOICE_ID);

        console.log("3. Generating video...");
        const videoBuffer = await generateSubtitleReel(
            reporterAudio,
            modiAudio,
            reporterWords,
            modiWords,
            {
                title: "Mudra Yojana Impact",
                reporterName: "Kanika",
                newsContext: "Mudra limit increased to 30 lakh"
            }
        );

        console.log("4. Writing video to test-subtitle.mp4...");
        fs.writeFileSync('test-subtitle.mp4', videoBuffer);
        console.log("Done! Check test-subtitle.mp4");
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
