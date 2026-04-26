import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export async function generateHeadlessVideo(campaignSlug: string, audioBuffer: Buffer): Promise<Buffer> {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const targetUrl = `${FRONTEND_URL}/headless-reel/${campaignSlug}`;
    
    console.log(`[Puppeteer] Launching headless browser...`);
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream', // Allow audio mixing
            '--autoplay-policy=no-user-gesture-required' // Allow audio to play
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Pass console logs to Node context for debugging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        console.log(`[Puppeteer] Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        console.log(`[Puppeteer] Waiting for page to be ready...`);
        await page.waitForFunction(() => {
            const statusEl = document.getElementById('status');
            return statusEl && statusEl.innerText === 'ready';
        }, { timeout: 30000 });

        // Convert audio buffer to Data URI
        const audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;

        console.log(`[Puppeteer] Triggering generateReelBase64...`);
        const base64Video = await page.evaluate(async (audioData) => {
            try {
                // @ts-ignore
                return await window.generateReelBase64(audioData);
            } catch (err) {
                console.error("Reel generation failed inside page:", err);
                return null;
            }
        }, audioDataUri);

        if (!base64Video) {
            throw new Error("Video generation returned null");
        }

        console.log(`[Puppeteer] Video generation complete. Processing blob...`);
        // Remove 'data:video/mp4;base64,' prefix
        const base64Data = (base64Video as string).replace(/^data:video\/[a-z]+;base64,/, "");
        const videoBuffer = Buffer.from(base64Data, 'base64');

        return videoBuffer;
    } catch (err) {
        console.error("[Puppeteer] Error during video generation:", err);
        throw err;
    } finally {
        await browser.close();
    }
}
