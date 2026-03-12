import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv
import re

load_dotenv(dotenv_path='server/.env')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in server/.env")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
# We can use gemini-2.5-flash as it's fast and has good world knowledge
model = genai.GenerativeModel('gemini-2.5-flash')

INVENTORY_PATH = 'src/data/inventory.json'
OUTPUT_PATH = 'src/data/brand_websites.json'

def get_unique_prefixes(inventory):
    """
    To reduce API calls, we extract the first 2 words of each product name
    as a provisional 'brand prefix'. We only need to resolve each prefix once.
    """
    prefixes = set()
    for item in inventory:
        name = item.get('name', '')
        words = name.split()
        if len(words) >= 2:
            prefix = f"{words[0]} {words[1]}"
        elif len(words) == 1:
            prefix = words[0]
        else:
            continue
        prefixes.add(prefix)
    return sorted(list(prefixes))

def process_batch(batch):
    prompt = f"""
I have a list of liquor store product name prefixes. I need you to identify the Parent Company or Official Brand for each prefix, and provide the official website URL for that parent company/brand.
For example, if the prefix is "Bud Light" or "Budweiser", the parent company is "Anheuser-Busch" and the URL is "https://www.anheuser-busch.com/".
If the prefix is "Patron Anejo", the brand is "Patron" and the URL is "https://www.patrontequila.com/".

Here is the list of product prefixes:
{json.dumps(batch)}

Return a single JSON object where the keys are the exact prefixes provided, and the values are objects containing "brand" and "url".
Example output format:
{{
  "Bud Light": {{ "brand": "Anheuser-Busch", "url": "https://www.anheuser-busch.com/" }},
  "Patron Anejo": {{ "brand": "Patron", "url": "https://www.patrontequila.com/" }}
}}

Only respond with valid JSON. Do not include markdown formatting like ```json.
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        result = json.loads(text.strip())
        return result
    except Exception as e:
        print(f"Error processing batch: {e}")
        return {}

def main():
    with open(INVENTORY_PATH, 'r') as f:
        inventory = json.load(f)

    # 1. Group items by prefix to minimize LLM token usage
    # We'll map full item names to prefixes locally, and use LLM to map prefixes to URLs.
    print(f"Total inventory items: {len(inventory)}")
    
    prefixes = get_unique_prefixes(inventory)
    print(f"Unique prefixes to process: {len(prefixes)}")

    # Load existing to resume if needed
    brand_mapping = {}
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, 'r') as f:
                brand_mapping = json.load(f)
            print(f"Loaded {len(brand_mapping)} existing mappings.")
        except Exception:
            pass

    # Filter out already processed
    remaining_prefixes = [p for p in prefixes if p not in brand_mapping]
    print(f"Remaining to process: {len(remaining_prefixes)}")

    BATCH_SIZE = 100
    
    for i in range(0, len(remaining_prefixes), BATCH_SIZE):
        batch = remaining_prefixes[i:i + BATCH_SIZE]
        print(f"Processing batch {i//BATCH_SIZE + 1}/{(len(remaining_prefixes)//BATCH_SIZE) + 1} ({len(batch)} items)...")
        
        results = process_batch(batch)
        
        for k, v in results.items():
            # Validate output matches requested format
            if isinstance(v, dict) and 'brand' in v and 'url' in v:
                brand_mapping[k] = v
            elif isinstance(v, str):
                 brand_mapping[k] = {"brand": "Unknown", "url": v}
                
        # Save incrementally
        with open(OUTPUT_PATH, 'w') as f:
             json.dump(brand_mapping, f, indent=2)
             
        time.sleep(2) # rate limit

    print(f"\nCompleted! Saved mapping to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
