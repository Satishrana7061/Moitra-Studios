import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function getPlaylists() {
    console.log("Fetching YouTube playlists...");
    
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    let refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    
    if (!refreshToken) {
        const tokensPath = path.join(process.cwd(), 'tokens.json');
        if (fs.existsSync(tokensPath)) {
            const data = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
            refreshToken = data.YOUTUBE_REFRESH_TOKEN;
        }
    }

    if (!clientId || !clientSecret || !refreshToken) {
        console.error("Missing credentials.");
        return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    try {
        const res = await youtube.playlists.list({
            part: ['snippet'],
            mine: true,
            maxResults: 50
        });

        const playlists = res.data.items || [];
        if (playlists.length === 0) {
            console.log("No playlists found.");
            return;
        }

        console.log("Found Playlists:");
        playlists.forEach(p => {
            console.log(`- ${p.snippet?.title}: ${p.id}`);
        });

    } catch (err: any) {
        console.error("Error:", err.message);
    }
}

getPlaylists();
