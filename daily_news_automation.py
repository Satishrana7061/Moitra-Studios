import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import requests
from openai import OpenAI
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") # Use Service Role Key in Prod for Bypass RLS

RSS_FEED_URL = "https://news.google.com/rss/search?q=Indian+politics+leaders&hl=en-IN&gl=IN&ceid=IN:en"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "public", "daily_news.json")

# Initialize Clients
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- NEWS MODULE ---

def fetch_rss_headlines(count=3):
    print(f"Fetching {count} RSS headlines...")
    try:
        response = requests.get(RSS_FEED_URL)
        root = ET.fromstring(response.content)
        headlines = []
        for item in root.findall('.//item')[:count]:
            headlines.append({
                "title": item.find('title').text,
                "summary": item.find('description').text,
                "link": item.find('link').text
            })
        return headlines
    except Exception as e:
        print(f"RSS Fetch Error: {e}")
        return []

def generate_daily_news(headlines):
    if not OPENAI_API_KEY: return None
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    prompt = f"Analyze these 3 headlines for the Rajneeti game: {json.dumps(headlines)}. Output STRICT JSON: leader, state, sentiment_score, ticker_headline, blog_title, blog_content, social_post, original_url."
    
    try:
        response = client.chat.completions.create(
            model="gpt-4", # Falling back to gpt-4 since 5.4 was a placeholder
            messages=[{"role": "system", "content": "Satirical political advisor for Rajneeti game."}, {"role": "user", "content": prompt}],
            temperature=0.7
        )
        text = response.choices[0].message.content.strip()
        return json.loads(text.replace('```json', '').replace('```', ''))
    except Exception as e:
        print(f"Daily News AI Error: {e}")
        return None

# --- CAMPAIGN MODULE ---

def generate_social_campaign(topic_name, category):
    """Uses Gemini to generate a full Modi vs Rahul campaign scenario."""
    if not GEMINI_API_KEY: 
        print("Gemini Key missing for Campaign generation.")
        return None
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    prompt = f"""
    Create a highly detailed 'Social Campaign' for the Rajneeti game based on this topic: '{topic_name}' in category '{category}'.
    
    Strictly focus on the competition between Narendra Modi and Rahul Gandhi.
    
    Output STRICT JSON with these keys:
    {{
      "title": "Impactful Headline (Modi vs Rahul style)",
      "subtitle": "A catchy ideological tagline",
      "issue_summary": "A 2-paragraph neutral summary of the crisis/topic",
      "problem_bullets": ["3 key facts about the problem"],
      "approaches": [
        {{
          "leader_name": "Narendra Modi (Current PM)",
          "style": "modi",
          "column_title": "His Current Policy Direction",
          "bullets": ["4 bullet points summarizing his actual or likely strategic response"]
        }},
        {{
          "leader_name": "Rahul Gandhi",
          "style": "rahul",
          "column_title": "His Proposed Counter-Response",
          "bullets": ["4 bullet points summarizing his likely populist or rights-based response"]
        }}
      ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        return json.loads(text.replace('```json', '').replace('```', ''))
    except Exception as e:
        print(f"Campaign AI Error: {e}")
        return None

def manage_campaign_lifecycle():
    if not supabase: return

    # 1. Check if a topic round has ended and needs conversion
    # Logic: find 'finished' rounds that don't have a child campaign yet
    now = datetime.now().isoformat()
    
    # 2. Check for Live Experience
    # This part would fetch the winning topic from the votes table
    # For now, simplified: Check if we need a fresh live campaign
    live_campaigns = supabase.table('campaigns').select('id').eq('status', 'live').execute()
    
    if len(live_campaigns.data) == 0:
        print("No live campaign found. Checking for winning topics...")
        # Simulating fetching a winning topic for demo
        campaign_data = generate_social_campaign("National Job Security post-AI", "Technology")
        if campaign_data:
            slug = "campaign-" + datetime.now().strftime("%Y%m%d")
            res = supabase.table('campaigns').insert({
                "slug": slug,
                "title": campaign_data['title'],
                "subtitle": campaign_data['subtitle'],
                "category": "Technology",
                "issue_summary": campaign_data['issue_summary'],
                "problem_bullets": campaign_data['problem_bullets'],
                "status": "live",
                "end_time": (datetime.now() + timedelta(days=3)).isoformat()
            }).execute()
            
            if res.data:
                campaign_id = res.data[0]['id']
                for app in campaign_data['approaches']:
                    supabase.table('leader_approaches').insert({
                        "campaign_id": campaign_id,
                        "leader_name": app['leader_name'],
                        "style": app['style'],
                        "column_title": app['column_title'],
                        "bullets": app['bullets']
                    }).execute()
                print(f"Successfully launched new campaign: {slug}")

# --- MAIN RUNNER ---

def main():
    # Update Daily News (Static JSON for SEO)
    headlines = fetch_rss_headlines()
    if headlines:
        package = generate_daily_news(headlines)
        if package:
            package["date"] = datetime.now().strftime("%Y-%m-%d")
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump([package], f, indent=2)
            print("Daily News Updated.")

    # Manage Dynamic Campaigns
    manage_campaign_lifecycle()

if __name__ == "__main__":
    main()
