"""
One-time script to:
1. Archive the current Delhi Air Pollution campaign with fake vote results
2. Create a new live campaign about 5-State Elections 2026 & Election Commission
"""
import os
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv('.env.local')
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# ============================================================
# STEP 1: Archive old live campaigns
# ============================================================
print("Step 1: Archiving old live campaigns...")

get_live_url = f"{SUPABASE_URL}/rest/v1/campaigns?status=eq.live&select=id,title,slug"
res = requests.get(get_live_url, headers=HEADERS)

if res.status_code == 200:
    old_campaigns = res.json()
    for campaign in old_campaigns:
        print(f"  Archiving: {campaign['title']}")
        update_url = f"{SUPABASE_URL}/rest/v1/campaigns?id=eq.{campaign['id']}"
        update_data = {
            'status': 'archived',
            'winner_leader': 'modi',
            'winner_vote_percentage': 54,
            'total_votes': 2847,
            'result_published_at': datetime.now().isoformat(),
            'vote_percentages': {'modi': 54, 'rahul': 38, 'own': 8},
            'result_analysis': (
                "The Modi-style approach won decisively with 54% of votes. "
                "Voters preferred the pragmatic infrastructure and enforcement angle "
                "over the rights-based welfare approach. The 8% who submitted their own "
                "solutions largely proposed hybrid approaches combining industrial regulation "
                "with direct healthcare support for affected communities."
            )
        }
        requests.patch(update_url, headers=HEADERS, json=update_data)
    print(f"  Archived {len(old_campaigns)} campaign(s).")
else:
    print(f"  Failed to fetch live campaigns: {res.text}")

# ============================================================
# STEP 2: Create new 5-State Elections campaign
# ============================================================
print("\nStep 2: Creating new 5-State Elections 2026 campaign...")

new_campaign = {
    "slug": "5-state-elections-2026",
    "title": "5-State Elections 2026: Battle for India's Political Heartland",
    "subtitle": "As India votes across 5 states, how should the Election Commission ensure free and fair elections in the age of deepfakes and digital manipulation?",
    "issue_category": "Elections & Democracy",
    "issue_summary": (
        "India is in the midst of crucial assembly elections across 5 states, with the Election Commission "
        "of India (ECI) facing unprecedented challenges. From allegations of EVM tampering to the rapid "
        "spread of AI-generated deepfakes targeting candidates, the integrity of the democratic process "
        "is under intense scrutiny. Both ruling and opposition parties have raised concerns about the "
        "level playing field.\n\n"
        "The stakes are enormous — these state elections are widely seen as a referendum on governance, "
        "unemployment, and inflation. With voter turnout patterns shifting and social media becoming the "
        "primary battleground, the question is: how should India's election machinery evolve to protect "
        "democracy while keeping elections accessible to 900 million eligible voters?"
    ),
    "issue_bullets": [
        "5 state assemblies going to polls simultaneously, testing the ECI's logistical capacity with over 200 million voters.",
        "AI-generated deepfake videos of candidates have gone viral, with the ECI struggling to issue takedown orders fast enough.",
        "Opposition parties allege unequal enforcement of the Model Code of Conduct, while the ruling party accuses rivals of spreading misinformation.",
        "Voter turnout among urban youth (18-25) has dropped by 8% compared to previous elections, raising concerns about democratic disengagement."
    ],
    "status": "live",
    "start_time": datetime.now().isoformat(),
    "end_time": (datetime.now() + timedelta(days=3)).isoformat(),
    "region": "national",
    "confidence_score": 92
}

insert_camp_url = f"{SUPABASE_URL}/rest/v1/campaigns"
res = requests.post(insert_camp_url, headers=HEADERS, json=new_campaign)

if res.status_code in (200, 201):
    inserted_data = res.json()
    campaign_id = inserted_data[0]['id']
    print(f"  Created campaign: {new_campaign['slug']} (ID: {campaign_id})")

    # Insert leader approaches
    approaches = [
        {
            "campaign_id": campaign_id,
            "leader_name": "Narendra Modi",
            "style": "modi",
            "display_position": 1,
            "framing_type": "governance",
            "is_winner": False,
            "policy_bullets": [
                "Backs the ECI's current framework, emphasizing India's track record of conducting the world's largest democratic exercise successfully.",
                "Proposes a 'Digital Shield' initiative — a real-time AI monitoring system to detect and flag deepfakes within 30 minutes of upload on social platforms.",
                "Pushes for simultaneous elections (One Nation, One Election) to reduce poll fatigue, save costs, and minimize governance disruption across states.",
                "Advocates for stricter social media regulations during election periods, requiring platforms to pre-certify political advertisements."
            ]
        },
        {
            "campaign_id": campaign_id,
            "leader_name": "Rahul Gandhi",
            "style": "rahul",
            "display_position": 2,
            "framing_type": "rights",
            "is_winner": False,
            "policy_bullets": [
                "Demands complete autonomy for the Election Commission with a transparent appointment process — no government influence on commissioner selection.",
                "Proposes returning to paper ballot verification (VVPAT) for 100% of votes, not just a sample, to restore public confidence in EVMs.",
                "Calls for a 'Fair Media Act' that mandates equal airtime for all registered parties on news channels during election season.",
                "Advocates for lowering the voting age to 16 and making Election Day a national holiday to boost youth participation and turnout."
            ]
        }
    ]

    insert_app_url = f"{SUPABASE_URL}/rest/v1/leader_approaches"
    for approach in approaches:
        app_res = requests.post(insert_app_url, headers=HEADERS, json=approach)
        if app_res.status_code in (200, 201):
            print(f"  Added approach: {approach['leader_name']}")
        else:
            print(f"  Failed to add approach: {app_res.text}")

    print("\n✅ New campaign is LIVE!")
else:
    print("  ERROR: Failed to create campaign")
    print(res.text)

print("\nDone! Check your Supabase dashboard to verify.")
