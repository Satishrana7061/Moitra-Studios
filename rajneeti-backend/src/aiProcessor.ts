// src/aiProcessor.ts
import { GEMINI_API_KEY } from "./config.js";
import { RawNewsItem, RajneetiEvent } from "./types.js";

// ── Gemini API Call ─────────────────────────────────────────────
async function callAIModel(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "PLACEHOLDER_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.3, // low temp for consistent JSON
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

// ── Prompt Builder ──────────────────────────────────────────────
export function buildRajneetiPrompt(
  news: RawNewsItem,
  candidateList: string
): string {
  return `
You are an assistant for the Indian political strategy game "Rajneeti".
You will map real news to in-game impact in a safe, non-harmful way.

IMPORTANT SAFETY RULES:
- Do NOT generate or repeat hate speech, religious insults, or calls for violence.
- If the news is about extreme violence, terrorism, communal tension, or sensitive religious issues, respond with {"skip": true} JSON only.
- Keep language neutral and focused on game mechanics, not real-world advocacy.

Here is one news article:

TITLE: ${news.title}
DESCRIPTION: ${news.description}
SOURCE: ${news.link}

GAME DATA:
The game has these candidates, parties, and states:
${candidateList}

TASK:
1. Decide which ONE candidate and ONE state this article most strongly affects in the game.
   - EXTREMELY IMPORTANT: Only use names from the GAME DATA list. 
   - IGNORE journalist names, authors, and news sources (e.g. "Ritu Ghosh", "Sanjay Verma", "NDTV").
   - If a candidate is not mentioned, use "National Front" or "Regional Front" as per the FALLBACK RULES in GAME DATA.
2. Assign an impact score "delta" from -5 to +5 (integers only). Positive means a boost, negative means a loss.
3. Set sentiment: "positive", "negative", or "neutral".
4. Write a short neutral summary (max 2 sentences) explaining the in-game effect in plain language.
6. Propose a short kebab-case slug for a shareable URL.
7. Extract a punchy "mainPhrase" (3-5 words) that captures the core event (e.g., "COMMERCE HUB", "HOUSING REVIVAL", "YOUTH OUTREACH").

OUTPUT:
Respond with STRICT JSON ONLY, no extra text, no markdown fences, in exactly one of these forms:

If the news should be skipped:
{
  "skip": true
}

Otherwise:
{
  "skip": false,
  "stateCode": "MH",
  "stateName": "Maharashtra",
  "politicianName": "Example Name",
  "partyName": "Example Party",
  "delta": 4,
  "sentiment": "positive",
  "summary": "Neutral game-style explanation...",
  "slug": "maharashtra-example-party-campus-reforms-plus-4",
  "mainPhrase": "MAIN CORE EVENT"
}
  `.trim();
}

// ── Process News Items ──────────────────────────────────────────
export async function processNewsWithAI(
  items: RawNewsItem[],
  candidateList: string
): Promise<RajneetiEvent[]> {
  const events: RajneetiEvent[] = [];

  // Process up to 10 items per batch to stay within rate limits
  const batch = items.slice(0, 10);

  for (const news of batch) {
    try {
      const prompt = buildRajneetiPrompt(news, candidateList);
      const raw = await callAIModel(prompt);

      // Strip markdown fences if Gemini wraps the JSON
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI JSON:", cleaned);
        continue;
      }

      if (parsed.skip) continue;
      if (
        typeof parsed.stateCode !== "string" ||
        typeof parsed.politicianName !== "string"
      ) {
        continue;
      }

      const id = parsed.slug || `${parsed.stateCode}-${Date.now()}`;
      const delta = Math.max(-5, Math.min(5, parseInt(parsed.delta) || 0));

      const event: RajneetiEvent = {
        id,
        stateCode: parsed.stateCode,
        stateName: parsed.stateName || "Unknown",
        politicianName: parsed.politicianName,
        partyName: parsed.partyName || "Independent",
        delta,
        sentiment: parsed.sentiment || "neutral",
        summary: parsed.summary || news.title,
        mainPhrase: parsed.mainPhrase || (news.title.slice(0, 20) + "..."),
        shareUrl: `/rajneeti/${(parsed.stateCode || "in").toLowerCase()}/${id}`,
        createdAt: new Date().toISOString(),
      };

      events.push(event);
      console.log(
        `  ✅ ${event.stateName} · ${event.politicianName} · ${event.delta > 0 ? "+" : ""}${event.delta}`
      );
    } catch (err) {
      console.error(`  ❌ Error processing "${news.title}":`, err);
    }
  }

  return events;
}
