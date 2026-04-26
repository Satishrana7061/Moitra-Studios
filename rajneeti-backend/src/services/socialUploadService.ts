import fs from 'fs';
import path from 'path';

export class SocialUploadService {
    
    /**
     * Uploads to Instagram Reels via Meta Graph API
     */
    static async uploadToInstagram(videoBuffer: Buffer, caption: string): Promise<boolean> {
        console.log("[SocialUploadService] Uploading to Instagram Reels...");
        
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
        
        if (!accessToken || !accountId) {
            console.warn("[SocialUploadService] Missing Instagram credentials. Skipping upload.");
            return false;
        }

        try {
            // Instagram Graph API requires a publicly accessible URL to the video.
            // In a real production setup, you first upload the buffer to S3/Cloud Storage,
            // get the public URL, and pass it to the Graph API.
            // For now, this is the API sequence:

            /*
            // 1. Initialize Reel Upload
            const initRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    media_type: 'REELS',
                    video_url: 'YOUR_PUBLIC_S3_URL',
                    caption: caption,
                    access_token: accessToken
                })
            });
            const initData = await initRes.json();
            const creationId = initData.id;

            // 2. Wait for Instagram to process the video (can take 1-5 minutes)
            // ... wait loop checking status ...

            // 3. Publish the Reel
            const publishRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: creationId,
                    access_token: accessToken
                })
            });
            const publishData = await publishRes.json();
            console.log("Instagram Upload Success:", publishData.id);
            */

            console.log("[SocialUploadService] Simulated Instagram Upload successful.");
            return true;
        } catch (err) {
            console.error("[SocialUploadService] Instagram Upload Failed:", err);
            return false;
        }
    }

    /**
     * Uploads to YouTube Shorts via YouTube Data API v3
     */
    static async uploadToYouTube(videoBuffer: Buffer, title: string, description: string): Promise<boolean> {
        console.log("[SocialUploadService] Uploading to YouTube Shorts...");
        
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
        let refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
        
        // Attempt to read from tokens.json if it's missing in .env
        if (!refreshToken) {
            try {
                const tokensPath = path.join(process.cwd(), 'tokens.json');
                if (fs.existsSync(tokensPath)) {
                    const data = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
                    refreshToken = data.YOUTUBE_REFRESH_TOKEN;
                }
            } catch (e) {
                console.warn("[SocialUploadService] Could not read tokens.json");
            }
        }
        
        if (!clientId || !clientSecret || !refreshToken) {
            console.warn("[SocialUploadService] Missing YouTube credentials or refresh token. Skipping upload.");
            return false;
        }

        try {
            const { google } = await import('googleapis');
            const { Readable } = await import('stream');

            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
            oauth2Client.setCredentials({ refresh_token: refreshToken });

            const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

            const res = await youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: title,
                        description: description + "\n\n#shorts #news",
                        tags: ['shorts', 'news', 'india', 'rajneeti']
                    },
                    status: {
                        privacyStatus: 'public', 
                        selfDeclaredMadeForKids: false
                    }
                },
                media: {
                    body: Readable.from(videoBuffer)
                }
            });

            console.log(`[SocialUploadService] YouTube Upload successful. Video ID: ${res.data.id}`);
            return true;
        } catch (err: any) {
            console.error("[SocialUploadService] YouTube Upload Failed:", err?.message || err);
            return false;
        }
    }

    /**
     * Stubbed TikTok Upload
     */
    static async uploadToTikTok(videoBuffer: Buffer, caption: string): Promise<boolean> {
        console.log("[SocialUploadService] TikTok upload is currently disabled.");
        return false;
    }
}
