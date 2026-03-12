#!/usr/bin/env python3
"""
Unified Refresh Inventory Script
1. Reads 'Whiskey List by Country.ods'
2. Reads current 'src/data/inventory.json'
3. Performs Region Enrichment (3-tier matching)
4. Saves enriched data back to src/ data and server/ data
"""

import json
import re
import sys
import os
import shutil

try:
    from odf.opendocument import load
    from odf.table import Table, TableRow, TableCell
    from odf.text import P
except ImportError:
    print("ERROR: odfpy not installed. Run: pip install odfpy")
    sys.exit(1)

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ODS_PATH = os.path.join(BASE_DIR, 'Whiskey List by Country.ods')
SRC_INV_PATH = os.path.join(BASE_DIR, 'src/data/inventory.json')
SERVER_INV_PATH = os.path.join(BASE_DIR, 'server/data/inventory.json')

def extract_ods_brands(ods_path):
    if not os.path.exists(ods_path):
        print(f"Warning: ODS file not found at {ods_path}")
        return []
    doc = load(ods_path)
    sheets = doc.spreadsheet.getElementsByType(Table)
    sheet = sheets[0]
    rows = sheet.getElementsByType(TableRow)
    brands = []
    for i, row in enumerate(rows):
        if i == 0: continue
        cells = row.getElementsByType(TableCell)
        vals = []
        for cell in cells:
            ps = cell.getElementsByType(P)
            vals.append(' '.join(str(p) for p in ps).strip())
        while vals and not vals[-1]: vals.pop()
        if not vals: continue
        brands.append({
            'brandName': vals[0] if len(vals) > 0 else '',
            'country': vals[1] if len(vals) > 1 else '',
            'state': vals[2] if len(vals) > 2 else '',
            'category': vals[3] if len(vals) > 3 else '',
            'subCategory': vals[4] if len(vals) > 4 else '',
        })
    return brands

def normalize(text):
    text = (text or '').lower()
    text = re.sub(r"['\.,\-]", '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def score_match(item_name_norm, brand_norm):
    if not brand_norm: return 0
    if brand_norm in item_name_norm: return 100
    brand_words = set(brand_norm.split())
    item_words = set(item_name_norm.split())
    overlap = brand_words & item_words
    if not overlap: return 0
    return int((len(overlap) / len(brand_words)) * 70)

REGION_MAP = {
    'Scotch (Single Malt)': 'Scotland', 'Scotch (Blended)': 'Scotland',
    'Irish Whiskey': 'Ireland', 'Japanese Whisky': 'Japan', 'Canadian Whisky': 'Canada',
    'Tennessee Whiskey': 'USA - Tennessee', 'Bourbon': 'USA - Kentucky',
    'Finished Bourbon': 'USA - Kentucky', 'Single Barrel Bourbon': 'USA - Kentucky',
    'Flavored Bourbon': 'USA - Kentucky', 'Rye': 'USA - Rye',
    'Rye / Bourbon': 'USA - Rye', 'Bourbon / Rye': 'USA - Rye',
    'Moonshine': 'USA - Moonshine', 'Australian Whisky': 'Australia'
}

def derive_region(brand):
    sub_cat = brand.get('subCategory', '')
    country = brand.get('country', '')
    state = brand.get('state', '').strip().replace('—', '').strip()
    if sub_cat in REGION_MAP:
        region = REGION_MAP[sub_cat]
        if country == 'USA' and state and region.startswith('USA'):
            region = f'USA - {state}'
        return region.strip()
    return country if country else ''

SUPPLEMENTAL_BRANDS = {
    'laphroaig': {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'macallan': {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'bulleit': {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'jameson': {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'jack': {'country': 'USA', 'state': 'Tennessee', 'subCategory': 'Tennessee Whiskey'},
    'hibiki': {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
} # This is a shortened list for the script, could be expanded.

def get_supplemental(item_name_norm):
    words = item_name_norm.split()
    for word in words[:3]:
        word_clean = re.sub(r'[^a-z]', '', word)
        if word_clean in SUPPLEMENTAL_BRANDS:
            brand_data = SUPPLEMENTAL_BRANDS[word_clean]
            return {
                'country': brand_data['country'],
                'originState': brand_data['state'] or None,
                'region': derive_region(brand_data),
                'whiskeySubCategory': brand_data['subCategory'],
            }
    return None

def main():
    print(f"Loading inventory from {SRC_INV_PATH}...")
    with open(SRC_INV_PATH, 'r') as f:
        inventory = json.load(f)
    
    brands = extract_ods_brands(ODS_PATH)
    for b in brands: b['_norm'] = normalize(b['brandName'])
    
    stats = {'matched': 0, 'supplemental': 0, 'heuristic': 0, 'unmatched': 0}
    
    for item in inventory:
        cat_type = (item.get('category', '') + ' ' + item.get('liquorType', '')).lower()
        if not ('whiskey' in cat_type or 'whisky' in cat_type): continue
        
        name_norm = normalize(item.get('name', ''))
        best_brand, best_score = None, 0
        for b in brands:
            s = score_match(name_norm, b['_norm'])
            if s > best_score:
                best_score, best_brand = s, b
        
        if best_brand and best_score >= 60:
            item['country'] = best_brand['country']
            item['originState'] = best_brand['state'].replace('—', '').strip() or None
            item['region'] = derive_region(best_brand)
            item['whiskeySubCategory'] = best_brand['subCategory']
            stats['matched'] += 1
        else:
            supp = get_supplemental(name_norm)
            if supp:
                item.update(supp)
                stats['supplemental'] += 1
            else:
                stats['unmatched'] += 1

    print(f"Results: Matched={stats['matched']}, Supp={stats['supplemental']}, Unmatched={stats['unmatched']}")
    
    # Save back to both src and server
    for p in [SRC_INV_PATH, SERVER_INV_PATH]:
        if os.path.exists(os.path.dirname(p)):
            with open(p, 'w') as f: json.dump(inventory, f, indent=2)
            print(f"Updated: {p}")
        else:
            print(f"Skipped (dir not found): {p}")
    print("Refresh complete.")

if __name__ == "__main__":
    main()
