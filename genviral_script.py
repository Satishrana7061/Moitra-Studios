import os
from openai import OpenAI
import json

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_script():
    prompt = "Generate a fast-paced 15-second viral script for a Rajneeti PC gameplay Reel. Use a hook like 'YOU THINK YOU CAN RULE INDIA?'. Output ONLY raw JSON with keys: hook_text, middle_text, cta_text."
    response = client.chat.completions.create(
        model="o3-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    print(get_script())
