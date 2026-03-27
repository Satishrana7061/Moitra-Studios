// services/newsService.ts
import { RAJNEETI_EVENTS } from "../components/RajneetiMockData";

export interface BreakingNewsEvent {
    id: string;
    stateCode: string;
    stateName: string;
    politicianName: string;
    partyName: string;
    delta: number;
    sentiment: "positive" | "negative" | "neutral";
    summary: string;
    blogTitle?: string;
    mainPhrase: string;
    shareUrl: string;
    createdAt: string;
}

const API_BASE = "http://localhost:4000";

/**
 * Fetch breaking news from the backend.
 * Falls back to mock data if the backend is unreachable.
 */
export async function fetchBreakingNews(): Promise<BreakingNewsEvent[]> {
    let dailyNewsEvents: BreakingNewsEvent[] = [];
    try {
        const paths = [
            `${import.meta.env.BASE_URL}daily_news.json`, 
            '/Moitra-Studios/daily_news.json',
            '/daily_news.json',
            './daily_news.json'
        ];
        for (const path of paths) {
            try {
                const dnRes = await fetch(path);
                if (dnRes.ok) {
                    const rawData = await dnRes.json();
                    const dataArray = Array.isArray(rawData) ? rawData : [rawData];

                    dailyNewsEvents = dataArray.map((data: any, idx: number) => {
                        const deltaVal = parseFloat(data.sentiment_score || "0");
                        return {
                            id: `daily_news_auto_${idx}`,
                            stateCode: (data.state || "NA").slice(0, 2).toUpperCase(),
                            stateName: data.state || "National",
                            politicianName: data.leader || "Unknown",
                            partyName: 'Unknown',
                            delta: deltaVal,
                            sentiment: deltaVal >= 0 ? "positive" : "negative",
                            summary: data.ticker_headline || "Political Update",
                            blogTitle: data.blog_title || "News Update",
                            mainPhrase: (data.ticker_headline || "Political Update").slice(0, 20) + "...",
                            shareUrl: data.original_url || '',
                            createdAt: data.date || new Date().toISOString(),
                        };
                    });
                    break;
                }
            } catch (err) {}
        }
    } catch (err) {
        console.warn("Could not fetch daily news for ticker", err);
    }

    if (dailyNewsEvents.length > 0) {
        return dailyNewsEvents;
    }

    let backendEvents: BreakingNewsEvent[] = [];
    try {
        // Only try this if daily_news.json failed (prevents hanging in prod)
        const res = await fetch(`${API_BASE}/api/rajneeti-events`, {
            signal: AbortSignal.timeout(3000), // Reduced timeout to prevent long hangs
        });

        if (res.ok) {
            const data = await res.json();
            if (data.events && data.events.length > 0) {
                backendEvents = data.events.map((ev: any) => ({
                    id: ev.id,
                    stateCode: ev.stateCode,
                    stateName: ev.stateName,
                    politicianName: ev.politicianName,
                    partyName: ev.partyName,
                    delta: ev.delta,
                    sentiment: ev.sentiment,
                    summary: ev.summary,
                    mainPhrase: ev.mainPhrase || (ev.summary?.slice(0, 20) + "..."),
                    shareUrl: ev.shareUrl,
                    createdAt: ev.createdAt || new Date().toISOString(),
                }));
            }
        }
    } catch (err) {
        console.warn("Breaking news API unreachable, tracking back to local data", err);
    }

    if (backendEvents.length > 0) {
        return backendEvents;
    }

    // Fallback: convert mock data to BreakingNewsEvent[]
    const fallbackEvents = RAJNEETI_EVENTS.map((ev) => ({
        id: ev.id,
        stateCode: ev.stateCode,
        stateName: ev.stateName,
        politicianName: ev.politicianName,
        partyName: ev.partyName,
        delta: ev.delta,
        sentiment: ev.sentiment as "positive" | "negative" | "neutral",
        summary: ev.summary,
        mainPhrase: ev.mainPhrase || (ev.summary?.slice(0, 20) + "..."),
        shareUrl: ev.shareUrl,
        createdAt: new Date().toISOString(),
    }));

    return fallbackEvents;
}
