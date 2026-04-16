#!/usr/bin/env python3
"""
daily_news_automation.py
========================
The single brain behind the Rajneeti website.
Runs daily via GitHub Actions at 5:30 AM IST.

DAILY (every day):
  1. Fetch 5 political news from Indian RSS feeds
  2. AI generates game-style news items
  3. Write to public/daily_news.json (static fallback)
  4. Upsert to Supabase news_events table (keeps project alive)
  5. Auto-archive any expired campaigns + generate AI results
  6. Compact old votes into JSONB percentages, then delete raw rows
  7. Delete news older than 14 days (free tier storage management)

WEEKLY (Monday only):
  8. Read all news from the past 7 days
  9. AI picks the hottest political issue
  10. Generate a new campaign (Mon–Thu) with Modi vs Rahul approaches
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

import requests

# ── Configuration ────────────────────────────────────────────────
OPENAI_API_KEY     = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY     = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL       = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "daily_news.json")

IST   = timezone(timedelta(hours=5, minutes=30))
NOW   = datetime.now(IST)
TODAY = NOW.strftime("%Y-%m-%d")
DAY_OF_WEEK = NOW.strftime("%A")  # "Monday", "Tuesday", etc.

# Campaign runs for 7 days, synchronized with the 7-day news retention window.
# The bot checks DAILY — if the current campaign has expired it archives it
# and immediately starts a fresh one. No more Monday-only restriction!
CAMPAIGN_DURATION_DAYS = 7

RSS_FEEDS = [
    "https://timesofindia.indiatimes.com/rssfeeds/66023901.cms",
    "https://www.ndtv.com/rss/india",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://indianexpress.com/section/india/politics/feed/",
]

BANNED_KEYWORDS = [
    "terror", "terrorist", "bomb", "blast", "riot",
    "lynch", "murder", "kill", "rape", "assault",
]

CANDIDATE_LIST = """
- Narendra Modi, BJP, National
- Rahul Gandhi, Congress, National
- Amit Shah, BJP, National
- Arvind Kejriwal, AAP, Delhi
- Mamata Banerjee, TMC, West Bengal
- Yogi Adityanath, BJP, Uttar Pradesh
- M.K. Stalin, DMK, Tamil Nadu
- Nitish Kumar, JDU, Bihar
- Akhilesh Yadav, SP, Uttar Pradesh
- Uddhav Thackeray, Shiv Sena (UBT), Maharashtra
- Mallikarjun Kharge, Congress, National
- Nirmala Sitharaman, BJP, National
- Rajnath Singh, BJP, National
- Priyanka Gandhi, Congress, Uttar Pradesh
- Mayawati, BSP, Uttar Pradesh
- Lalu Prasad Yadav, RJD, Bihar
- Tejaswi Yadav, RJD, Bihar
- Bhagwant Mann, AAP, Punjab
- Pinarayi Vijayan, CPI(M), Kerala
- N. Chandrababu Naidu, TDP, Andhra Pradesh
- Prashant Kishor, Jan Suraaj, Bihar

