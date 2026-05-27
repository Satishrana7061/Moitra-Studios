import fs from 'fs';
import path from 'path';

export class SocialUploadService {

    /**
     * Diagnoses common Meta API errors and logs actionable advice.
     */
    private static diagnoseMetaError(error: any, context: string): void {
        const code = error.code;
        const subcode = error.error_subcode;
        const msg = error.message || '';

        if (code === 190) {
            console.error(`\n🔴 [${context}] ACCESS TOKEN EXPIRED!`);
            console.error('   → Your Instagram/Facebook access token has expired.');
            console.error('   → Go to developers.facebook.com → Tools → Graph API Explorer to generate a new one.');
            console.error('   → Or re-run the /api/admin/setup-instagram endpoint with a fresh user token.\n');
        } else if (code === 10) {
            console.error(`\n🔴 [${context}] APP NOT IN LIVE MODE!`);
            console.error('   → Your Facebook App is still in Development Mode.');
            console.error('   → Go to developers.facebook.com → Your App → App Review → Permissions.');
            console.error('   → Request approval for: instagram_basic, instagram_content_publish');
            console.error('   → Then toggle the app to LIVE MODE in the top bar.\n');
        } else if (code === 100 && subcode === 2207050) {
            console.log(`[${context}] Container not ready yet (subcode 2207050). This is normal, will keep polling.`);
        } else if (code === 4) {
            console.error(`\n🔴 [${context}] RATE LIMIT HIT!`);
            console.error('   → You have exceeded the Instagram API rate limit.');
            console.error('   → Wait a few minutes before trying again.\n');
        } else if (msg.includes('permission')) {
            console.error(`\n🔴 [${context}] PERMISSION ERROR: ${msg}`);
            console.error('   → Make sure your app has instagram_content_publish permission approved.\n');
        }
    }

