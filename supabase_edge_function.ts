// =============================================================
// Supabase Edge Function: generate-current-campaigns
// =============================================================
// WHERE TO DEPLOY:
//   Supabase Dashboard → Edge Functions → Via Editor → Open Editor
//   Name: generate-current-campaigns
//   Paste this entire file → Deploy
// =============================================================
// COLUMN MAPPING (matches Perplexity-created schema):
//   campaigns: issue_category, issue_bullets (JSONB), status (draft/live/archived)
//   leader_approaches: display_position, policy_bullets (JSONB), framing_type
//   votes: anonymous_session_id, selected_option
//   topic_vote_rounds (not topic_rounds)
//   topic_options: one_line_summary, votes_count
// =============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- CONFIGURATION ----
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const RSS_FEEDS = [
  "https://news.google.com/rss/search?q=India+political+issue&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=India+economy+inflation+unemployment&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=India+government+policy+Modi+Rahul&hl=en-IN&gl=IN&ceid=IN:en",
];

const ISSUE_CATEGORIES = [
  "Economy", "Governance", "Foreign Policy", "Social Welfare",
  "Environment", "Technology", "Security", "Agriculture",
  "Healthcare", "Education", "Infrastructure", "Law & Order"
];

const CAMPAIGN_DURATION_DAYS = 5;

// ---- SUPABASE CLIENT (Service Role = Full Access) ----
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- MAIN HANDLER ----
serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "generate";

    console.log(`[Campaign Bot] Starting run in mode: ${mode}`);

    // Step 0: Auto-close expired campaigns
    await autoCloseExpiredCampaigns();

    // Step 1: Create a run log entry
    const runId = await createRunLog(mode === "scan_only" ? "scan" : "generate");

    // Step 2: Fetch fresh headlines from RSS
    const headlines = await fetchRSSHeadlines();
    if (headlines.length === 0) {
      await updateRunLog(runId, "completed", 0, false, null, "No headlines fetched from RSS");
      return jsonResponse({ status: "no_headlines", run_id: runId });
    }

    // Step 3: Score and rank the issues using AI
    const scoredIssues = await scoreIssues(headlines, runId);

    // Step 4: Check for duplicates against recent campaigns
    const topIssue = await findBestUncoveredIssue(scoredIssues);
    if (!topIssue) {
      await updateRunLog(runId, "completed", scoredIssues.length, false, null, "All top issues already covered recently");
      return jsonResponse({ status: "all_covered", run_id: runId, issues_scanned: scoredIssues.length });
    }

    // Step 5: If scan_only mode, stop here
    if (mode === "scan_only") {
      await updateRunLog(runId, "completed", scoredIssues.length, false);
      return jsonResponse({ status: "scan_complete", run_id: runId, top_issue: topIssue.headline, score: topIssue.composite_score });
    }

    // Step 6: Generate the full campaign using GPT
    const startTime = Date.now();
    const campaignData = await generateCampaignWithAI(topIssue);
    const generationTimeMs = Date.now() - startTime;

    if (!campaignData) {
      await updateRunLog(runId, "failed", scoredIssues.length, false, null, "AI generation returned null");
      return jsonResponse({ status: "generation_failed", run_id: runId }, 500);
    }

    // Step 7: Moderation check
    const moderationResult = moderateContent(campaignData);
    if (!moderationResult.passed) {
      await logGeneration(runId, null, campaignData, moderationResult, generationTimeMs);
      await updateRunLog(runId, "completed", scoredIssues.length, false, null, `Moderation failed: ${moderationResult.flags.join(", ")}`);
      return jsonResponse({ status: "moderation_rejected", flags: moderationResult.flags, run_id: runId });
    }

    // Step 8: Insert campaign into database
    const campaignId = await insertCampaign(campaignData, topIssue);
    if (!campaignId) {
      await updateRunLog(runId, "failed", scoredIssues.length, false, null, "Database insert failed");
      return jsonResponse({ status: "insert_failed", run_id: runId }, 500);
    }

    // Step 9: Mark the issue candidate as promoted
    await supabase.from("issue_candidates").update({ promoted_to_campaign: true }).eq("id", topIssue.id);

    // Step 10: Log the generation
    await logGeneration(runId, campaignId, campaignData, moderationResult, generationTimeMs);

    // Step 11: Mark run as completed
    await updateRunLog(runId, "completed", scoredIssues.length, true, campaignId);

    console.log(`[Campaign Bot] Successfully generated campaign: ${campaignData.slug}`);
    return jsonResponse({ status: "campaign_created", campaign_id: campaignId, slug: campaignData.slug, run_id: runId });

  } catch (err) {
    console.error("[Campaign Bot] Fatal error:", err.message);
    return jsonResponse({ error: err.message }, 500);
  }
});

