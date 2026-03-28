#!/usr/bin/env python3
"""
daily_news_automation.py
────────────────────────
Fetches Indian political news from RSS feeds, uses OpenAI (or Gemini as
fallback) to generate Rajneeti game-style daily news entries, and writes
the result to public/daily_news.json.

Designed to run inside the GitHub Actions workflow defined in
.github/workflows/daily-news.yml
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

import requests

# ── Configuration ────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "daily_news.json")

RSS_FEEDS = [
    "https://timesofindia.indiatimes.com/rssfeeds/66023901.cms",  # TOI Politics
    "https://www.ndtv.com/rss/india",                             # NDTV India
    "https://www.thehindu.com/news/national/feeder/default.rss",  # The Hindu
    "https://indianexpress.com/section/india/politics/feed/",     # IE Politics
]

BANNED_KEYWORDS = [
    "terror", "terrorist", "bomb", "blast", "riot",
    "lynch", "murder", "kill", "rape", "assault",
]

CANDIDATE_LIST = """
- Narendra Modi, BJP, National (state: Gujarat / National)
- Rahul Gandhi, Congress, National (state: Uttar Pradesh / National)
- Amit Shah, BJP, National (state: Gujarat / National)
- Arvind Kejriwal, AAP, Delhi (state: Delhi)
- Mamata Banerjee, TMC, West Bengal (state: West Bengal)
- Yogi Adityanath, BJP, Uttar Pradesh (state: Uttar Pradesh)
- M.K. Stalin, DMK, Tamil Nadu (state: Tamil Nadu)
- Nitish Kumar, JDU, Bihar (state: Bihar)
- Akhilesh Yadav, SP, Uttar Pradesh (state: Uttar Pradesh)
- Uddhav Thackeray, Shiv Sena (UBT), Maharashtra (state: Maharashtra)
- Mallikarjun Kharge, Congress, National (state: Karnataka)
- Nirmala Sitharaman, BJP, National (state: Tamil Nadu)
- Rajnath Singh, BJP, National (state: Uttar Pradesh)
- Priyanka Gandhi, Congress, Uttar Pradesh (state: Uttar Pradesh)
- Mayawati, BSP, Uttar Pradesh (state: Uttar Pradesh)
- Lalu Prasad Yadav, RJD, Bihar (state: Bihar)
- Tejaswi Yadav, RJD, Bihar (state: Bihar)
- Bhagwant Mann, AAP, Punjab (state: Punjab)
- Pinarayi Vijayan, CPI(M), Kerala (state: Kerala)
- N. Chandrababu Naidu, TDP, Andhra Pradesh (state: Andhra Pradesh)
- Prashant Kishor, Jan Suraaj, Bihar (state: Bihar)

FALLBACK RULES:
1. If the news is about a state but NO specific candidate above is involved,
   pick the most prominent leader from that state in the list.
2. NEVER attribute news to journalists, authors, or news organizations.
"""

MAX_ARTICLES = 15   # RSS articles to consider
MAX_EVENTS = 5      # Final entries to keep (keeps JSON small and costs low)


# ── RSS Fetcher ──────────────────────────────────────────────────
def fetch_rss_articles() -> list[dict]:
    """Fetch and filter articles from all RSS feeds."""
    articles: list[dict] = []

    for url in RSS_FEEDS:
        try:
            resp = requests.get(url, timeout=15, headers={
                "User-Agent": "MoitraStudios-DailyBot/1.0"
            })
            resp.raise_for_status()
            root = ET.fromstring(resp.content)

            # Handle both RSS 2.0 (<item>) and Atom (<entry>) elements
            items = root.findall(".//item") or root.findall(
                ".//{http://www.w3.org/2005/Atom}entry"
            )

            for item in items:
                title = (
                    item.findtext("title")
                    or item.findtext("{http://www.w3.org/2005/Atom}title")
                    or ""
                ).strip()
                description = (
                    item.findtext("description")
                    or item.findtext("{http://www.w3.org/2005/Atom}summary")
                    or ""
                ).strip()

                link_el = item.find("link")
                if link_el is not None and link_el.text:
                    link = link_el.text.strip()
                else:
                    atom_link = item.find("{http://www.w3.org/2005/Atom}link")
                    link = (atom_link.get("href", "") if atom_link is not None else "")

                if not title:
                    continue

                combined = (title + " " + description).lower()
                if any(kw in combined for kw in BANNED_KEYWORDS):
                    continue

                articles.append({
                    "title": title,
                    "description": description,
                    "link": link,
                    "source": url,
                })
        except Exception as exc:
            print(f"  ⚠  Failed to parse {url}: {exc}", file=sys.stderr)

    print(f"  📰 Fetched {len(articles)} articles across {len(RSS_FEEDS)} feeds")
    return articles[:MAX_ARTICLES]


# ── AI Prompt ────────────────────────────────────────────────────
def build_prompt(articles: list[dict]) -> str:
    """Build a single prompt that processes multiple articles at once."""
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    articles_text = ""
    for i, art in enumerate(articles, 1):
        articles_text += f"\nARTICLE {i}:\n  TITLE: {art['title']}\n  DESCRIPTION: {art['description']}\n  URL: {art['link']}\n"

    return f"""You are a content generator for the Indian political strategy game "Rajneeti" by Moitra Studios.

SAFETY RULES (MANDATORY):
- Do NOT generate hate speech, religious insults, or calls for violence.
- If an article is about extreme violence, terrorism, or sensitive religious issues, skip it.
- Keep language neutral, witty, and focused on game mechanics, not real-world advocacy.

