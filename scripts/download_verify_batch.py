import os
import json
import requests
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
from io import BytesIO
import time

# Load environment variables
load_dotenv(dotenv_path='server/.env')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in .env")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-image')

# Configuration
INVENTORY_PATH = 'src/data/inventory.json'
IMAGES_DIR = 'server/public/images/products'
TEMP_DIR = 'scripts/temp_images'

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

batch_1 = [
    {"id": 1000, "name": "Budweiser 6pk Bott", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/81/8105/810599/810599.jpg"},
    {"id": 1001, "name": "Budweiser 12 Pck Bott", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/81/8105/810501/810501.jpg"},
    {"id": 1002, "name": "Budweiser 16 Oz Can", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/81/8106/810640/810640.jpg"},
    {"id": 1003, "name": "Presidential 10 Yr Tawny Port", "url": "https://media.bevmo.com/image/upload/c_pad,f_auto,h_600,q_auto,w_600/v1/products/2635.png"},
    {"id": 1004, "name": "Bud Light 6pk Bott", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/81/8105/810594/810594.jpg"},
    {"id": 1005, "name": "Bud Light 12 Pck Bott", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/81/8105/810502/810502.jpg"},
    {"id": 1006, "name": "H W Blue Curacao", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/11/1131/113150/113150.jpg"},
    {"id": 1007, "name": "Opici Chianti", "url": "https://www.totalwine.com/dynamic/x1000,sq/images/14319750-1-fr.png"},
    {"id": 1011, "name": "Patron Anejo", "url": "https://www.binnys.com/cdn-cgi/image/width=1000,height=1000,fit=pad,background=%23fff,format=auto/globalassets/catalogs/binnys/15/1504/150478/150478.jpg"},
    {"id": 1014, "name": "Taylor Lake Country White", "url": "https://www.totalwine.com/dynamic/x1000,sq/images/1276030-1-fr.png"}
]

def verify_image(image_bytes, product_name):
    try:
        img = Image.open(BytesIO(image_bytes))
        prompt = f"Is this image an accurate, high-quality representation of the alcoholic beverage '{product_name}'? Respond with ONLY 'YES' or 'NO' followed by a brief reason."
        
        result = model.generate_content([prompt, img])
        text = result.text.strip().upper()
        return text.startswith('YES'), text
    except Exception as e:
        return False, f"Verification error: {e}"

def main():
    with open(INVENTORY_PATH, 'r') as f:
        inventory = json.load(f)

    updated_ids = []

    for item_meta in batch_1:
        name = item_meta["name"]
        url = item_meta["url"]
        prod_id = item_meta["id"]
        
        print(f"Processing: {name}...")
        
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            is_valid, reason = verify_image(response.content, name)
            
            if is_valid:
                print(f"✅ Verified: {reason}")
                
                # Save image
                safe_name = name.lower().replace(" ", "_").replace("/", "_")
                ext = "png" if ".png" in url.lower() else "jpg"
                filename = f"{safe_name}.{ext}"
                filepath = os.path.join(IMAGES_DIR, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                # Update inventory
                for item in inventory:
                    if item["id"] == prod_id:
                        item["image"] = f"/images/products/{filename}"
                        updated_ids.append(prod_id)
                        break
            else:
                print(f"❌ Rejected: {reason}")
                
        except Exception as e:
            print(f"⚠️ Failed to process {name}: {e}")
        
        time.sleep(1) # Rate limit

    # Save inventory
    with open(INVENTORY_PATH, 'w') as f:
        json.dump(inventory, f, indent=2)
    
    print(f"\nBatch complete. Updated {len(updated_ids)} items.")

if __name__ == "__main__":
    main()