    /**
     * Uploads to Instagram Reels via Meta Graph API
     * Requires a publicly accessible video URL (e.g. from Supabase Storage)
     * 
     * Required permissions: instagram_basic, instagram_content_publish,
     * pages_show_list, pages_read_engagement.
     * The Facebook App must be in Live Mode (not Development Mode).
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
            // Validate video URL is accessible and not too small
            console.log("[SocialUploadService] Validating video URL...");
            const headRes = await fetch(videoUrl, { method: 'HEAD' });
            if (!headRes.ok) {
                throw new Error(`Video URL returned ${headRes.status}. URL may be expired or inaccessible.`);
            }
            const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
            if (contentLength > 0 && contentLength < 5000) {
                console.warn(`[SocialUploadService] ⚠️ Video file is very small (${contentLength} bytes). It might be invalid or corrupted.`);
            }

            const baseUrl = `https://graph.facebook.com/v21.0/${igUserId}`;

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

            const initData: any = await initRes.json();
            if (initData.error) {
                SocialUploadService.diagnoseMetaError(initData.error, 'Instagram Init');
                throw new Error(`Instagram Init Error: ${initData.error.message}`);
            }

            const creationId = initData.id;
            console.log(`[SocialUploadService] Container created: ${creationId}. Waiting for processing...`);

            // 2. Poll for status (Instagram processes videos asynchronously)
            // Wait up to 3 minutes (36 attempts * 5 seconds)
            let status = 'IN_PROGRESS';
            let attempts = 0;
            while ((status === 'IN_PROGRESS' || status === 'STARTED') && attempts < 36) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const statusRes = await fetch(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`);
                const statusData: any = await statusRes.json();
                status = statusData.status_code;
                
                console.log(`[SocialUploadService] Status check ${attempts + 1}/36: ${status}`);
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

            const publishData: any = await publishRes.json();
            if (publishData.error) {
                SocialUploadService.diagnoseMetaError(publishData.error, 'Instagram Publish');
                throw new Error(`Instagram Publish Error: ${publishData.error.message}`);
            }

            console.log(`[SocialUploadService] ✅ Instagram Upload Success! Reel ID: ${publishData.id}`);
            return true;
        } catch (err: any) {
            console.error("[SocialUploadService] Instagram Upload Failed:", err.message || err);
            return false;
        }
    }

    /**
     * Uploads to Facebook Reels via Meta Graph API
     * Requires a publicly accessible video URL
     */
    static async uploadToFacebook(videoUrl: string, caption: string): Promise<boolean> {
        console.log("[SocialUploadService] Uploading to Facebook Reels...");
        
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN; // Page Access Token
        
        if (!accessToken) {
            console.warn("[SocialUploadService] Missing Facebook credentials (INSTAGRAM_ACCESS_TOKEN). Skipping upload.");
            return false;
        }

        try {
            // 1. Get Page ID dynamically using /me
            const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`);
            const meData: any = await meRes.json();
            if (meData.error) {
                SocialUploadService.diagnoseMetaError(meData.error, 'Facebook Me');
                throw new Error(`Facebook Me Error: ${meData.error.message}`);
            }
            const pageId = meData.id;
            console.log(`[SocialUploadService] Found Facebook Page ID: ${pageId} (${meData.name})`);

            // 2. Initialize the upload
            const initRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    upload_phase: 'start',
                    access_token: accessToken
                })
            });
            const initData: any = await initRes.json();
            if (initData.error) {
                SocialUploadService.diagnoseMetaError(initData.error, 'Facebook Init');
                throw new Error(`Facebook Reels Init Error: ${initData.error.message}`);
            }
            const { video_id, upload_url } = initData;
            console.log(`[SocialUploadService] Facebook Reel initialized: ${video_id}. Uploading...`);

            // 3. Upload the video from the public URL
            const uploadRes = await fetch(upload_url, {
                method: 'POST',
                headers: {
                    'Authorization': `OAuth ${accessToken}`,
                    'file_url': videoUrl
                }
            });
            const uploadData: any = await uploadRes.json();
            if (uploadData.error) {
                throw new Error(`Facebook Reels Upload Error: ${uploadData.error.message}`);
            }
            console.log("[SocialUploadService] Video uploaded to Facebook. Publishing...");

            // 4. Publish the Reel
            const publishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    upload_phase: 'finish',
                    video_state: 'PUBLISHED',
                    description: caption,
                    video_id: video_id,
                    access_token: accessToken
                })
            });
            const publishData: any = await publishRes.json();
            if (publishData.error) {
                SocialUploadService.diagnoseMetaError(publishData.error, 'Facebook Publish');
                throw new Error(`Facebook Reels Publish Error: ${publishData.error.message}`);
            }

            console.log(`[SocialUploadService] ✅ Facebook Upload Success! Reel ID: ${video_id}`);
            return true;
        } catch (err: any) {
            console.error("[SocialUploadService] Facebook Upload Failed:", err.message || err);
            return false;
        }
    }


    /**
     * Uploads to YouTube Shorts via YouTube Data API v3
     */
    static async uploadToYouTube(videoBuffer: Buffer, title: string, description: string, tags: string[] = []): Promise<boolean> {
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
                        tags: [...new Set(['shorts', 'news', 'india', 'rajneeti', ...tags])]
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

            // Add to Playlist if configured
            const playlistId = process.env.YOUTUBE_PLAYLIST_ID;
            if (playlistId && res.data.id) {
                try {
                    console.log(`[SocialUploadService] Adding video to Playlist: ${playlistId}`);
                    await youtube.playlistItems.insert({
                        part: ['snippet'],
                        requestBody: {
                            snippet: {
                                playlistId: playlistId,
                                resourceId: {
                                    kind: 'youtube#video',
                                    videoId: res.data.id
                                }
                            }
                        }
                    });
                    console.log(`[SocialUploadService] Successfully added to playlist.`);
                } catch (playlistErr: any) {
                    console.error("[SocialUploadService] Could not add to playlist (You may need to re-authenticate with full YouTube scope):", playlistErr.message);
                }
            }

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
