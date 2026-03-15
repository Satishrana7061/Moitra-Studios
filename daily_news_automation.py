import requests
import json
import os
from openai import OpenAI
from datetime import datetime
import xml.etree.ElementTree as ET

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
RSS_FEED_URL = "https://news.google.com/rss/search?q=Indian+politics+leaders&hl=en-IN&gl=IN&ceid=IN:en"
# Use a relative path so it works in GitHub Actions
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "public", "daily_news.json")

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
    """Use OpenAI to generate a satirical, game-linked news JSON."""
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not found in environment variables.")
        return None

    client = OpenAI(api_key=OPENAI_API_KEY)

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
    
    print("Asking OpenAI for the daily news package...")
    try:
        response = client.chat.completions.create(
            model="gpt-5.4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs STRICT JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        
        # Clean response text if it contains markdown markers
        text = response.choices[0].message.content.strip()
        text = text.replace('```json', '').replace('```', '')
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing OpenAI response: {e}")
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
            json.dump([package], f, indent=2) # Wrapping in array as per public/daily_news.json format
        print(f"Daily news package saved to {OUTPUT_FILE}")
    else:
        print("Failed to generate package.")

if __name__ == "__main__":
    main()
