import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function generateHeadlessVideo(campaignSlug: string, audioBuffer: Buffer): Promise<Buffer> {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const encodedTitle = encodeURIComponent(process.env.NEWS_TITLE || 'Rajneeti Update');
    const encodedSummary = encodeURIComponent(process.env.NEWS_SUMMARY || 'Latest political news from Rajneeti Network TV.');

    const targetUrl = `${FRONTEND_URL}/#/headless-reel/${campaignSlug}?title=${encodedTitle}&summary=${encodedSummary}`;

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

        // Render each slide and export the canvas at full resolution
        for (let i = 0; i < totalSlides; i++) {
            console.log(`[Puppeteer] Rendering slide ${i + 1}/${totalSlides}...`);

            // Render the slide and export the canvas as a PNG data URL
            const dataUrl = await page.evaluate((idx: number) => {
                try {
                    (window as any).renderSlide(idx);
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return null;
                    return canvas.toDataURL('image/png');
                } catch (err) {
                    console.error(`renderSlide(${idx}) failed:`, err);
                    return null;
                }
            }, i);

            if (!dataUrl) {
                throw new Error(`renderSlide(${i}) failed or canvas not found`);
            }

            // Convert the data URL to a PNG file
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            const framePath = path.join(tmpDir, `slide_${i}.png`);
            fs.writeFileSync(framePath, Buffer.from(base64Data, 'base64'));

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

        // Build ffmpeg command
        const ffmpegCmd = [
            'ffmpeg', '-y',
            '-f', 'concat', '-safe', '0',
            '-i', concatFilePath,
            '-vf', 'scale=1080:1920,format=yuv420p',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-r', '30',
            '-movflags', '+faststart',
            outputPath
        ].join(' ');

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
