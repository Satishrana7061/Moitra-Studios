// services/newsService.ts
// ─────────────────────────────────────────────────────────────────
// Fetch priority:
//   1. Supabase news_events table (today's news — keeps project alive)
//   2. public/daily_news.json    (static file written by GitHub Actions)
//   3. Mock data fallback        (always works offline)
// ─────────────────────────────────────────────────────────────────
import { supabase } from '../lib/supabase';
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

/** Convert a raw DB/JSON news row into a BreakingNewsEvent */
function mapNewsRow(data: any, idx: number): BreakingNewsEvent {
    const deltaVal = parseFloat(data.sentiment_score || "0");
    return {
        id: data.id || `daily_news_auto_${idx}`,
        stateCode: (data.state || "NA").slice(0, 2).toUpperCase(),
        stateName: data.state || "National",
        politicianName: data.leader || "Unknown",
        partyName: "Unknown",
        delta: deltaVal,
        sentiment: deltaVal > 0 ? "positive" : deltaVal < 0 ? "negative" : "neutral",
        summary: data.ticker_headline || "Political Update",
        blogTitle: data.blog_title || "News Update",
        mainPhrase: (data.ticker_headline || "Political Update").slice(0, 20) + "...",
        shareUrl: data.original_url || "",
        createdAt: data.news_date || data.date || new Date().toISOString(),
    };
}

/**
 * Try to get today's news from the Supabase news_events table.
 * Returns null if Supabase is unavailable or has no today's news.
 */
async function fetchFromSupabase(): Promise<BreakingNewsEvent[] | null> {
    if (!supabase) return null;
    try {
        const today = new Date().toISOString().split("T")[0]; // "2026-04-04"
        const { data, error } = await supabase
            .from("news_events")
            .select("*")
            .eq("news_date", today)
            .order("created_at", { ascending: true })
            .limit(250); // 5 items × 36 states = up to 180 items/day

        if (error) throw error;
        if (data && data.length > 0) {
            console.log(`✅ News loaded from Supabase: ${data.length} items for ${today}`);
            return data.map(mapNewsRow);
        }

        // No news for today yet — try yesterday (catches runs before midnight)
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
        const { data: prev, error: prevErr } = await supabase
            .from("news_events")
            .select("*")
            .eq("news_date", yesterday)
            .order("created_at", { ascending: true })
            .limit(250);

        if (prevErr) throw prevErr;
        if (prev && prev.length > 0) {
            console.log(`✅ News loaded from Supabase (yesterday ${yesterday}): ${prev.length} items`);
            return prev.map(mapNewsRow);
        }

        return null; // Nothing in Supabase — fall through to JSON
    } catch (err) {
        console.warn("Supabase news fetch failed, falling back:", err);
        return null;
    }
}

/**
 * Try to load news from the static public/daily_news.json file.
 */
async function fetchFromJsonFile(): Promise<BreakingNewsEvent[] | null> {
    const paths = [
        `${import.meta.env.BASE_URL}daily_news.json`,
        '/daily_news.json',
        '/daily_news.json',
        './daily_news.json',
    ];
    for (const path of paths) {
        try {
            const res = await fetch(`${path}?t=${Date.now()}`);
            if (res.ok) {
                const rawData = await res.json();
                const dataArray = Array.isArray(rawData) ? rawData : [rawData];
                if (dataArray.length > 0) {
                    console.log(`✅ News loaded from JSON file: ${path}`);
                    return dataArray.map(mapNewsRow);
                }
            }
        } catch { /* try next */ }
    }
    return null;
}

/**
 * Main export — fetches breaking news with a 3-tier fallback chain.
 */
export async function fetchBreakingNews(): Promise<BreakingNewsEvent[]> {
    // Tier 1: Supabase (live, always fresh)
    const fromDb = await fetchFromSupabase();
    if (fromDb && fromDb.length > 0) return fromDb;

    // Tier 2: Static JSON file (written daily by GitHub Actions)
    const fromJson = await fetchFromJsonFile();
    if (fromJson && fromJson.length > 0) return fromJson;

    // Tier 3: Hardcoded mock data (always available as last resort)
    console.warn("⚠️ Using mock news data — Supabase and JSON both unavailable");
    return RAJNEETI_EVENTS.map((ev) => ({
        id: ev.id,
        stateCode: ev.stateCode,
        stateName: ev.stateName,
        politicianName: ev.politicianName,
        partyName: ev.partyName,
        delta: ev.delta,
        sentiment: ev.sentiment as "positive" | "negative" | "neutral",
        summary: ev.summary,
        mainPhrase: ev.mainPhrase || ev.summary?.slice(0, 20) + "...",
        shareUrl: ev.shareUrl,
        createdAt: new Date().toISOString(),
    }));
}

/**
 * Fetch news filtered by a specific Indian state name.
 * Uses case-insensitive matching to handle GeoJSON uppercase vs DB title-case.
 */
export async function fetchNewsByState(stateName: string): Promise<BreakingNewsEvent[]> {
    async function getFallback() {
        const allJson = await fetchFromJsonFile();
        if (!allJson) return [];
        return allJson.filter(ev => ev.stateName?.toLowerCase() === stateName.toLowerCase()).slice(0, 5);
    }

    if (!supabase) return getFallback();
    
    try {
        const { data, error } = await supabase
            .from("news_events")
            .select("*")
            .ilike("state", stateName)
            .order("news_date", { ascending: false })
            .limit(10);  // Up to 10 per state
            
        if (error) throw error;
        if (data && data.length > 0) return data.map(mapNewsRow);
        
        // If DB is empty for this state, deeply fallback to JSON
        return getFallback();
    } catch {
        return getFallback();
    }
}

/**
 * Fetch national-level news (state = "National").
 * Shown by default when no state is selected on the map.
 */
export async function fetchNationalNews(): Promise<BreakingNewsEvent[]> {
    async function getFallback() {
        const allJson = await fetchFromJsonFile();
        if (!allJson) return [];
        return allJson.filter(ev => ev.stateName?.toLowerCase() === 'national').slice(0, 10);
    }

    if (!supabase) return getFallback();
    
    try {
        const { data, error } = await supabase
            .from("news_events")
            .select("*")
            .ilike("state", "National")
            .order("news_date", { ascending: false })
            .limit(10);
            
        if (error) throw error;
        if (data && data.length > 0) return data.map(mapNewsRow);
        
        return getFallback();
    } catch {
        return getFallback();
    }
}
