import { generateSubtitleReel, estimateWordTimings } from './services/ffmpegVideoGenerator.js';
import { generateAudioWithTimestamps, WordTiming } from './services/elevenLabsService.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("=== Testing Subtitle Reel Generator ===");
    try {
        const reporterText = "नमस्ते प्रधानमंत्री जी। मेरा सवाल मुद्रा योजना के बारे में है।";
        const modiText = "मुद्रा योजना से करोड़ों लोगों को फायदा हुआ है।";

        let reporterAudio: Buffer;
        let reporterWords: WordTiming[];
        let modiAudio: Buffer;
        let modiWords: WordTiming[];

        try {
            console.log("1. Generating audio + timestamps (Reporter)...");
            const res = await generateAudioWithTimestamps(reporterText);
            reporterAudio = res.audioBuffer;
            reporterWords = res.wordTimings;
        } catch (e) {
            console.warn("[Test] ElevenLabs Reporter audio failed. Using fallback...");
            if (fs.existsSync('news-bg.wav')) {
                reporterAudio = fs.readFileSync('news-bg.wav');
            } else {
                reporterAudio = Buffer.alloc(0);
            }
            reporterWords = estimateWordTimings(reporterText, 3.5);
        }

        try {
            console.log("2. Generating audio + timestamps (Modi)...");
            const res = await generateAudioWithTimestamps(modiText, process.env.ELEVENLABS_MODI_VOICE_ID);
            modiAudio = res.audioBuffer;
            modiWords = res.wordTimings;
        } catch (e) {
            console.warn("[Test] ElevenLabs Modi audio failed. Using fallback...");
            if (fs.existsSync('news-bg.wav')) {
                modiAudio = fs.readFileSync('news-bg.wav');
            } else {
                modiAudio = Buffer.alloc(0);
            }
            modiWords = estimateWordTimings(modiText, 5.0);
        }

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