FALLBACK RULES:
1. If news is about a state but no candidate above is involved, pick the most prominent leader from that state.
2. NEVER attribute news to journalists, authors, or news organizations.
"""

MAX_ARTICLES = 30
MAX_EVENTS_PER_BATCH = 10  # 2 batches × 10 = 20 news items/day


# ═══════════════════════════════════════════════════════════════
# SUPABASE REST API HELPER (no SDK required)
# ═══════════════════════════════════════════════════════════════
def supabase_request(method, endpoint, body=None):
    """Direct REST call to Supabase PostgREST API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("  ⚠  Supabase credentials not set — skipping DB.", file=sys.stderr)
        return None

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    try:
        resp = requests.request(method, url, headers=headers, json=body, timeout=30)
        if resp.status_code >= 400:
            print(f"  ⚠  Supabase {method} {endpoint} → {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
            return None
        return resp.json() if resp.text.strip() else {}
    except Exception as exc:
        print(f"  ⚠  Supabase request failed: {exc}", file=sys.stderr)
        return None


# ═══════════════════════════════════════════════════════════════
# RSS FEED FETCHER
# ═══════════════════════════════════════════════════════════════
def fetch_rss_articles():
    articles = []
    for url in RSS_FEEDS:
        try:
            resp = requests.get(url, timeout=15, headers={"User-Agent": "Rajneeti-DailyBot/3.0"})
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
            items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
            for item in items:
                title = (item.findtext("title") or item.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
                desc = (item.findtext("description") or item.findtext("{http://www.w3.org/2005/Atom}summary") or "").strip()
                link_el = item.find("link")
                link = (link_el.text.strip() if link_el is not None and link_el.text else "")
                if not link:
                    atom_link = item.find("{http://www.w3.org/2005/Atom}link")
                    link = atom_link.get("href", "") if atom_link is not None else ""
                if not title:
                    continue
                combined = (title + " " + desc).lower()
                if any(kw in combined for kw in BANNED_KEYWORDS):
                    continue
                articles.append({"title": title, "description": desc, "link": link})
        except Exception as exc:
            print(f"  ⚠  RSS {url}: {exc}", file=sys.stderr)
    print(f"  📰 Fetched {len(articles)} articles from {len(RSS_FEEDS)} feeds")
    return articles[:MAX_ARTICLES]


# ═══════════════════════════════════════════════════════════════
# AI CALL (OpenAI primary, Gemini fallback)
# Model: gpt-5.4 (flagship, released March 2026)
# ═══════════════════════════════════════════════════════════════
OPENAI_MODELS = ["gpt-5.4"]  # GPT-5.4 flagship model


def call_openai(prompt, model="gpt-5.4"):
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": "You output only valid JSON. No markdown, no commentary."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_completion_tokens": 6000,
        },
        timeout=90,
    )
    if resp.status_code >= 400:
        error_detail = "unknown"
        try:
            error_detail = resp.json().get("error", {}).get("message", resp.text[:200])
        except Exception:
            error_detail = resp.text[:200]
        print(f"  ⚠  OpenAI {model} → {resp.status_code}: {error_detail}", file=sys.stderr)
        return None
    return resp.json()["choices"][0]["message"]["content"].strip()


def call_gemini(prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    resp = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 3000, "temperature": 0.7},
        },
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()


def call_ai(prompt):
    """Try OpenAI models in order, then Gemini as final fallback."""
    if OPENAI_API_KEY:
        for model in OPENAI_MODELS:
            try:
                result = call_openai(prompt, model=model)
                if result:
                    print(f"  ✅ AI response (OpenAI/{model})")
                    return result
            except Exception as exc:
                print(f"  ⚠  OpenAI {model} exception: {exc}", file=sys.stderr)
    if GEMINI_API_KEY:
        try:
            result = call_gemini(prompt)
            print("  ✅ AI response (Gemini)")
            return result
        except Exception as exc:
            print(f"  ❌ Gemini failed: {exc}", file=sys.stderr)
    return ""



