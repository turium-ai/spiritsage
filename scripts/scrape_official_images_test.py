import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path='server/.env')

API_KEY = os.getenv('GOOGLE_SEARCH_API_KEY')
CX = os.getenv('GOOGLE_SEARCH_CX')

if not API_KEY or not CX:
    print("Error: Search credentials missing from server/.env")
    exit(1)

INVENTORY_PATH = 'src/data/inventory.json'
OUTPUT_DIR = 'server/public/images/products'

os.makedirs(OUTPUT_DIR, exist_ok=True)

def search_image(query, site):
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        'q': query,
        'cx': CX,
        'key': API_KEY,
        'searchType': 'image',
        'siteSearch': site,
        'siteSearchFilter': 'i', # include only from this site
        'num': 3 # get top 3 in case first is broken
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if 'items' in data and len(data['items']) > 0:
            return data['items']
        return []
    except Exception as e:
        print(f"Search API Error for {query}: {e}")
        return []

def download_image(url, filename):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(r.content)
        return True, filepath
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False, str(e)

def main():
    with open(INVENTORY_PATH, 'r') as f:
        inventory = json.load(f)
        
    # Get first 10 items that need an image and have an official website mapped
    targets = [item for item in inventory if ('placeholder' in item.get('image', '') or not item.get('image')) and item.get('officialWebsite')]
    batch = targets[:10]
    
    print(f"Found {len(targets)} total items needing images with known official websites.")
    print(f"Processing first {len(batch)} items...\n")

    results = []

    for item in batch:
        site = item['officialWebsite'].replace('https://', '').replace('http://', '').split('/')[0]
        # remove www. for broader search
        if site.startswith('www.'):
            site = site[4:]
            
        query = f"{item['name']} bottle"
        
        print(f"Searching: '{query}' on site:{site}")
        
        images = search_image(query, site)
        
        if not images:
            print(f"  ❌ No images found on {site}")
            results.append({"id": item['id'], "status": "not_found"})
            continue
            
        success = False
        for img in images:
            img_url = img['link']
            print(f"  -> Found: {img_url}")
            
            safe_name = item['name'].lower().replace(" ", "_").replace("/", "_")
            ext = img_url.split('.')[-1][:4].split('?')[0]
            if ext.lower() not in ['jpg', 'jpeg', 'png', 'webp']:
                ext = 'jpg'
                
            filename = f"{safe_name}.{ext}"
            
            is_downloaded, path = download_image(img_url, filename)
            if is_downloaded:
                print(f"  ✅ Downloaded to {filename}")
                success = True
                results.append({"id": item['id'], "status": "success", "url": img_url, "file": filename})
                break
                
        if not success:
            print("  ❌ Could not download any of the found images.")
            results.append({"id": item['id'], "status": "download_failed"})
            
        time.sleep(1) # rate limit

    print("\nBatch Complete:")
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
