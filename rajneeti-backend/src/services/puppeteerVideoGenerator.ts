import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function generateHeadlessVideo(campaignSlug: string, audioBuffer: Buffer): Promise<Buffer> {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const encodedTitle = encodeURIComponent(process.env.NEWS_TITLE || 'Rajneeti Update');
    const encodedSummary = encodeURIComponent(process.env.NEWS_SUMMARY || 'Latest political news from Rajneeti Network TV.');

    const targetUrl = `${FRONTEND_URL}/headless-reel/${campaignSlug}?title=${encodedTitle}&summary=${encodedSummary}`;

    // Create a temp directory for our frames
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
    const outputPath = path.join(tmpDir, 'output.mp4');

    console.log(`[Puppeteer] Launching headless browser...`);
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set viewport to match our canvas size
        await page.setViewport({ width: 1080, height: 1920 });

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        console.log(`[Puppeteer] Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        console.log(`[Puppeteer] Waiting for page to be ready...`);
        await page.waitForFunction(() => {
            const statusEl = document.getElementById('status');
            return statusEl && statusEl.innerText === 'ready';
        }, { timeout: 30000 });

        // Get total number of slides
        const totalSlides = await page.evaluate(() => (window as any).totalSlides || 3);
        console.log(`[Puppeteer] Found ${totalSlides} slides to render.`);

        // Render each slide and export the element as a PNG
        for (let i = 0; i < totalSlides; i++) {
            console.log(`[Puppeteer] Rendering slide ${i + 1}/${totalSlides}...`);

            // Tell the browser to render the slide
            const success = await page.evaluate((idx: number) => {
                try {
                    return (window as any).renderSlide(idx);
                } catch (err) {
                    console.error(`renderSlide(${idx}) failed:`, err);
                    return false;
                }
            }, i);

            if (!success) {
                throw new Error(`renderSlide(${i}) failed`);
            }

            // Small delay to allow CSS transitions and text to settle
            await new Promise(r => setTimeout(r, 800));

            // Grab the reel container element and screenshot it
            const containerHandle = await page.$('#reel-container');
            if (!containerHandle) {
                throw new Error("Reel container element not found on page");
            }

            const framePath = path.join(tmpDir, `slide_${i}.png`);
            // omitBackground: true ensures the background is transparent
            await containerHandle.screenshot({ path: framePath, type: 'png', omitBackground: true });

            const stat = fs.statSync(framePath);
            console.log(`[Puppeteer] Saved slide ${i} → ${stat.size} bytes (1080×1920)`);
        }

        await browser.close();

        // ── Use ffmpeg to stitch PNGs into an MP4 ────────────────────
        console.log(`[Puppeteer] Stitching ${totalSlides} slides into MP4 with ffmpeg...`);

        // Build a concat file for ffmpeg (each slide shown for 3.5 seconds)
        const concatLines: string[] = [];
        for (let i = 0; i < totalSlides; i++) {
            const framePath = path.join(tmpDir, `slide_${i}.png`);
            concatLines.push(`file '${framePath}'`);
            concatLines.push(`duration 3.5`);
        }
        // Repeat last frame (ffmpeg concat demuxer requirement)
        concatLines.push(`file '${path.join(tmpDir, `slide_${totalSlides - 1}.png`)}'`);

        const concatFilePath = path.join(tmpDir, 'concat.txt');
        fs.writeFileSync(concatFilePath, concatLines.join('\n'));

        // Determine if we have voice audio (ElevenLabs might fail due to Free Tier limits)
        const hasVoice = audioBuffer && audioBuffer.length > 0;
        const voiceAudioPath = path.join(tmpDir, 'voice.mp3');
        if (hasVoice) {
            fs.writeFileSync(voiceAudioPath, audioBuffer);
        }

        // Check for Background audio
        const bgAudioPath = path.join(process.cwd(), 'news-bg.wav');
        const hasBgAudio = fs.existsSync(bgAudioPath);

        // Dynamic search for AI Avators folder and any MP4 file inside it
        let anchorVideoPath = '';
        let hasAnchorVideo = false;
        const possibleDirs = [
            path.join(process.cwd(), 'public'),
            path.join(process.cwd(), '..', 'public'),
            path.join(process.cwd(), 'AI Avators'),
            path.join(process.cwd(), '..', 'AI Avators')
        ];
        
        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                // Prioritize 'anchor.mp4' if it exists, otherwise take first mp4
                const mp4File = files.find(f => f === 'anchor.mp4') || files.find(f => f.endsWith('.mp4'));
                if (mp4File) {
                    anchorVideoPath = path.join(dir, mp4File);
                    hasAnchorVideo = true;
                    console.log(`[Puppeteer] Found AI Anchor video: ${anchorVideoPath}`);
                    break;
                }
            }
        }

        const ffmpegCmdArgs = ['ffmpeg', '-y'];
        
        let inputIndex = 0;
        
        let anchorInputIdx = -1;
        if (hasAnchorVideo) {
            ffmpegCmdArgs.push('-stream_loop', '-1', '-i', `"${anchorVideoPath}"`);
            anchorInputIdx = inputIndex++;
        }

        ffmpegCmdArgs.push('-f', 'concat', '-safe', '0', '-i', concatFilePath);
        const slidesInputIdx = inputIndex++;

        let voiceInputIdx = -1;
        if (hasVoice) {
            ffmpegCmdArgs.push('-i', voiceAudioPath);
            voiceInputIdx = inputIndex++;
        }

        let bgAudioInputIdx = -1;
        if (hasBgAudio) {
            ffmpegCmdArgs.push('-stream_loop', '-1', '-i', bgAudioPath);
            bgAudioInputIdx = inputIndex++;
        }

        let filterComplex = '';
        let mapOptions = [];

        // Build Video Filter
        if (hasAnchorVideo) {
            filterComplex += `[${anchorInputIdx}:v][${slidesInputIdx}:v]overlay=x=0:y=0:shortest=1[v];`;
            mapOptions.push('-map', '[v]');
        } else {
            // No anchor video, just use slides directly (zoompan removed by user request)
            mapOptions.push('-map', `${slidesInputIdx}:v`);
        }

        // Build Audio Filter
        const audioStreams = [];
        if (hasVoice) audioStreams.push(`[${voiceInputIdx}:a]`);
        if (hasBgAudio) audioStreams.push(`[${bgAudioInputIdx}:a]`);

        if (audioStreams.length > 1) {
            filterComplex += `${audioStreams.join('')}amix=inputs=${audioStreams.length}:duration=first:dropout_transition=0[a]`;
            mapOptions.push('-map', '[a]');
        } else if (audioStreams.length === 1) {
            const streamStr = audioStreams[0].replace(/\[|\]/g, '');
            mapOptions.push('-map', streamStr);
        }

        // Remove trailing semicolon from filterComplex if present
        if (filterComplex.endsWith(';')) {
            filterComplex = filterComplex.slice(0, -1);
        }

        if (filterComplex) {
            ffmpegCmdArgs.push('-filter_complex', `"${filterComplex}"`);
        }

        ffmpegCmdArgs.push(
            ...mapOptions,
            '-c:v', 'libx264',
            '-preset', 'fast'
        );
        
        if (audioStreams.length > 0) {
            ffmpegCmdArgs.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
        }

        ffmpegCmdArgs.push('-movflags', '+faststart', outputPath);
        const ffmpegCmd = ffmpegCmdArgs.join(' ');

        console.log(`[ffmpeg] Running: ${ffmpegCmd}`);
        execSync(ffmpegCmd, { stdio: 'pipe', timeout: 60000 });

        const videoBuffer = fs.readFileSync(outputPath);
        console.log(`[Puppeteer] Video generated successfully. Size: ${videoBuffer.length} bytes`);

        if (videoBuffer.length < 1000) {
            throw new Error(`Generated video is too small (${videoBuffer.length} bytes). ffmpeg likely failed.`);
        }

        return videoBuffer;

    } catch (err) {
        console.error("[Puppeteer] Error during video generation:", err);
        throw err;
    } finally {
        await browser.close().catch(() => {});
        // Cleanup temp files
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
}
