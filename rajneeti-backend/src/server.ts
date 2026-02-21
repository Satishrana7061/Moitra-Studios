// src/server.ts
import express from "express";
import cors from "cors";
import { fetchFilteredNews } from "./rssFetcher.js";
import { processNewsWithAI } from "./aiProcessor.js";
import { RajneetiEvent } from "./types.js";
import { PORT, REFRESH_INTERVAL_MS } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

let cachedEvents: RajneetiEvent[] = [];
let lastRefresh: string | null = null;

// Candidate list for the AI prompt
const CANDIDATE_LIST_TEXT = `
- Narendra Modi, BJP, National (stateCode: DL)
- Rahul Gandhi, Congress, National (stateCode: UP)
- Amit Shah, BJP, National (stateCode: DL)
- Arvind Kejriwal, AAP, Delhi (stateCode: DL)
- Mamata Banerjee, TMC, West Bengal (stateCode: WB)
- Yogi Adityanath, BJP, Uttar Pradesh (stateCode: UP)
- M.K. Stalin, DMK, Tamil Nadu (stateCode: TN)
- Nitish Kumar, JDU, Bihar (stateCode: BR)
- Akhilesh Yadav, SP, Uttar Pradesh (stateCode: UP)
- Uddhav Thackeray, Shiv Sena (UBT), Maharashtra (stateCode: MH)
- Mallikarjun Kharge, Congress, National (stateCode: KA)
- Nirmala Sitharaman, BJP, National (stateCode: TN)
- Rajnath Singh, BJP, National (stateCode: UP)
- Smriti Irani, BJP, Uttar Pradesh (stateCode: UP)
- Mayawati, BSP, Uttar Pradesh (stateCode: UP)
- Lalu Prasad Yadav, RJD, Bihar (stateCode: BR)
- Tejaswi Yadav, RJD, Bihar (stateCode: BR)
- Bhagwant Mann, AAP, Punjab (stateCode: PB)
- Pinarayi Vijayan, CPI(M), Kerala (stateCode: KL)
- N. Chandrababu Naidu, TDP, Andhra Pradesh (stateCode: AP)
- Prashant Kishor, Jan Suraaj, Bihar (stateCode: BR)
- Priyanka Gandhi, Congress, Uttar Pradesh (stateCode: UP)

FALLBACK RULES:
1. If news is about a state but NO specific candidate above is involved, attribute to:
   - "National Front" (for BJP/NDA news)
   - "Regional Front" (for Opposition/Regional news like TMC, DMK, SP, etc.)
2. NEVER attribute news to journalists, authors, or news organizations.
`;

// ── Refresh Logic ───────────────────────────────────────────────
async function refreshEvents() {
    try {
        console.log("\n🔄 Refreshing news feed...");
        const rawNews = await fetchFilteredNews();
        console.log(`  📰 Fetched ${rawNews.length} raw articles (after filtering)`);

        if (rawNews.length === 0) {
            console.log("  ⚠️  No articles passed filters, keeping cached events.");
            return;
        }

        const events = await processNewsWithAI(rawNews, CANDIDATE_LIST_TEXT);

        if (events.length > 0) {
            // Merge new events on top, keep max 50
            const mergedIds = new Set(events.map((e) => e.id));
            const oldUnseen = cachedEvents.filter((e) => !mergedIds.has(e.id));
            cachedEvents = [...events, ...oldUnseen].slice(0, 50);
        }

        lastRefresh = new Date().toISOString();
        console.log(
            `  ✅ Done — ${events.length} new events, ${cachedEvents.length} total cached`
        );
    } catch (err) {
        console.error("❌ Failed to refresh events:", err);
    }
}

// ── API Endpoints ───────────────────────────────────────────────
app.get("/api/rajneeti-events", (_req, res) => {
    res.json({
        events: cachedEvents,
        lastRefresh,
        count: cachedEvents.length,
    });
});

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        events: cachedEvents.length,
        lastRefresh,
    });
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🏛️  Rajneeti backend listening on http://localhost:${PORT}`);
    console.log(`   Refresh interval: ${REFRESH_INTERVAL_MS / 60000} minutes\n`);

    // Initial fetch
    await refreshEvents();

    // Schedule periodic refreshes
    setInterval(refreshEvents, REFRESH_INTERVAL_MS);
});
