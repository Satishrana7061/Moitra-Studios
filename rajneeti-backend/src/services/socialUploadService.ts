import fs from 'fs';
import path from 'path';

export class SocialUploadService {
    
    /**
     * Uploads to Instagram Reels via Meta Graph API
     * Requires a publicly accessible video URL (e.g. from Supabase Storage)
     */
    static async uploadToInstagram(videoUrl: string, caption: string): Promise<boolean> {
        console.log("[SocialUploadService] Uploading to Instagram Reels...");
        
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const igUserId = process.env.INSTAGRAM_USER_ID; // The Instagram Business Account ID
        
        if (!accessToken || !igUserId) {
            console.warn("[SocialUploadService] Missing Instagram credentials (INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID). Skipping upload.");
            return false;
        }

        try {
            const baseUrl = `https://graph.facebook.com/v19.0/${igUserId}`;

            // 1. Initialize the media container for the Reel
            console.log("[SocialUploadService] Initializing media container...");
            const initRes = await fetch(`${baseUrl}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    media_type: 'REELS',
                    video_url: videoUrl,
                    caption: caption,
                    access_token: accessToken
                })
            });

            const initData = await initRes.json();
            if (initData.error) {
                throw new Error(`Instagram Init Error: ${initData.error.message}`);
            }

            const creationId = initData.id;
            console.log(`[SocialUploadService] Container created: ${creationId}. Waiting for processing...`);

            // 2. Poll for status (Instagram processes videos asynchronously)
            // We wait up to 2 minutes (24 attempts * 5 seconds)
            let status = 'IN_PROGRESS';
            let attempts = 0;
            while ((status === 'IN_PROGRESS' || status === 'STARTED') && attempts < 24) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const statusRes = await fetch(`https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${accessToken}`);
                const statusData = await statusRes.json();
                status = statusData.status_code;
                
                console.log(`[SocialUploadService] Status check ${attempts + 1}: ${status}`);
                attempts++;
            }

            if (status !== 'FINISHED') {
                throw new Error(`Instagram processing timed out or failed with status: ${status}`);
            }

            // 3. Publish the Reel
            console.log("[SocialUploadService] Publishing the Reel...");
            const publishRes = await fetch(`${baseUrl}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: creationId,
                    access_token: accessToken
                })
            });

            const publishData = await publishRes.json();
            if (publishData.error) {
                throw new Error(`Instagram Publish Error: ${publishData.error.message}`);
            }

            console.log(`[SocialUploadService] Instagram Upload Success! Reel ID: ${publishData.id}`);
            return true;
        } catch (err: any) {
            console.error("[SocialUploadService] Instagram Upload Failed:", err.message || err);
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
