import { generateKineticReel } from './services/ffmpegVideoGenerator.js';
import { generateAudio } from './services/elevenLabsService.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("=== Testing Kinetic Reel Generator ===");
    try {
        const text = "do hazaar chaubis ke sankalp patra mein pradhan mantri mudra yojana ki limit bis lakh se badhakar tees lakh rupaye kar di gayi hai";
        console.log("1. Generating audio...");
        const audioBuffer = await generateAudio(text);
        
        console.log("2. Generating video...");
        const videoBuffer = await generateKineticReel(
            audioBuffer,
            [
                { text: "Modi Ki Guarantee #1", type: "headline" },
                { text: "Mudra Yojana Limit Increased", type: "fact" },
                { text: "Verdict: In Progress", type: "verdict" }
            ],
            { reelNumber: 1, year: "2024", title: "Mudra Yojana Expansion" }
        );

        console.log("3. Writing video to test-kinetic.mp4...");
        fs.writeFileSync('test-kinetic.mp4', videoBuffer);
        console.log("Done! Check test-kinetic.mp4");
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
