#!/usr/bin/env python3
"""
Region Enrichment Script
Reads 'Whiskey List by Country.ods' and uses it to enrich inventory.json
with 'country', 'originState', and 'region' fields for all whiskey items.

Run: python3 scripts/enrichRegions.py
"""

import json
import re
import sys
import os

try:
    from odf.opendocument import load
    from odf.table import Table, TableRow, TableCell
    from odf.text import P
except ImportError:
    print("ERROR: odfpy not installed. Run: pip install odfpy")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Parse the ODS brand reference file
# ─────────────────────────────────────────────────────────────────────────────

ODS_PATH = os.path.join(os.path.dirname(__file__), '..', 'Whiskey List by Country.ods')
INVENTORY_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'inventory.json')

def extract_ods_brands(ods_path):
    doc = load(ods_path)
    sheets = doc.spreadsheet.getElementsByType(Table)
    sheet = sheets[0]
    rows = sheet.getElementsByType(TableRow)

    brands = []
    for i, row in enumerate(rows):
        if i == 0:
            continue  # skip header row
        cells = row.getElementsByType(TableCell)
        vals = []
        for cell in cells:
            ps = cell.getElementsByType(P)
            vals.append(' '.join(str(p) for p in ps).strip())
        while vals and not vals[-1]:
            vals.pop()
        if not vals:
            continue
        brands.append({
            'brandName': vals[0] if len(vals) > 0 else '',
            'country': vals[1] if len(vals) > 1 else '',
            'state': vals[2] if len(vals) > 2 else '',
            'category': vals[3] if len(vals) > 3 else '',
            'subCategory': vals[4] if len(vals) > 4 else '',
        })
    return brands

# ─────────────────────────────────────────────────────────────────────────────
# 2. Fuzzy brand name matching helpers
# ─────────────────────────────────────────────────────────────────────────────

