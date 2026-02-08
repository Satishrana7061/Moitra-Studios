// src/aiProcessor.ts
import { RawNewsItem, RajneetiEvent } from "./types";

// You will replace this with an actual HTTP call using your chosen AI provider.
async function callAIModel(prompt: string): Promise<string> {
  // Antigravity / your agent will implement this later, e.g.:
  //  - Perplexity Sonar API
  //  - Gemini API
  //  - OpenAI API
  // For now, throw so we don't accidentally run in prod.
  throw new Error("callAIModel() not implemented yet");
}

// This is the core prompt you can reuse with any LLM.
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
2. Assign an impact score "delta" from -5 to +5 (integers only). Positive means a boost, negative means a loss.
3. Set sentiment: "positive", "negative", or "neutral".
4. Write a short neutral summary (max 2 sentences) explaining the in-game effect in plain language.
5. Propose a short kebab-case slug for a shareable URL.

OUTPUT:
Respond with STRICT JSON ONLY, no extra text, in exactly one of these forms:

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
  "slug": "maharashtra-example-party-campus-reforms-plus-4"
}
  `.trim();
}

export async function processNewsWithAI(
  items: RawNewsItem[],
  candidateList: string
): Promise<RajneetiEvent[]> {
  const events: RajneetiEvent[] = [];

  for (const news of items) {
    const prompt = buildRajneetiPrompt(news, candidateList);

    // When Antigravity wires this, it will call your chosen AI API here
    const raw = await callAIModel(prompt);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse AI JSON", err, raw);
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

    const event: RajneetiEvent = {
      id,
      stateCode: parsed.stateCode,
      stateName: parsed.stateName,
      politicianName: parsed.politicianName,
      partyName: parsed.partyName,
      delta: parsed.delta,
      sentiment: parsed.sentiment,
      summary: parsed.summary,
      shareUrl: `/rajneeti/${parsed.stateCode.toLowerCase()}/${parsed.slug}`,
    };

    events.push(event);
  }

  return events;
}
