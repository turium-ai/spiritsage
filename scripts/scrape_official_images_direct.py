import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import os

INVENTORY_PATH = 'src/data/inventory.json'
OUTPUT_DIR = 'server/public/images/products'

os.makedirs(OUTPUT_DIR, exist_ok=True)

def scrape_images_from_url(url, keywords):
    print(f"  -> Fetching {url}")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status()
        
        soup = BeautifulSoup(r.text, 'html.parser')
        images = []
        
        # 1. Look for images matching keywords in src or alt
        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
            if not src: continue
            
            src = urljoin(url, src)
            alt = img.get('alt', '').lower()
            
            # Simple heuristic
            score = 0
            for kw in keywords:
                if kw in src.lower() or kw in alt:
                    score += 1
                    
            if score > 0 and ('jpg' in src.lower() or 'png' in src.lower() or 'webp' in src.lower()):
                images.append((score, src))
                
        # Sort by score and return top unique urls
        images.sort(reverse=True, key=lambda x: x[0])
        seen = set()
        best_urls = []
        for score, src in images:
            if src not in seen:
                seen.add(src)
                best_urls.append(src)
                if len(best_urls) >= 3:
                    break
                    
        return best_urls
        
    except Exception as e:
        print(f"  -> Scrape error: {e}")
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
    except Exception:
        return False, ""

def main():
    with open(INVENTORY_PATH, 'r') as f:
        inventory = json.load(f)
        
    targets = [item for item in inventory if ('placeholder' in item.get('image', '') or not item.get('image')) and item.get('officialWebsite')]
    batch = targets[:10]
    
    print(f"Testing direct website scraping on {len(batch)} items...\n")

    results = []

    for item in batch:
        site_url = item['officialWebsite']
        name_lower = item['name'].lower()
        keywords = [w for w in name_lower.split() if len(w) > 3]
        if not keywords:
            keywords = name_lower.split()
            
        print(f"Item: {item['name']}")
        
        # Try finding a product search URL or just scrape the homepage
        urls_to_try = [
            site_url,
            urljoin(site_url, '/products'),
            urljoin(site_url, f"/search?q={item['name'].replace(' ', '+')}")
        ]
        
        best_images = []
        for u in urls_to_try:
            imgs = scrape_images_from_url(u, keywords)
            if imgs:
                best_images.extend(imgs)
                break # Found some good candidates
                
        if not best_images:
            print("  ❌ No relevant images found on site.")
            results.append({"id": item['id'], "status": "not_found"})
            continue
            
        success = False
        for img_url in best_images:
            print(f"  -> Candidate: {img_url}")
            
            safe_name = item['name'].lower().replace(" ", "_").replace("/", "_") + "_official"
            ext = 'jpg'
            for test_ext in ['.png', '.webp', '.jpg', '.jpeg']:
                if test_ext in img_url.lower():
                    ext = test_ext.replace('.', '')
                    break
                    
            filename = f"{safe_name}.{ext}"
            
            is_downloaded, path = download_image(img_url, filename)
            if is_downloaded:
                print(f"  ✅ Downloaded to {filename}")
                success = True
                results.append({"id": item['id'], "status": "success", "url": img_url, "file": filename})
                break
                
        if not success:
            results.append({"id": item['id'], "status": "download_failed"})

    print("\nBatch Complete:")
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
