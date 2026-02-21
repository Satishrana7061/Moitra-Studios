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
    try {
        const res = await fetch(`${API_BASE}/api/rajneeti-events`, {
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data.events && data.events.length > 0) {
            return data.events.map((ev: any) => ({
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
    } catch (err) {
        console.warn("Breaking news API unreachable, using realistic fallback:", err);
    }

    // Fallback: convert mock data to BreakingNewsEvent[]
    return RAJNEETI_EVENTS.map((ev) => ({
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
        createdAt: new Date().toISOString(),
    }));
}
