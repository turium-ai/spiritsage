import json
import time
from duckduckgo_search import DDGS
import os

INVENTORY_PATH = 'src/data/inventory.json'
OUTPUT_PATH = 'scripts/discovery_results.json'
BATCH_SIZE = 50

def main():
    with open(INVENTORY_PATH, 'r') as f:
        inventory = json.load(f)

    # Find items that need images (have placeholder)
    needs_image = [item for item in inventory if not item.get('image') or 'placeholder' in item.get('image', '')]
    print(f"Found {len(needs_image)} items needing images.")
    
    batch = needs_image[:BATCH_SIZE]
    print(f"Processing batch of {len(batch)} items...")

    ddgs = DDGS()
    results = []

    for item in batch:
        query = f"{item['name']} bottle liquor store white background"
        print(f"Searching for: {query} ({item['id']})")
        
        candidates = []
        try:
            # Get up to 5 image results
            search_results = ddgs.images(query, max_results=5)
            if search_results:
                candidates = [img['image'] for img in search_results if img.get('image')]
            
            print(f"  -> Found {len(candidates)} candidate URLs")
        except Exception as e:
            print(f"  -> Failed: {e}")
            
        results.append({
            'id': item['id'],
            'name': item['name'],
            'candidates': candidates
        })
        
        time.sleep(2) # be polite to the search engine
        
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(results, f, indent=2)
        
    print(f"Saved discovery results to {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