CANDIDATE/STATE LIST:
{CANDIDATE_LIST}

Here are today's news articles:
{articles_text}

TASK:
Pick the {MAX_EVENTS} most politically significant articles from the list above. 
CRITICAL REQUIREMENT: Focus exclusively on political news regarding the current 5 state elections (e.g., Maharashtra, Jharkhand, Haryana, Jammu & Kashmir, Delhi). If an article doesn't relate to these regions or their prominent leaders, ignore it or adapt national news to how it impacts these specific states.
For each, produce a JSON object with these EXACT keys:
{{
  "leader": "<candidate name from the list above>",
  "state": "<full state name, e.g. Bihar, Uttar Pradesh, National>",
  "sentiment_score": "<a string like +3.2 or -1.5, range -5.0 to +5.0>",
  "ticker_headline": "<punchy 10-15 word news headline>",
  "blog_title": "<creative Rajneeti game-style blog title, witty and fun>",
  "blog_content": "<150-200 word blog post written in Rajneeti game jargon: Rally, Charisma, HQ Management, Action Points, Fundraise, Booth Management, etc. Make it entertaining and insightful.>",
  "social_post": "<engaging 1-2 sentence social media post with 3-5 relevant hashtags>",
  "original_url": "<URL of the source article>",
  "date": "{today}"
}}

OUTPUT:
Return a JSON array of exactly {MAX_EVENTS} objects.  
Do NOT wrap in markdown code fences.  
Return ONLY the JSON array, nothing else."""


# ── OpenAI Call ──────────────────────────────────────────────────
def call_openai(prompt: str) -> str:
    """Call OpenAI chat completions API."""
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You output only valid JSON arrays. No markdown, no commentary."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


# ── Gemini Fallback ──────────────────────────────────────────────
def call_gemini(prompt: str) -> str:
    """Call Google Gemini API as a fallback."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    resp = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 2000,
                "temperature": 0.7,
            },
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    return text.strip()


# ── JSON Cleanup ─────────────────────────────────────────────────
def clean_json(raw: str) -> list[dict]:
    """Strip markdown fences, conversational text, and parse JSON array."""
    import re
    # Find the largest bracketed structure that looks like a JSON array
    match = re.search(r"(\[.*\])", raw, re.DOTALL)
    if match:
        cleaned = match.group(1)
        return json.loads(cleaned)
    # Fallback to direct parsing
    return json.loads(raw)


# ── Main ─────────────────────────────────────────────────────────
def main():
    print("🗞️  Rajneeti Daily News Automation")
    print("=" * 50)

    # 1. Fetch RSS articles
    articles = fetch_rss_articles()
    if not articles:
        print("  ❌ No articles fetched. Exiting without updating.")
        sys.exit(0)

    # 2. Build prompt
    prompt = build_prompt(articles)

    # 3. Call AI (OpenAI preferred, Gemini fallback)
    raw_response = ""
    if OPENAI_API_KEY:
        print("  🤖 Using OpenAI (gpt-4o-mini)...")
        try:
            raw_response = call_openai(prompt)
            print("  ✅ OpenAI response received")
        except Exception as exc:
            print(f"  ⚠  OpenAI failed: {exc}", file=sys.stderr)

    if not raw_response and GEMINI_API_KEY:
        print("  🤖 Falling back to Gemini...")
        try:
            raw_response = call_gemini(prompt)
            print("  ✅ Gemini response received")
        except Exception as exc:
            print(f"  ❌ Gemini also failed: {exc}", file=sys.stderr)

    if not raw_response:
        print("  ❌ No AI response obtained. Exiting without updating.")
        if not OPENAI_API_KEY and not GEMINI_API_KEY:
            print("  💡 Hint: Set OPENAI_API_KEY or GEMINI_API_KEY in GitHub Secrets.")
        sys.exit(1)

    # 4. Parse response
    try:
        events = clean_json(raw_response)
    except json.JSONDecodeError as exc:
        print(f"  ❌ Failed to parse AI JSON: {exc}", file=sys.stderr)
        print(f"  Raw response:\n{raw_response[:500]}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(events, list) or len(events) == 0:
        print("  ❌ AI returned empty or invalid data. Exiting.")
        sys.exit(1)

    # 5. Validate required keys
    required_keys = {"leader", "state", "sentiment_score", "ticker_headline",
                     "blog_title", "blog_content", "social_post", "date"}
    for event in events:
        missing = required_keys - set(event.keys())
        if missing:
            print(f"  ⚠  Event missing keys {missing}, patching defaults...")
            event.setdefault("leader", "Unknown")
            event.setdefault("state", "National")
            event.setdefault("sentiment_score", "+0.0")
            event.setdefault("ticker_headline", "Political update")
            event.setdefault("blog_title", "News Update")
            event.setdefault("blog_content", "No content available.")
            event.setdefault("social_post", "#Rajneeti #IndianPolitics")
            event.setdefault("original_url", "")
            event.setdefault("date", datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d"))

    # 6. Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2, ensure_ascii=False)

    print(f"\n  ✅ Wrote {len(events)} events to {OUTPUT_PATH}")
    for ev in events:
        score = ev.get("sentiment_score", "?")
        print(f"     • {ev['leader']} ({ev['state']}) — {score}")

    print("\n🎉 Done!")



if __name__ == "__main__":
    main()
