import requests
import json
import os
import google.generativeai as genai
from datetime import datetime
import xml.etree.ElementTree as ET

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
RSS_FEED_URL = "https://news.google.com/rss/search?q=Indian+politics+leaders&hl=en-IN&gl=IN&ceid=IN:en"
OUTPUT_FILE = "C:/Users/Satish/Desktop/Projects/Moitra-Studios/public/daily_news.json"

def fetch_rss_headlines():
    """Fetch 3 headlines from the Google News RSS feed."""
    print("Fetching RSS headlines...")
    response = requests.get(RSS_FEED_URL)
    root = ET.fromstring(response.content)
    
    headlines = []
    for item in root.findall('.//item')[:3]:
        title = item.find('title').text
        description = item.find('description').text
        link = item.find('link').text
        headlines.append({"title": title, "summary": description, "link": link})
    
    return headlines

def generate_daily_news_package(headlines):
    """Use Gemini to generate a satirical, game-linked news JSON."""
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY not found.")
        return None

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-3-flash-preview')

    prompt = f"""
    You are a sarcastic, political strategy advisor for the game 'Rajneeti'.
    Analyze these 3 Indian political news headlines:
    {json.dumps(headlines)}

    Instructions:
    1. Select the most impactful headline.
    2. Identify the primary 'leader' and 'state' involved.
    3. Calculate a 'sentiment_score' between -5.0 and +5.0 (simulating game impact).
    4. Create a 'blog_title' and 'blog_content' (100 words max) that is satirical and links the news to Rajneeti game mechanics (like 'Fundraise', 'Charisma', 'HQ management', or 'Rally').
    5. Draft a 'social_post' for Twitter with hashtags.

    Output format: STRICT JSON (only the object, no backticks).
    {{
      "leader": "string",
      "state": "string",
      "sentiment_score": "string (e.g., +3.5 or -2.0)",
      "ticker_headline": "string (cleaned headline)",
      "blog_title": "string",
      "blog_content": "string",
      "social_post": "string",
      "original_url": "string (the 'link' provided in the headlines for the chosen story)"
    }}
    """
    
    print("Asking Gemini for the daily news package...")
    response = model.generate_content(prompt)
    
    try:
        # Clean response text if it contains markdown markers
        text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        print(f"Raw response: {response.text}")
        return None

def main():
    headlines = fetch_rss_headlines()
    if not headlines:
        print("No headlines found.")
        return

    package = generate_daily_news_package(headlines)
    if package:
        package["date"] = datetime.now().strftime("%Y-%m-%d")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(package, f, indent=2)
        print(f"Daily news package saved to {OUTPUT_FILE}")
    else:
        print("Failed to generate package.")

if __name__ == "__main__":
    main()