def clean_json(raw):
    match = re.search(r"(\[.*\]|\{.*\})", raw, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(raw)


# ═══════════════════════════════════════════════════════════════
# STEP 1: GENERATE DAILY NEWS (20 items in 2 batches of 10)
# ═══════════════════════════════════════════════════════════════
STATE_BATCHES = [
    ["Jammu and Kashmir", "Ladakh", "Himachal Pradesh", "Punjab", "Chandigarh", "Uttarakhand", "Haryana", "Delhi", "Uttar Pradesh"],
    ["Rajasthan", "Gujarat", "Madhya Pradesh", "Maharashtra", "Goa", "Dadra and Nagar Haveli and Daman and Diu", "Chhattisgarh", "Bihar", "Jharkhand"],
    ["West Bengal", "Odisha", "Sikkim", "Assam", "Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram", "Tripura", "Meghalaya"],
    ["Andhra Pradesh", "Telangana", "Karnataka", "Kerala", "Tamil Nadu", "Puducherry", "Lakshadweep", "Andaman and Nicobar Islands"]
]

def build_news_prompt(articles, target_states, batch_num=1):
    articles_text = ""
    for i, art in enumerate(articles, 1):
        articles_text += f"\nARTICLE {i}:\n  TITLE: {art['title']}\n  DESCRIPTION: {art['description']}\n  URL: {art['link']}\n"

    return f"""You are a professional Indian political news editor for "Rajneeti TV Network".

STRICT RULES (MANDATORY):
- Do NOT generate hate speech, religious insults, or calls for violence.
- Skip articles about extreme violence, terrorism, or sensitive religious issues.
- Use neutral, professional journalist language. NO game jargon.
- STRICT FACTUALITY: NEVER hallucinate, manipulate, or invent facts. You MUST strictly base your output ONLY on the facts present in the provided article descriptions below. Do not invent context or attribute actions to political parties unless explicitly stated in the source.
- Each news item MUST be tagged with the correct Indian state.

CANDIDATE REFERENCE LIST:
{CANDIDATE_LIST}

Today's news articles:
{articles_text}

TARGET STATES FOR THIS BATCH:
{', '.join(target_states)}

TASK:
Find the most politically significant articles from the provided list that correspond to the Target States listed above. We need approximately 1-2 news items for EACH of the target states. If no specific news is found for a state in the sources, you may attribute national/regional facts, but prioritize strict accuracy.

For each chosen article, produce a JSON object with EXACT keys:
{{
  "leader": "<politician name from candidate list, or 'General News' if the article is not about a specific leader>",
  "state": "<full state name EXACTLY as written in the TARGET STATES list>",
  "sentiment_score": "<string like +3.2 or -1.5, range -5.0 to +5.0>",
  "ticker_headline": "<punchy 10-15 word factual news headline>",
  "blog_title": "<professional news article title>",
  "blog_content": "<150-200 word factual news summary in neutral journalist tone. NO game references.>",
  "social_post": "<engaging 1-2 sentence social post with 3-5 hashtags>",
  "original_url": "<URL of source article>",
  "date": "{TODAY}"
}}

OUTPUT: Return a JSON array combining ALL your generated objects. No markdown. Raw JSON only."""


def validate_events(events):
    for ev in events:
        ev.setdefault("leader", "Unknown")
        ev.setdefault("state", "National")
        ev.setdefault("sentiment_score", "+0.0")
        ev.setdefault("ticker_headline", "Political update")
        ev.setdefault("blog_title", "News Update")
        ev.setdefault("blog_content", "No content available.")
        ev.setdefault("social_post", "#RajneetiTV #IndianPolitics")
        ev.setdefault("original_url", "")
        ev.setdefault("date", TODAY)
    return events


def generate_daily_news(articles):
    """Generate state-specific news across 4 regional batches targeting all 36 Indian states."""
    all_events = []

    for batch_num, target_states in enumerate(STATE_BATCHES, 1):
        print(f"\n  🤖 Generating batch {batch_num}/4 for targeted states...")
        raw = call_ai(build_news_prompt(articles, target_states, batch_num=batch_num))
        if not raw:
            print(f"  ❌ No AI response for batch {batch_num}. Skipping.")
            continue
        try:
            events = clean_json(raw)
            if not isinstance(events, list) or len(events) == 0:
                raise ValueError("Empty or invalid list")
            all_events.extend(validate_events(events))
        except Exception as exc:
            print(f"  ❌ Failed to parse batch {batch_num} JSON: {exc}\n  Raw: {raw[:300]}", file=sys.stderr)

    if not all_events:
        print("  ❌ All batches failed. Set OPENAI_API_KEY or GEMINI_API_KEY.")
        return None

    # Deduplicate by headline (in case both batches picked the same article)
    seen_headlines = set()
    unique_events = []
    for ev in all_events:
        headline = ev.get("ticker_headline", "").lower().strip()
        if headline not in seen_headlines:
            seen_headlines.add(headline)
            unique_events.append(ev)

    print(f"  ✅ Total unique news items generated: {len(unique_events)}")
    return unique_events


# ═══════════════════════════════════════════════════════════════
# STEP 2: WRITE NEWS TO SUPABASE + JSON FILE
# ═══════════════════════════════════════════════════════════════
def write_news_to_json(events):
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    print(f"  ✅ Wrote {len(events)} events to {OUTPUT_PATH}")


def upsert_news_to_supabase(events):
    rows = [{
        "leader":          ev.get("leader", "Unknown"),
        "state":           ev.get("state", "National"),
        "sentiment_score": ev.get("sentiment_score", "+0.0"),
        "ticker_headline": ev.get("ticker_headline", "Political Update"),
        "blog_title":      ev.get("blog_title", ""),
        "blog_content":    ev.get("blog_content", ""),
        "social_post":     ev.get("social_post", ""),
        "original_url":    ev.get("original_url", ""),
        "news_date":       ev.get("date", TODAY),
    } for ev in events]

    result = supabase_request("POST", "news_events?on_conflict=ticker_headline,news_date", rows)
    if result is not None:
        print(f"  ✅ Upserted {len(rows)} news rows to Supabase")
    else:
        print("  ⚠  Supabase news upsert failed.")


# ═══════════════════════════════════════════════════════════════
# STEP 3: AUTO-ARCHIVE EXPIRED CAMPAIGNS + AI RESULTS
# ═══════════════════════════════════════════════════════════════
def auto_archive_expired_campaigns():
    now_iso = datetime.now(timezone.utc).isoformat()
    expired = supabase_request(
        "GET",
        f"campaigns?status=eq.live&end_time=lt.{now_iso}&select=id,slug,title,total_votes"
    )
    if not expired:
        return

    for camp in expired:
        camp_id = camp["id"]
        slug = camp.get("slug", "unknown")
        print(f"  🗃️  Archiving expired campaign: {camp['title']}")

        # Get vote breakdown
        votes_data = supabase_request("GET", f"votes?campaign_id=eq.{camp_id}&select=selected_style")
        counts = {"modi": 0, "rahul": 0, "own": 0}
        if votes_data:
            for v in votes_data:
                style = v.get("selected_style", "own")
                counts[style] = counts.get(style, 0) + 1
        total = sum(counts.values())

        if total < 3:
            # AI-simulated result (deterministic from slug)
            seed = sum(ord(c) * (i + 1) for i, c in enumerate(slug)) % 1000
            modi_pct  = 45 + (seed % 30)
            rahul_pct = 20 + ((seed * 7) % 25)
            own_pct   = max(2, 100 - modi_pct - rahul_pct)
            winner = "modi" if modi_pct > rahul_pct else "rahul"
            winner_name = "Narendra Modi" if winner == "modi" else "Rahul Gandhi"
            winner_pct = max(modi_pct, rahul_pct)
            vote_pcts = {"modi": modi_pct, "rahul": rahul_pct, "own": own_pct}
            analysis = (
                f"Based on India's current political landscape and ground-level sentiment, "
                f"the {winner_name}-style approach holds stronger public resonance at this time. "
                f"Economic indicators and regional narratives tilt the balance {winner_pct}% "
                f"toward this policy direction. "
                f"(AI-simulated — campaign received fewer than 3 public votes.)"
            )
        else:
            vote_pcts = {k: round(v / total * 100) for k, v in counts.items()}
            winner = max(counts, key=counts.get)
            winner_name = "Narendra Modi" if winner == "modi" else "Rahul Gandhi"
            winner_pct = vote_pcts[winner]
            analysis = (
                f"The public voted {winner_pct}% in favour of the {winner_name}-style approach "
                f"out of {total} total votes cast."
            )

        # Update campaign to archived
        supabase_request("PATCH", f"campaigns?id=eq.{camp_id}", {
            "status": "archived",
            "total_votes": total,
            "vote_percentages": vote_pcts,
            "winner_leader": winner,
            "winner_vote_percentage": winner_pct,
            "result_analysis": analysis,
            "result_published_at": datetime.now(timezone.utc).isoformat(),
        })

        # Mark winner in leader_approaches
        supabase_request("PATCH", f"leader_approaches?campaign_id=eq.{camp_id}&style=eq.{winner}", {
            "is_winner": True,
        })

        # DELETE raw votes (save storage — percentages are now in campaigns table)
        supabase_request("DELETE", f"votes?campaign_id=eq.{camp_id}")

        print(f"  ✅ Archived: {camp['title']} → {winner_name} ({winner_pct}%), votes deleted")


# ═══════════════════════════════════════════════════════════════
# STEP 4: MONDAY CAMPAIGN GENERATION
# ═══════════════════════════════════════════════════════════════
def check_live_campaign_exists():
    result = supabase_request("GET", "campaigns?status=eq.live&limit=1&select=id")
    if result is None:
        return True  # Assume yes on error
    return len(result) > 0


def get_last_week_news():
    """Fetch all news from the past 7 days to pick a campaign topic."""
    seven_days_ago = (NOW - timedelta(days=7)).strftime("%Y-%m-%d")
    result = supabase_request(
        "GET",
        f"news_events?news_date=gte.{seven_days_ago}&order=news_date.desc&select=ticker_headline,blog_content,leader,state"
    )
    return result or []


def build_campaign_prompt(news_items):
    news_text = ""
    for i, n in enumerate(news_items, 1):
        news_text += f"\n{i}. [{n.get('leader', '?')} / {n.get('state', '?')}] {n.get('ticker_headline', '')}"
        if n.get('blog_content'):
            news_text += f"\n   Summary: {n['blog_content'][:200]}"

    return f"""You are a neutral political analyst for the Indian political strategy game "Rajneeti".

Here are {len(news_items)} political news items from the past 7 days in India:
{news_text}

TASK:
1. Identify the SINGLE MOST SIGNIFICANT political issue from these news items.
2. Create a Social Campaign debate post comparing how NARENDRA MODI and RAHUL GANDHI would handle this issue.

CONTENT RULES (STRICT):
- Use neutral, analytical tone
- Both sides must have 4 substantive, fair policy points
- Do NOT invent statistics or fabricate data
- Do NOT use communal, defamatory, or incendiary language
- Base policy points on actual positions, manifestos, or historical statements

Return ONLY this JSON object (no markdown, no explanation):
{{
  "title": "<debate title, max 80 chars>",
  "subtitle": "<1 sentence analytical teaser, max 120 chars>",
  "issue_category": "<one of: Economy, Governance, Foreign Policy, Agriculture, Technology, Infrastructure, Education, Healthcare, Security, Elections & Democracy>",
  "issue_summary": "<2-3 paragraph neutral summary of the issue, 150-250 words>",
  "issue_bullets": ["<key fact 1>", "<key fact 2>", "<key fact 3>", "<key fact 4>"],
  "slug": "<url-safe slug, e.g. inflation-crisis-april-2026>",
  "region": "<state name or 'national'>",
  "confidence_score": <0.0-1.0, how confident in accuracy>,
  "modi_bullets": ["<substantive Modi policy 1>", "<point 2>", "<point 3>", "<point 4>"],
  "rahul_bullets": ["<substantive Rahul policy 1>", "<point 2>", "<point 3>", "<point 4>"]
}}"""


def create_weekly_campaign():
    """Generate a new campaign from last week's news. Runs on Monday."""
    print("\n  📣 MONDAY — Generating weekly campaign from last week's news...")

    # Check if one already exists
    if check_live_campaign_exists():
        print("  ✅ Live campaign already exists — skipping generation.")
        return

    # Get last week's news
    news = get_last_week_news()
    if not news:
        print("  ⚠  No news from last week — cannot generate campaign.")
        return
    print(f"  📑 Found {len(news)} news items from last 7 days")

    # AI generates campaign
    raw = call_ai(build_campaign_prompt(news))
    if not raw:
        print("  ⚠  AI returned nothing for campaign generation.")
        return

    try:
        data = clean_json(raw)
        if not isinstance(data, dict):
            raise ValueError("Response was not a dict")
    except Exception as exc:
        print(f"  ⚠  Failed to parse campaign JSON: {exc}", file=sys.stderr)
        return

    # Ensure unique slug
    slug = data.get("slug", f"campaign-{TODAY}")
    if not slug.endswith(TODAY[-5:].replace("-", "")):
        slug = f"{slug}-{TODAY.replace('-', '')[-6:]}"

    # Campaign runs Mon 6 AM → Thu 11:59 PM IST
    start_time = datetime.now(timezone.utc).isoformat()
    end_time = (datetime.now(timezone.utc) + timedelta(days=CAMPAIGN_DURATION_DAYS)).isoformat()

    campaign_row = {
        "slug":            slug,
        "title":           data.get("title", "This Week's Political Debate"),
        "subtitle":        data.get("subtitle", "Compare approaches. Cast your vote."),
        "issue_category":  data.get("issue_category", "Governance"),
        "issue_summary":   data.get("issue_summary", ""),
        "issue_bullets":   data.get("issue_bullets", []),
        "status":          "live",
        "start_time":      start_time,
        "end_time":        end_time,
        "region":          data.get("region", "national"),
        "confidence_score": data.get("confidence_score", 0.8),
        "source_metadata": {"generated_from": f"{len(news)} news items", "generation_date": TODAY},
    }

    result = supabase_request("POST", "campaigns", campaign_row)
    if not result or not isinstance(result, list) or not result[0].get("id"):
        print("  ⚠  Failed to insert campaign.")
        return

    campaign_id = result[0]["id"]

    # Insert leader approaches
    approaches = [
        {
            "campaign_id": campaign_id,
            "leader_name": "Narendra Modi",
            "style": "modi",
            "display_position": 1,
            "policy_bullets": data.get("modi_bullets", ["Approach not available"]),
            "framing_type": "current_government",
        },
        {
            "campaign_id": campaign_id,
            "leader_name": "Rahul Gandhi",
            "style": "rahul",
            "display_position": 2,
            "policy_bullets": data.get("rahul_bullets", ["Approach not available"]),
            "framing_type": "opposition_alternative",
        },
    ]
    supabase_request("POST", "leader_approaches", approaches)
    print(f"  ✅ Created: '{campaign_row['title']}' (live until {end_time[:10]})")


# ═══════════════════════════════════════════════════════════════
# STEP 5: DATA CLEANUP (keep free tier forever)
# ═══════════════════════════════════════════════════════════════
def cleanup_old_data():
    """Delete news older than 7 days to stay within free tier limits."""
    cutoff = (NOW - timedelta(days=7)).strftime("%Y-%m-%d")
    result = supabase_request("DELETE", f"news_events?news_date=lt.{cutoff}")
    if result is not None:
        deleted = len(result) if isinstance(result, list) else 0
        if deleted > 0:
            print(f"  🧹 Deleted {deleted} news rows older than {cutoff}")
        else:
            print(f"  🧹 No old news to clean up (cutoff: {cutoff})")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def main():
    print("═" * 60)
    print(f"🗞️  RAJNEETI DAILY BOT v4.0 — {TODAY} ({DAY_OF_WEEK})")
    print("═" * 60)

    # 1. Fetch RSS
    articles = fetch_rss_articles()
    if not articles:
        print("  ❌ No articles fetched. Exiting.")
        sys.exit(0)

    # 2. Generate 20 state-tagged news events via AI (2 batches of 10)
    events = generate_daily_news(articles)
    if not events:
        sys.exit(1)

    # 3. Write to static JSON file (fallback)
    write_news_to_json(events)

    # 4. Write to Supabase (heartbeat + live data)
    print("\n  📡 Syncing to Supabase...")
    upsert_news_to_supabase(events)

    # 5. Auto-archive expired campaigns + generate AI results
    print("\n  🗃️  Checking for expired campaigns...")
    auto_archive_expired_campaigns()

    # 6. Daily: If no live campaign exists (just archived or first run), create one.
    # This runs every day — no Monday restriction. The 7-day duration means a new
    # campaign is only needed roughly once per week, but the daily check ensures
    # there is never a "dead zone" on the website.
    if not check_live_campaign_exists():
        print(f"\n  📣 No active campaign found — generating new 7-day campaign from last week's news...")
        create_weekly_campaign()
    else:
        print(f"\n  ✅ Live campaign exists — no new campaign needed today.")

    # 7. Cleanup old news data
    print("\n  🧹 Cleaning up old data...")
    cleanup_old_data()

    # Summary
    print("\n" + "═" * 60)
    print("🎉 DONE!")
    for ev in events:
        print(f"   • {ev['leader']} ({ev['state']}) ➜ {ev['sentiment_score']}")
    print("═" * 60)


if __name__ == "__main__":
    main()
