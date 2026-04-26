import requests
import xml.etree.ElementTree as ET

def test_google_news_rss(state):
    print(f"\n--- Testing Google News RSS for: {state} ---")
    url = f"https://news.google.com/rss/search?q={state.replace(' ', '+')}+politics+when:24h&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = root.findall(".//item")
        if not items:
            print("  No items found.")
            return

        for i, item in enumerate(items[:3], 1):
            title = item.findtext("title")
            print(f"  {i}. {title}")

    except Exception as e:
        print(f"  Error fetching: {e}")

states = ["West Bengal", "Mizoram", "Maharashtra", "Lakshadweep"]
for s in states:
    test_google_news_rss(s)
