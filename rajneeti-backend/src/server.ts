// src/server.ts
import express from "express";
import cors from "cors";
import { fetchFilteredNews } from "./rssFetcher";
import { processNewsWithAI } from "./aiProcessor";
import { RajneetiEvent } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

let cachedEvents: RajneetiEvent[] = [];

// In a real project, load this from a JSON file or DB:
const CANDIDATE_LIST_TEXT = `
- Arjun Deshmukh, Congress, Maharashtra (stateCode: MH)
- Sanjay Verma, Govt Bloc, Uttar Pradesh (stateCode: UP)
- Neha Kapoor, Alliance, Delhi (stateCode: DL)
- Ritu Ghosh, Regional Front, West Bengal (stateCode: WB)
`;

// Simple refresh function – later you can call this on a schedule (cron).
async function refreshEvents() {
    try {
        const rawNews = await fetchFilteredNews();
        const events = await processNewsWithAI(rawNews, CANDIDATE_LIST_TEXT);
        // keep only latest 50 for UI
        cachedEvents = events.slice(0, 50);
        console.log("Refreshed events:", cachedEvents.length);
    } catch (err) {
        console.error("Failed to refresh events", err);
    }
}

// Endpoint for frontend
app.get("/api/rajneeti-events", (req, res) => {
    res.json({ events: cachedEvents });
});

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ ok: true, events: cachedEvents.length });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
    console.log(`Rajneeti backend listening on port ${PORT}`);
    await refreshEvents();
    // TODO: in production, set an interval or cron to call refreshEvents()
});
