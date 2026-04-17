import os
import requests
import json
import xml.etree.ElementTree as ET
from datetime import datetime

# Credentials from .env.local analysis
SUPABASE_URL = "https://xbgjkmahmyuoaspevipd.supabase.co"
ANON_KEY = "sb_publishable_HOCcMDFfM0cyzsEEuj8opg_EZMZIUZ5"

def generate_full_sitemap():
    base_url = "https://moitrastudios.com"
    root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    # 1. Static Pages
    static_pages = [
        "/", 
        "/indian-politics-game-home", 
        "/social-campaign", 
        "/privacy-policy", 
        "/contact-us", 
        "/rajneeti-tv-network"
    ]
    for path in static_pages:
        url = ET.SubElement(root, "url")
        ET.SubElement(url, "loc").text = f"{base_url}{path}"
        ET.SubElement(url, "changefreq").text = "daily"
        ET.SubElement(url, "priority").text = "1.0" if path == "/" else "0.8"

    # 2. Dynamic Campaigns from Supabase
    try:
        headers = {
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}"
        }
        # Fetch up to 100 recent campaigns
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/campaigns?select=slug,updated_at&limit=100", headers=headers)
        if resp.ok:
            campaigns = resp.json()
            for c in campaigns:
                url = ET.SubElement(root, "url")
                ET.SubElement(url, "loc").text = f"{base_url}/social-campaign/{c['slug']}"
                ET.SubElement(url, "changefreq").text = "weekly"
                ET.SubElement(url, "priority").text = "0.7"
                # Add optional lastmod if available
                if 'updated_at' in c:
                    ET.SubElement(url, "lastmod").text = c['updated_at'][:10]
        else:
            print(f"Failed to fetch campaigns: {resp.text}")
    except Exception as e:
        print(f"Error fetching campaigns: {e}")

    # 3. Write to public/sitemap.xml
    # We use a relative path from the project root
    target_path = os.path.join("public", "sitemap.xml")
    os.makedirs("public", exist_ok=True)
    
    # Pretty print helper
    from xml.dom import minidom
    xml_str = ET.tostring(root, encoding='utf-8')
    pretty_xml = minidom.parseString(xml_str).toprettyxml(indent="  ")
    
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(pretty_xml)
    
    print(f"Successfully generated sitemap with {len(root)} base entries at {target_path}")

if __name__ == "__main__":
    generate_full_sitemap()