// =============================================================
// RSS FETCHING
// =============================================================

interface RSSHeadline {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  source: string;
}

async function fetchRSSHeadlines(): Promise<RSSHeadline[]> {
  const allHeadlines: RSSHeadline[] = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl);
      const xml = await res.text();
      const items = parseRSSItems(xml);
      allHeadlines.push(...items);
    } catch (e) {
      console.warn(`[RSS] Failed to fetch ${feedUrl}: ${e.message}`);
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const unique = allHeadlines.filter((h) => {
    const key = h.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[RSS] Fetched ${allHeadlines.length} total, ${unique.length} unique headlines`);
  return unique.slice(0, 15);
}

function parseRSSItems(xml: string): RSSHeadline[] {
  const items: RSSHeadline[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const description = extractTag(itemXml, "description");
    const pubDate = extractTag(itemXml, "pubDate");
    const source = extractTag(itemXml, "source");

    if (title) {
      items.push({
        title: decodeHTMLEntities(title),
        summary: description ? decodeHTMLEntities(description) : "",
        link: link || "",
        pubDate: pubDate || new Date().toISOString(),
        source: source || "Google News",
      });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`);
  const m = xml.match(regex);
  return m ? (m[1] || m[2] || "").trim() : "";
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

// =============================================================
// ISSUE SCORING (via GPT)
// =============================================================

interface ScoredIssue {
  id?: string;
  headline: string;
  summary: string;
  source_url: string;
  source_name: string;
  category: string;
  region: string;
  recency_score: number;
  reach_score: number;
  civic_relevance_score: number;
  composite_score: number;
  already_covered: boolean;
}

async function scoreIssues(headlines: RSSHeadline[], runId: string): Promise<ScoredIssue[]> {
  const prompt = `You are a political news analyst for India.
Given these ${headlines.length} headlines, score each one for a "Social Campaign" feature where citizens compare Modi vs Rahul approaches.

Headlines:
${headlines.map((h, i) => `${i + 1}. "${h.title}" (Source: ${h.source})`).join("\n")}

For each headline, output a JSON array. Each element:
{
  "index": <number>,
  "category": "<one of: ${ISSUE_CATEGORIES.join(", ")}>",
  "region": "<national or state:StateName>",
  "recency_score": <0.0-1.0>,
  "reach_score": <0.0-1.0>,
  "civic_relevance_score": <0.0-1.0>
}

Rules:
- recency_score: How recent and urgent is this?
- reach_score: How many people does this affect?
- civic_relevance_score: How relevant for a citizen-facing policy comparison?
- Skip entertainment, sports, or celebrity gossip (give all scores 0)

Output ONLY a valid JSON array, nothing else.`;

  const scores = await callGPT(prompt, 0.3);
  if (!scores) return [];

  let parsed: any[];
  try {
    parsed = JSON.parse(scores);
  } catch {
    console.error("[Score] Failed to parse GPT scoring response");
    return [];
  }

  const results: ScoredIssue[] = [];
  for (const s of parsed) {
    const h = headlines[s.index - 1];
    if (!h) continue;
    const composite = 0.4 * s.recency_score + 0.3 * s.reach_score + 0.3 * s.civic_relevance_score;

    const issue: ScoredIssue = {
      headline: h.title,
      summary: h.summary,
      source_url: h.link,
      source_name: h.source,
      category: s.category || "Governance",
      region: s.region || "national",
      recency_score: s.recency_score,
      reach_score: s.reach_score,
      civic_relevance_score: s.civic_relevance_score,
      composite_score: Math.round(composite * 100) / 100,
      already_covered: false,
    };

    const { data } = await supabase.from("issue_candidates").insert({
      run_id: runId, ...issue,
    }).select("id").single();

    if (data) issue.id = data.id;
    results.push(issue);
  }

  return results.sort((a, b) => b.composite_score - a.composite_score);
}

// =============================================================
// DUPLICATE DETECTION
// =============================================================

async function findBestUncoveredIssue(issues: ScoredIssue[]): Promise<ScoredIssue | null> {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentCampaigns } = await supabase
    .from("campaigns")
    .select("title, issue_category")
    .gte("created_at", fiveDaysAgo);

  const recentTitles = (recentCampaigns || []).map((c: any) => c.title.toLowerCase());

  for (const issue of issues) {
    if (issue.composite_score < 0.4) continue;

    const isOverlapping = recentTitles.some((t: string) => {
      const words = issue.headline.toLowerCase().split(" ");
      const matchCount = words.filter((w) => t.includes(w)).length;
      return matchCount / words.length > 0.5;
    });

    if (isOverlapping) {
      await supabase.from("issue_candidates").update({ already_covered: true }).eq("id", issue.id);
      continue;
    }

    return issue;
  }

  return null;
}

// =============================================================
// AI CAMPAIGN GENERATION
// =============================================================

interface GeneratedCampaign {
  slug: string;
  title: string;
  subtitle: string;
  issue_category: string;
  issue_summary: string;
  issue_bullets: string[];
  framing_type: string;
  confidence_score: number;
  source_links: string[];
  approaches: {
    leader_name: string;
    display_position: number;
    policy_bullets: string[];
    framing_type: string;
  }[];
}

async function generateCampaignWithAI(issue: ScoredIssue): Promise<GeneratedCampaign | null> {
  const prompt = `You are a neutral political analyst creating a "Social Campaign" for the Rajneeti app.
This campaign lets Indian citizens compare the Modi government's approach vs. a hypothetical Rahul Gandhi/Congress approach.

ISSUE TO ANALYZE:
- Headline: "${issue.headline}"
- Category: ${issue.category}
- Region: ${issue.region}
- Source: ${issue.source_name}
- Summary: ${issue.summary}

CONTENT RULES (STRICT):
1. Use a neutral, analytical tone throughout
2. Clearly separate "current government approach" from "alternative opposition approach"
3. If evidence is weak for any claim, explicitly say "Evidence is limited" or "This is speculative"
4. Do NOT invent statistics or quote fabricated data
5. Do NOT claim any policy succeeded or failed unless the source material supports it
6. Do NOT use defamatory, communal, or incendiary language
7. Do NOT create one-sided praise or attack content
8. Both sides must have substantive, fair policy points

OUTPUT (STRICT JSON, no markdown):
{
  "slug": "<url-friendly-slug>",
  "title": "<compelling but neutral headline, max 80 chars>",
  "subtitle": "<analytical tagline, max 120 chars>",
  "issue_category": "${issue.category}",
  "issue_summary": "<2-paragraph neutral summary of the crisis/issue, 150-250 words>",
  "issue_bullets": ["<3-4 key facts about the problem>"],
  "framing_type": "<neutral|comparative|analytical>",
  "confidence_score": <0.0-1.0, how confident you are in the accuracy>,
  "source_links": ["<original article URLs if available>"],
  "approaches": [
    {
      "leader_name": "Narendra Modi",
      "display_position": 1,
      "policy_bullets": ["<4 substantive policy points based on actual government actions or stated positions>"],
      "framing_type": "current_government"
    },
    {
      "leader_name": "Rahul Gandhi",
      "display_position": 2,
      "policy_bullets": ["<4 substantive policy points based on Congress manifesto, public statements, or historical positions>"],
      "framing_type": "opposition_alternative"
    }
  ]
}`;

  const response = await callGPT(prompt, 0.5);
  if (!response) return null;

  try {
    return JSON.parse(response.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) {
    console.error("[Generate] Failed to parse AI campaign response:", e.message);
    return null;
  }
}

// =============================================================
// MODERATION
// =============================================================

interface ModerationResult {
  passed: boolean;
  flags: string[];
}

function moderateContent(campaign: GeneratedCampaign): ModerationResult {
  const flags: string[] = [];

  if (campaign.confidence_score < 0.6) {
    flags.push("LOW_CONFIDENCE");
  }

  const fullText = JSON.stringify(campaign).toLowerCase();
  const bannedPhrases = [
    "anti-national", "traitor", "terrorist", "communal riot",
    "hindu rashtra", "destroy india", "enemy of the state",
    "jihadist", "urban naxal", "tukde tukde"
  ];
  for (const phrase of bannedPhrases) {
    if (fullText.includes(phrase)) {
      flags.push(`BANNED_PHRASE:${phrase}`);
    }
  }

  const statPatterns = /\d{2,3}%\s+(increase|decrease|growth|decline)/gi;
  if (statPatterns.test(fullText) && campaign.source_links.length === 0) {
    flags.push("UNVERIFIED_STATISTICS");
  }

  const modiBullets = campaign.approaches.find(a => a.display_position === 1)?.policy_bullets.length || 0;
  const rahulBullets = campaign.approaches.find(a => a.display_position === 2)?.policy_bullets.length || 0;
  if (Math.abs(modiBullets - rahulBullets) > 2) {
    flags.push("UNBALANCED_CONTENT");
  }

  if (!campaign.title || !campaign.issue_summary || campaign.approaches.length < 2) {
    flags.push("INCOMPLETE_STRUCTURE");
  }

  return { passed: flags.length === 0, flags };
}

// =============================================================
// DATABASE OPERATIONS (matches Perplexity schema exactly)
// =============================================================

async function insertCampaign(campaign: GeneratedCampaign, issue: ScoredIssue): Promise<string | null> {
  const now = new Date();
  const endTime = new Date(now.getTime() + CAMPAIGN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.from("campaigns").insert({
    slug: campaign.slug,
    title: campaign.title,
    subtitle: campaign.subtitle,
    issue_category: campaign.issue_category,    // Perplexity column name
    issue_summary: campaign.issue_summary,
    issue_bullets: campaign.issue_bullets,       // JSONB array
    status: "live",
    start_time: now.toISOString(),
    end_time: endTime,
    confidence_score: campaign.confidence_score,
    region: issue.region,
    source_metadata: { sources: campaign.source_links, original_headline: issue.headline },
  }).select("id").single();

  if (error || !data) {
    console.error("[DB] Campaign insert failed:", error?.message);
    return null;
  }

  const campaignId = data.id;

  // Insert leader approaches (Perplexity column names)
  for (const app of campaign.approaches) {
    await supabase.from("leader_approaches").insert({
      campaign_id: campaignId,
      leader_name: app.leader_name,
      display_position: app.display_position,   // Perplexity column
      policy_bullets: app.policy_bullets,        // JSONB array
      framing_type: app.framing_type,            // Perplexity column
    });
  }

  // Insert source articles
  for (const url of campaign.source_links) {
    await supabase.from("source_articles").insert({
      campaign_id: campaignId,
      title: issue.headline,
      url: url,
      source_name: issue.source_name,
    });
  }

  return campaignId;
}

async function autoCloseExpiredCampaigns() {
  const { data } = await supabase
    .from("campaigns")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("status", "live")
    .lt("end_time", new Date().toISOString())
    .select("id");

  if (data && data.length > 0) {
    console.log(`[Lifecycle] Auto-closed ${data.length} expired campaign(s)`);
  }
}

// =============================================================
// LOGGING & RUN MANAGEMENT
// =============================================================

async function createRunLog(runType: string): Promise<string> {
  const { data } = await supabase.from("issue_ingestion_runs").insert({
    run_type: runType, status: "started",
  }).select("id").single();
  return data?.id || "unknown";
}

async function updateRunLog(
  runId: string, status: string, issuesFound: number,
  campaignGenerated: boolean, campaignId?: string | null, errorMessage?: string
) {
  await supabase.from("issue_ingestion_runs").update({
    status, issues_found: issuesFound, campaign_generated: campaignGenerated,
    campaign_id: campaignId || null, error_message: errorMessage || null,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);
}

async function logGeneration(
  runId: string, campaignId: string | null,
  campaign: GeneratedCampaign, moderation: ModerationResult, timeMs: number
) {
  await supabase.from("campaign_generation_logs").insert({
    run_id: runId, campaign_id: campaignId,
    model_used: "gpt-4o", confidence_score: campaign.confidence_score,
    moderation_passed: moderation.passed, moderation_flags: moderation.flags,
    raw_response_preview: JSON.stringify(campaign).substring(0, 500),
    generation_time_ms: timeMs,
  });
}

// =============================================================
// GPT API CALLER
// =============================================================

async function callGPT(prompt: string, temperature = 0.5): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a neutral Indian political analyst. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("[GPT] API call failed:", e.message);
    return null;
  }
}

// =============================================================
// HELPER
// =============================================================

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
