import os
import json
import requests
import pandas as pd
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
from io import BytesIO

# Load environment variables
load_dotenv(dotenv_path='server/.env')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Configure Gemini
if GEMINI_API_KEY:
    # Note: Transitioning to google.genai is recommended per warnings
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

def get_image_url_placeholder(query):
    """
    TODO: Integrate new image fetching strategy (e.g., SerpApi).
    This function currently returns None as a placeholder.
    """
    print(f"Skipping fetch for: {query} (Strategy Reset)")
    return None

def verify_image_with_gemini(image_url, product_name):
    """Verify if the image at image_url is an accurate representation of product_name."""
    if not GEMINI_API_KEY:
        return True, "No Gemini API key provided, skipping verification."
    
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        
        prompt = f"Is this image an accurate, high-quality representation of the alcoholic beverage '{product_name}'? Respond with ONLY 'YES' or 'NO' followed by a brief reason."
        
        result = model.generate_content([prompt, img])
        text = result.text.strip().upper()
        
        is_valid = text.startswith('YES')
        return is_valid, text
    except Exception as e:
        return False, f"Verification failed: {e}"

def process_inventory(batch_size=5):
    inventory_path = 'src/data/inventory.json'
    if not os.path.exists(inventory_path):
        print(f"Error: {inventory_path} not found.")
        return

    with open(inventory_path, 'r') as f:
        inventory = json.load(f)

    processed_count = 0
    updates = []

    for item in inventory:
        if processed_count >= batch_size:
            break
        
        # Only process items with placeholder images
        if 'placeholder' in item.get('image', ''):
            query = f"{item['name']} {item.get('liquorType', item['category'])}"
            print(f"[{processed_count+1}/{batch_size}] Processing: {query}")
            
            # Fetching logic is currently reset
            image_url = get_image_url_placeholder(query)
            
            if image_url:
                print(f"Found image: {image_url}")
                is_valid, reason = verify_image_with_gemini(image_url, item['name'])
                
                if is_valid:
                    print(f"Verified: {reason}")
                    item['image'] = image_url
                    updates.append(item['id'])
                else:
                    print(f"Rejected: {reason}")
            
            processed_count += 1

    # Save progress to a separate file
    output_path = 'scripts/inventory_with_images.json'
    with open(output_path, 'w') as f:
        json.dump(inventory, f, indent=2)
    
    print(f"\n--- Strategy Reset Complete ---")
    print(f"Verified images are currently disabled pending new fetch strategy.")
    print(f"Script skeleton preserved with Gemini verification at {output_path}")

if __name__ == "__main__":
    process_inventory(batch_size=5)