def normalize(text):
    """Normalizes a string for matching: lowercase, strip punctuation/spaces."""
    text = text.lower()
    text = re.sub(r"['\.,\-]", '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def score_match(item_name_norm, brand_norm):
    """Returns a match score 0-100 for how well an inventory item name matches a brand."""
    if not brand_norm:
        return 0
    # Exact substring match is best
    if brand_norm in item_name_norm:
        return 100
    if item_name_norm in brand_norm:
        return 80
    # Word overlap score
    brand_words = set(brand_norm.split())
    item_words = set(item_name_norm.split())
    overlap = brand_words & item_words
    if not overlap:
        return 0
    # Score based on fraction of brand words that match
    score = int((len(overlap) / len(brand_words)) * 70)
    return score

# ─────────────────────────────────────────────────────────────────────────────
# 3. Region derivation from sub-category and country
# ─────────────────────────────────────────────────────────────────────────────

# Map sub-category / country combos to a clean 'region' label
# This is the lookup the search engine will use
REGION_MAP = {
    'Scotch (Single Malt)': 'Scotland',
    'Scotch (Blended)': 'Scotland',
    'Irish Whiskey': 'Ireland',
    'Japanese Whisky': 'Japan',
    'Canadian Whisky': 'Canada',
    'Tennessee Whiskey': 'USA - Tennessee',
    'Bourbon': 'USA - Kentucky',
    'Finished Bourbon': 'USA - Kentucky',
    'Single Barrel Bourbon': 'USA - Kentucky',
    'Flavored Bourbon': 'USA - Kentucky',
    'Rye': 'USA - Rye',
    'Rye / Bourbon': 'USA - Rye',
    'Bourbon / Rye': 'USA - Rye',
    'Moonshine': 'USA - Moonshine',
    'Alabama Style / Bourbon': 'USA',
    'Local Bourbon / Spirits': 'USA',
    'Blended Whiskey': 'USA',
    'Flavored Whiskey': 'USA',
    'Australian Whisky': 'Australia',
}

def derive_region(brand):
    sub_cat = brand.get('subCategory', '')
    country = brand.get('country', '')
    state = brand.get('state', '').strip().replace('—', '').strip()

    if sub_cat in REGION_MAP:
        region = REGION_MAP[sub_cat]
        # Override the state if we know a more specific US state
        if country == 'USA' and state and region.startswith('USA'):
            region = f'USA - {state}'
        return region.strip()

    # Fallback to country
    if country:
        return country
    return ''

# ─────────────────────────────────────────────────────────────────────────────
# 4. Supplemental brand knowledge base (brands not covered by the ODS)
# ─────────────────────────────────────────────────────────────────────────────
# Format: 'brand_first_word' -> {country, state, subCategory}
# These cover well-known scotch distilleries, Irish brands, Japanese, etc.
SUPPLEMENTAL_BRANDS = {
    # Scotland - Single Malts
    'laphroaig':    {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'lagavulin':    {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'ardbeg':       {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'bowmore':      {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'bruichladdich':{'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'kilchoman':    {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'caol':         {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},  # Caol Ila
    'bunnahabhain': {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'glenfiddich':  {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'glenlivet':    {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'macallan':     {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'aberlour':     {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'auchentoshan': {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'glenmorangie': {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'dalmore':      {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'oban':         {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'talisker':     {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'springbank':   {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'highland':     {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},    # Highland Park
    'glenfarclas':  {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'craigellachie': {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'tomatin':      {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'benromach':    {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'benriach':     {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'speyburn':     {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'tamdhu':       {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Single Malt)'},
    'inver':        {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},       # Inver House
    'clan':         {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},       # Clan MacGregor
    'ballantine':   {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},
    'cutty':        {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},       # Cutty Sark
    'dewar':        {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},
    'famous':       {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},       # Famous Grouse
    # USA - Bourbon
    'bulleit':      {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'four':         {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Four Roses
    'woodford':     {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'maker':        {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Maker's Mark
    'knob':         {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Knob Creek
    'bakers':       {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'booker':       {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'blantons':     {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'buffalo':      {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Buffalo Trace
    'eagles':       {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Eagle Rare
    'pappy':        {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'weller':       {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'evan':         {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Evan Williams
    'elijah':       {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Elijah Craig
    'larceny':      {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    'henry':        {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Henry McKenna
    'old':          {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Old Forester / Old Grand-Dad
    'jim':          {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Jim Beam
    'wild':         {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},             # Wild Turkey
    'zackariah':    {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Bourbon'},
    # USA - Rye
    'rittenhouse':  {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Rye'},
    'sazerac':      {'country': 'USA', 'state': 'Louisiana', 'subCategory': 'Rye'},
    'michter':      {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Rye'},
    'whistlepig':   {'country': 'USA', 'state': 'Vermont', 'subCategory': 'Rye'},
    'hochstadler':  {'country': 'USA', 'state': '', 'subCategory': 'Rye'},
    # USA - Moonshine
    'ole':          {'country': 'USA', 'state': 'Tennessee', 'subCategory': 'Moonshine'},          # Ole Smokey
    'sugarlands':   {'country': 'USA', 'state': 'Tennessee', 'subCategory': 'Moonshine'},
    'midnight':     {'country': 'USA', 'state': 'Tennessee', 'subCategory': 'Moonshine'},          # Midnight Moon
    'moonshine':    {'country': 'USA', 'state': '', 'subCategory': 'Moonshine'},
    # Ireland
    'jameson':      {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'bushmills':    {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'tullamore':    {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'redbreast':    {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'green':        {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},            # Green Spot
    'teeling':      {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'kilbeggan':    {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'powers':       {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'connemara':    {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'slane':        {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'clontarf':     {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},
    'michael':      {'country': 'Ireland', 'state': '', 'subCategory': 'Irish Whiskey'},            # Michael Collins
    # Japan
    'hibiki':       {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    'yamazaki':     {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    'nikka':        {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    'hakushu':      {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    'toki':         {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    'fuji':         {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    'kaiyo':        {'country': 'Japan', 'state': '', 'subCategory': 'Japanese Whisky'},
    # Canada
    'crown':        {'country': 'Canada', 'state': '', 'subCategory': 'Canadian Whisky'},           # Crown Royal
    'canadian':     {'country': 'Canada', 'state': '', 'subCategory': 'Canadian Whisky'},
    'seagram':      {'country': 'Canada', 'state': '', 'subCategory': 'Canadian Whisky'},
    # Common brands with generic liquorType = 'Whiskey'
    'jack':         {'country': 'USA', 'state': 'Tennessee', 'subCategory': 'Tennessee Whiskey'},   # Jack Daniels / Jack Daniel
    'southern':     {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Flavored Whiskey'},    # Southern Comfort
    'mccormick':   {'country': 'USA', 'state': '', 'subCategory': 'Blended Whiskey'},
    'mr':          {'country': 'USA', 'state': '', 'subCategory': 'Blended Whiskey'},               # Mr Boston
    'jb':          {'country': 'Scotland', 'state': '', 'subCategory': 'Scotch (Blended)'},         # J&B Scotch
    'domaine':     {'country': 'France', 'state': '', 'subCategory': 'Flavored Whiskey'},           # Domaine Canton
    'r1':          {'country': 'USA', 'state': 'Kentucky', 'subCategory': 'Rye'},                   # R1 Rye
}

def get_supplemental(item_name_norm):
    """Checks if any first/key word of the product name matches our supplemental brand table."""
    words = item_name_norm.split()
    for word in words[:3]:  # Check first 3 words of product name only
        word_clean = re.sub(r'[^a-z]', '', word)
        if word_clean in SUPPLEMENTAL_BRANDS:
            brand_data = SUPPLEMENTAL_BRANDS[word_clean]
            region = derive_region(brand_data)
            return {
                'country': brand_data['country'],
                'originState': brand_data['state'] or None,
                'region': region,
                'whiskeySubCategory': brand_data['subCategory'],
            }
    return None

# ─────────────────────────────────────────────────────────────────────────────
# 5. Fallback heuristic: derive region from liquorType alone (for unmatched items)
# ─────────────────────────────────────────────────────────────────────────────

def derive_region_from_type(liquor_type):
    """When there's no ODS match, apply known POS taxonomy rules."""
    t = (liquor_type or '').lower()
    if 'scotch' in t or 'single malt' in t:
        return 'Scotland'
    if 'irish' in t:
        return 'Ireland'
    if 'japanese' in t:
        return 'Japan'
    if 'canadian' in t:
        return 'Canada'
    if 'tennessee' in t:
        return 'USA - Tennessee'
    if 'bourbon' in t:
        return 'USA - Kentucky'
    if 'rye' in t:
        return 'USA - Rye'
    if 'moonshine' in t or 'white whiskey' in t or 'corn whiskey' in t:
        return 'USA - Moonshine'
    if 'american' in t or 'blended american' in t:
        return 'USA'
    return ''

def derive_country_from_type(liquor_type):
    t = (liquor_type or '').lower()
    if 'scotch' in t or 'single malt' in t:
        return 'Scotland'
    if 'irish' in t:
        return 'Ireland'
    if 'japanese' in t:
        return 'Japan'
    if 'canadian' in t:
        return 'Canada'
    if any(x in t for x in ['bourbon', 'tennessee', 'rye', 'american', 'moonshine', 'corn whiskey']):
        return 'USA'
    return ''

# ─────────────────────────────────────────────────────────────────────────────
# 5. Main enrichment loop
# ─────────────────────────────────────────────────────────────────────────────

def is_whiskey(item):
    cat = (item.get('category', '') + ' ' + item.get('liquorType', '')).lower()
    return 'whiskey' in cat or 'whisky' in cat

def main():
    print("Loading ODS reference data...")
    brands = extract_ods_brands(ODS_PATH)
    print(f"  → {len(brands)} brands in ODS")

    # Pre-normalize ODS brand names
    for b in brands:
        b['_norm'] = normalize(b['brandName'])

    print("\nLoading inventory.json...")
    with open(INVENTORY_PATH, 'r') as f:
        inventory = json.load(f)
    print(f"  → {len(inventory)} total items")

    whiskeys = [i for i in inventory if is_whiskey(i)]
    print(f"  → {len(whiskeys)} whiskey items to enrich")

    matched = 0
    supplemental = 0
    heuristic = 0
    unmatched_names = []

    for item in inventory:
        if not is_whiskey(item):
            continue

        item_name_norm = normalize(item.get('name', ''))

        best_score = 0
        best_brand = None

        for brand in brands:
            s = score_match(item_name_norm, brand['_norm'])
            if s > best_score:
                best_score = s
                best_brand = brand

        if best_brand and best_score >= 60:
            # Tier 1: Confident match from ODS
            item['country'] = best_brand['country']
            item['originState'] = best_brand['state'].replace('—', '').strip() or None
            item['region'] = derive_region(best_brand)
            item['whiskeySubCategory'] = best_brand['subCategory']
            matched += 1
        else:
            # Tier 2: Supplemental brand keyword lookup
            supp = get_supplemental(item_name_norm)
            if supp:
                item['country'] = supp['country']
                item['originState'] = supp['originState']
                item['region'] = supp['region']
                item['whiskeySubCategory'] = supp['whiskeySubCategory']
                supplemental += 1
            else:
                # Tier 3: Fallback — use heuristic from liquorType field
                liq_type = item.get('liquorType', '')
                region = derive_region_from_type(liq_type)
                country = derive_country_from_type(liq_type)
                if region or country:
                    item['country'] = country or None
                    item['originState'] = None
                    item['region'] = region
                    item['whiskeySubCategory'] = None
                    heuristic += 1
                else:
                    unmatched_names.append(f"  {item.get('name','')} [{liq_type}]")

    print(f"\nResults:")
    print(f"  ODS matched: {matched}")
    print(f"  Supplemental brand matched: {supplemental}")
    print(f"  Heuristic fallback: {heuristic}")
    print(f"  Fully unmatched: {len(unmatched_names)}")
    if unmatched_names:
        print("  Unmatched items:")
        for n in unmatched_names[:20]:
            print(n)

    print(f"\nWriting enriched inventory.json...")
    with open(INVENTORY_PATH, 'w') as f:
        json.dump(inventory, f, indent=2)
    print("  ✓ Done!")

    # Print a sample of what region fields look like now
    print("\nSample enriched items:")
    enriched = [i for i in inventory if is_whiskey(i) and i.get('region')]
    for item in enriched[:10]:
        print(f"  {item['name']:<45} | country={item.get('country','')} | region={item.get('region','')} | sub={item.get('whiskeySubCategory','')}")

if __name__ == '__main__':
    main()
