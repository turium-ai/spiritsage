const fs = require('fs');
const path = require('path');

// FINAL APPROACH: Name-first classification.
// Product names are the most reliable signal.
// Descriptions/tastingNotes often have mismatched keywords (e.g., Veuve Clicquot tasting noted as "a well-rounded brew").
// Strategy:
//   1. Classify each item based on name keywords first.
//   2. If the name is ambiguous, fall back to the existing DB category.
//   3. Store detailed subType and liquorType for the recommendation engine.

const enrichedPath = path.join(__dirname, 'src', 'data', 'inventory_enriched_orig.json');
let inventory = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));

// Also load the original pristine categories from the backup to use as fallback ground truth
const backupPath = path.join(__dirname, '..', 'liquor-rec-app', 'src', 'data', 'inventory.json.bak');
const backupArr = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const backupById = {};
backupArr.forEach(i => { backupById[i.id] = i; });

// Clear corrupted state from previous runs + normalize size strings
inventory.forEach(item => {
    delete item.subType;
    delete item.liquorType;
    // Restore the original pristine category from backup as a ground truth base
    const backup = backupById[item.id];
    if (backup) item._origCategory = backup.category;
    // Strip errant surrounding quotes from size field (e.g. '"750 ML"' → '750 ML')
    if (typeof item.size === 'string' && item.size.startsWith('"') && item.size.endsWith('"')) {
        item.size = item.size.slice(1, -1);
    }
});

const mkHas = (str) => (...words) => words.some(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(str);
});

const CAT_MAP = {
    'Beer': 'Beer, Cider & Seltzers',
    'Wine': 'Wine',
    'Spirit': 'Spirits',
    'Champagne': 'Champagne',
    'Beer, Cider & Seltzers': 'Beer, Cider & Seltzers',
    'Spirits': 'Spirits',
    'Liqueurs & Cordials': 'Liqueurs & Cordials',
};

let updates = 0;

inventory.forEach(item => {
    // Use the product NAME as the main classification anchor
    const name = item.name.toUpperCase();
    const nameStr = name;
    const has = mkHas(nameStr);

    let assigned = false;

    // 1. Champagne — only true Champagne, NOT Prosecco (which is a sparkling Wine)
    if (has('CHAMPAGNE', 'VEUVE', 'DOM PERIGNON', 'CRISTAL', 'MOET', 'CHANDON', 'BRUT CHAMPAGNE', 'ROEDERER') && !has('HIGH LIFE')) {
        item.category = 'Champagne';
        item.liquorType = 'Champagne';
        assigned = true;
    }
    // 2. Spirits: Whiskey (add brand names to prevent fallthrough)
    else if (has('WHISKEY', 'WHISKY', 'BOURBON', 'SCOTCH', 'SINGLE MALT', 'TENNESSEE WHISKEY', 'WOODFORD', 'JACK DANIEL', 'MAKER\'S MARK', 'MAKERS MARK', 'BULLEIT', 'KNOB CREEK', 'JIM BEAM', 'WILD TURKEY', 'EVAN WILLIAMS', 'ELIJAH CRAIG', 'FOUR ROSES', 'BUFFALO TRACE', 'ANGEL\'S ENVY', 'ANGELS ENVY', 'HIGH WEST', 'REDEMPTION', 'MICHTER', 'WELLER', 'BLANTON', 'PAPPY VAN', 'EAGLE RARE', 'HEAVEN HILL', 'HI-WIRE', 'LEGENT', 'BASIL HAYDEN', 'JEFFERSON', 'OLD FORESTER', 'BIG ASS WHISKEY')) {
        item.category = 'Spirits';
        item.liquorType = 'Whiskey';
        if (has('BOURBON', 'WOODFORD', 'MAKER\'S MARK', 'BULLEIT', 'KNOB CREEK', 'JIM BEAM', 'WILD TURKEY', 'EVAN WILLIAMS', 'ELIJAH CRAIG', 'BUFFALO TRACE', 'FOUR ROSES')) item.subType = 'Bourbon';
        else if (has('SCOTCH', 'SINGLE MALT', 'HIGHLAND', 'ISLAY', 'SPEYSIDE', 'GLENFIDDICH', 'GLENLIVET', 'MACALLAN', 'LAPHROAIG', 'LAGAVULIN', 'BALVENIE', 'OBAN', 'DALMORE')) item.subType = 'Scotch';
        else if (has('IRISH', 'JAMESON', 'BUSHMILLS', 'TULLAMORE')) item.subType = 'Irish Whiskey';
        else if (has('RYE WHISKEY', 'RYE WHISKY')) item.subType = 'Rye';
        else if (has('JAPANESE', 'SUNTORY', 'YAMAZAKI', 'HIBIKI', 'NIKKA')) item.subType = 'Japanese Whisky';
        else if (has('TENNESSEE', 'JACK DANIEL')) item.subType = 'Tennessee Whiskey';
        assigned = true;
    }
    // 3. Spirits: Tequila / Mezcal
    else if (has('TEQUILA', 'MEZCAL')) {
        item.category = 'Spirits';
        item.liquorType = 'Agave Spirits';
        if (has('BLANCO', 'SILVER') && !has('REPOSADO')) item.subType = 'Blanco Tequila';
        else if (has('REPOSADO')) item.subType = 'Reposado Tequila';
        else if (has('AÑEJO', 'ANEJO', 'EXTRA ANEJO')) item.subType = 'Añejo Tequila';
        else if (has('MEZCAL')) item.subType = 'Mezcal';
        else item.subType = 'Tequila';
        assigned = true;
    }
    // 4. Spirits: Vodka
    else if (has('VODKA')) {
        item.category = 'Spirits';
        item.liquorType = 'Vodka';
        assigned = true;
    }
    // 5. Spirits: Rum
    else if (has('RUM') && !has('RHUM AGRICOLE') || has('CACHAÇA')) {
        item.category = 'Spirits';
        item.liquorType = 'Rum';
        if (has('SPICED')) item.subType = 'Spiced Rum';
        else if (has('DARK RUM')) item.subType = 'Dark Rum';
        else if (has('SILVER', 'WHITE RUM')) item.subType = 'White Rum';
        assigned = true;
    }
    // 6. Spirits: Gin
    else if (has('GIN') && !has('GINGER')) {
        item.category = 'Spirits';
        item.liquorType = 'Gin';
        if (has('LONDON DRY')) item.subType = 'London Dry';
        assigned = true;
    }
    // 7. Spirits: Cognac/Brandy
    else if (has('COGNAC', 'BRANDY', 'ARMAGNAC', 'GRAPPA', 'CALVADOS', 'PISCO')) {
        item.category = 'Spirits';
        item.liquorType = 'Brandy';
        if (has('COGNAC')) item.subType = 'Cognac';
        assigned = true;
    }
    // 8. Liqueurs
    else if (has('LIQUEUR', 'FIREBALL', 'SCHNAPPS', 'AMARETTO', 'TRIPLE SEC', 'KAHLUA', 'IRISH CREAM', 'BAILEYS', 'DISARONNO', 'CAMPARI', 'APEROL', 'COINTREAU', 'GRAND MARNIER', 'LIMONCELLO', 'FERNET', 'CHARTREUSE')) {
        item.category = 'Liqueurs & Cordials';
        if (has('CREAM', 'BAILEYS', 'IRISH CREAM')) item.liquorType = 'Cream Liqueur';
        else if (has('CAMPARI', 'APEROL', 'FERNET', 'AMARO', 'CHARTREUSE')) item.liquorType = 'Herbal/Amari';
        else if (has('KAHLUA', 'AMARETTO', 'DISARONNO', 'COFFEE LIQUEUR')) item.liquorType = 'Coffee/Nut Liqueur';
        else if (has('FIREBALL')) item.liquorType = 'Spiced Whisky Liqueur';
        else if (has('TRIPLE SEC', 'COINTREAU', 'GRAND MARNIER')) item.liquorType = 'Orange Liqueur';
        else item.liquorType = 'Fruit Liqueur';
        assigned = true;
    }
    // 9. Cider
    else if (has('CIDER') && !has('ALE')) {
        item.category = 'Beer, Cider & Seltzers';
        item.liquorType = 'Cider';
        assigned = true;
    }
    // 10. Hard Seltzer / RTD
    else if (has('SELTZER', 'WHITE CLAW', 'TRULY', 'HARD ICED TEA', 'TWISTED TEA', 'BAHA ROSA', 'HARD LEMONADE', 'MIKE\'S HARD', 'MIKE S HARD')) {
        item.category = 'Beer, Cider & Seltzers';
        item.liquorType = 'Hard Seltzers / RTDs';
        assigned = true;
    }
    // 11. Specific Beer names / brands (before generic 'WINE' check)
    else if (has('BEER', 'BUDWEISER', 'BUD LIGHT', 'MILLER ', 'COORS', 'CORONA', 'HEINEKEN', 'MODELO', 'STELLA', 'GUINNESS', 'LAGUNITAS', 'SIERRA NEVADA', 'BLUE MOON', 'SAM ADAMS', 'BOSTON LAGER', 'BROOKLYN ')) {
        item.category = 'Beer, Cider & Seltzers';
        item.liquorType = 'Beer';
        if (has('IPA', 'INDIA PALE ALE')) item.subType = 'IPA';
        else if (has('LAGER', 'PILSNER', 'PILSENER')) item.subType = 'Lager/Pilsner';
        else if (has('STOUT', 'PORTER')) item.subType = 'Stout/Porter';
        else if (has('WHEAT', 'HEFEWEIZEN')) item.subType = 'Wheat Beer';
        else if (has('PALE ALE')) item.subType = 'Pale Ale';
        else if (has('ALE')) item.subType = 'Ale';
        assigned = true;
    }
    // 12. Wine (check wine varietals by name, or if the word WINE is in the product name)
    else if (has('WINE', 'PROSECCO', 'CABERNET', 'MERLOT', 'PINOT NOIR', 'SYRAH', 'SHIRAZ', 'MALBEC', 'CHARDONNAY', 'SAUVIGNON BLANC', 'PINOT GRIGIO', 'RIESLING', 'ROSÉ', 'ZINFANDEL', 'MOSCATO', 'VIOGNIER', 'GRENACHE', 'BORDEAUX', 'CHIANTI', 'LAMBRUSCO', 'SANGIOVESE', 'BRUT ROSÉ')) {
        item.category = 'Wine';
        if (has('CABERNET', 'MERLOT', 'PINOT NOIR', 'SYRAH', 'SHIRAZ', 'MALBEC', 'ZINFANDEL', 'GRENACHE', 'SANGIOVESE', 'CHIANTI', 'BORDEAUX')) {
            item.liquorType = 'Red Wine';
            if (has('CABERNET')) item.subType = 'Cabernet Sauvignon';
            else if (has('MERLOT')) item.subType = 'Merlot';
            else if (has('PINOT NOIR')) item.subType = 'Pinot Noir';
        } else if (has('CHARDONNAY', 'SAUVIGNON BLANC', 'PINOT GRIGIO', 'RIESLING', 'MOSCATO', 'VIOGNIER')) {
            item.liquorType = 'White Wine';
        } else if (has('ROSÉ', 'BRUT ROSÉ')) {
            item.liquorType = 'Rosé';
        } else if (has('PROSECCO', 'SPARKLING', 'BRUT', 'CAVA')) {
            item.liquorType = 'Sparkling Wine';
        } else {
            item.liquorType = 'Red Wine'; // Default red for red grape varietals
        }
        assigned = true;
    }

    // --- FALLBACK: Use pristine backup category as ground truth ---
    if (!assigned) {
        const origCat = item._origCategory || 'Beer';  // use pristine backup category, NOT corrupted enriched one
        item.category = CAT_MAP[origCat] || origCat;

        // Additional name-based specificity within the inherited category
        if (item.category === 'Wine') {
            if (has('SPARKLING', 'BRUT') && !has('ROSÉ')) item.liquorType = 'Sparkling Wine';
            else if (has('PORT', 'SHERRY', 'VERMOUTH')) item.liquorType = 'Fortified & Dessert';
            else if (has('RED') || !item.liquorType) item.liquorType = item.liquorType || 'Wine';
        } else if (item.category === 'Beer, Cider & Seltzers') {
            item.liquorType = item.liquorType || 'Beer';
        } else if (item.category === 'Spirits') {
            item.liquorType = item.liquorType || 'Spirit';
        }
    }

    updates++;
});

// ─── POST-PROCESSING PASS ────────────────────────────────────────────────────
// Wines sold in large litre bottles (1.5L, 3L, 4L, 5L boxes, etc.) are
// not beers. If an item ended up as Beer but has a litre-format size,
// AND it's NOT a legitimate large-format beer (Mini Keg, Growler), reclassify it.
const LITER_RE = /^\d+(\.\d+)?\s*(L|LTR|LITER|LITRE|LITRES)$/i;
const LARGE_BEER_KEYWORDS = /KEG|GROWLER|BOMBER/i;

let wineRescued = 0;
let spiritsRescued = 0;

inventory.forEach(item => {
    if (item.category !== 'Beer, Cider & Seltzers') return;
    const size = (item.size || '').trim();
    if (!LITER_RE.test(size)) return;
    if (LARGE_BEER_KEYWORDS.test(item.name)) return;

    // Identify spirits by name (Crown Royal, etc.)
    const name = item.name.toUpperCase();
    const hasName = mkHas(name);
    if (hasName('WHISKEY', 'WHISKY', 'BOURBON', 'SCOTCH', 'VODKA', 'TEQUILA', 'GIN', 'RUM', 'COGNAC', 'BRANDY', 'CROWN ROYAL', 'FIREBALL', 'KAHLUA')) {
        // These are spirits in large bottles — keep them as Spirits
        item.category = 'Spirits';
        if (hasName('VODKA')) item.liquorType = 'Vodka';
        else if (hasName('TEQUILA')) item.liquorType = 'Agave Spirits';
        else if (hasName('GIN') && !hasName('GINGER')) item.liquorType = 'Gin';
        else if (hasName('RUM')) item.liquorType = 'Rum';
        else if (hasName('COGNAC', 'BRANDY')) item.liquorType = 'Brandy';
        else if (hasName('FIREBALL', 'KAHLUA')) { item.category = 'Liqueurs & Cordials'; item.liquorType = 'Liqueur'; }
        else item.liquorType = 'Whiskey';
        spiritsRescued++;
    } else {
        // Default: treat as Wine
        item.category = 'Wine';
        if (hasName('SANGRIA')) item.liquorType = 'Sangria';
        else if (hasName('BURGUNDY', 'CABERNET', 'MERLOT', 'CHIANTI', 'SHIRAZ', 'MALBEC', 'RED', 'PINOT NOIR')) item.liquorType = 'Red Wine';
        else if (hasName('CHABLIS', 'CHARDONNAY', 'SAUVIGNON BLANC', 'PINOT GRIGIO', 'RIESLING', 'MOSCATO', 'WHITE')) item.liquorType = 'White Wine';
        else if (hasName('BLUSH', 'ROSÉ', 'ROSE')) item.liquorType = 'Rosé';
        else if (hasName('SAKE')) { item.category = 'Beer, Cider & Seltzers'; item.liquorType = 'Sake'; return; } // Sake stays
        else item.liquorType = 'Wine';
        wineRescued++;
    }
});

// ─── SECOND POST-PROCESSING: Wine brands/types still trapped in Beer ─────────
// Covers 750ML bottles with well-known wine brand names or wine type keywords
const WINE_BRANDS_RE = /BAREFOOT|CARLO ROSSI|FRANZIA|LIVINGSTON|BLACKSTONE|GALLO|R MONDAVI|MONDAVI|KENDALL[- ]JACKSON|FETZER|SUTTER HOME|YELLOW TAIL|LINDEMAN|CASARSA|HOGUE|BOLLA|OPICI|PETER VELLA|WOODBRIDGE|COLUMBIA CREST|RENE JUNOT|MANISCHEWITZ|CONCORD|TISDALE|FLIPFLOP|RED GUITAR|MIJA/i;
const WINE_TYPE_INNAME_RE = /SANGRIA|PINOT GRIGIO|PINOT NOIR|CHARDONNAY|CABERNET|MERLOT|SAUVIGNON BLANC|RIESLING|MOSCATO|CHABLIS|BURGUNDY|CHIANTI|LAMBRUSCO|ROSÉ|BUBBLY|SPARKLING WINE|CUVEE/i;

let brandRescued = 0;
inventory.forEach(item => {
    if (item.category !== 'Beer, Cider & Seltzers') return;
    if (!WINE_BRANDS_RE.test(item.name) && !WINE_TYPE_INNAME_RE.test(item.name)) return;
    // Keep legit beer brand matches (e.g. "Blue Moon Cuvee" — rare but possible)
    if (/KEG|GROWLER|BOMBER|BREWERY|CRAFT BEER|ALE|LAGER|STOUT|IPA/i.test(item.name)) return;

    const name = item.name.toUpperCase();
    const hasName = mkHas(name);
    item.category = 'Wine';
    if (hasName('SANGRIA')) item.liquorType = 'Sangria';
    else if (hasName('BURGUNDY', 'CABERNET', 'MERLOT', 'CHIANTI', 'MALBEC', 'SYRAH', 'SHIRAZ', 'PINOT NOIR', 'RED')) item.liquorType = 'Red Wine';
    else if (hasName('CHABLIS', 'CHARDONNAY', 'SAUVIGNON BLANC', 'PINOT GRIGIO', 'RIESLING', 'MOSCATO', 'WHITE')) item.liquorType = 'White Wine';
    else if (hasName('BLUSH', 'ROSÉ', 'ROSE')) item.liquorType = 'Rosé';
    else if (hasName('BUBBLY', 'CUVEE', 'SPARKLING')) item.liquorType = 'Sparkling Wine';
    else item.liquorType = 'Wine';
    brandRescued++;
});
console.log(`Brand sweep: rescued ${brandRescued} additional wine-named items from Beer category.`);

// ─── THIRD POST-PROCESSING: Sake / Umeshu / Soju ─────────────────────────────
// These fermented rice/fruit drinks should stay in Beer, Cider & Seltzers
// but with their own liquorType = 'Sake / Rice Wine'
const SAKE_RE = /SAKE|UMESHU|SOJU|NIGORI|GINJO|JUNMAI/i;
let sakeFixed = 0;
inventory.forEach(item => {
    if (!SAKE_RE.test(item.name)) return;
    item.category = 'Beer, Cider & Seltzers';
    item.liquorType = 'Sake / Rice Wine';
    delete item.subType;
    sakeFixed++;
});
console.log(`Sake sweep: fixed ${sakeFixed} Sake/Umeshu/Soju items.`);

// ─── FOURTH POST-PROCESSING: 750ML "Beer" items → Wine ────────────────────────
// No commercial beer ships in a 750ML bottle (except rare Belgian ales).
// Items with genuine beer keywords are kept; everything else becomes Wine.
const GENUINE_BEER_KEYWORDS = /\bALE\b|IPA|LAGER|STOUT|PORTER|\bBEER\b|PILSNER|HEFEWEIZEN|WHEAT BEER|PALE ALE|SAISON|SOUR ALE|TRAPPIST|ABBEY/i;
const GENUINE_SPIRIT_KEYWORDS = /WHISKEY|WHISKY|BOURBON|SCOTCH|VODKA|TEQUILA|\bGIN\b|RUM\b|COGNAC|BRANDY|SCHNAPPS|KIRSCH|GRAPPA|AQUAVIT|ABSINTHE|PISCO|KAHLUA|AMARETTO|LIQUEUR/i;
let ml750Rescued = 0;
inventory.forEach(item => {
    if (item.category !== 'Beer, Cider & Seltzers') return;
    if (item.liquorType === 'Sake / Rice Wine') return; // already fixed
    if (item.liquorType === 'Cider') return;
    if (item.liquorType === 'Hard Seltzers / RTDs') return;
    const size = (item.size || '').toUpperCase().trim();
    if (size !== '750 ML' && size !== '750ML') return;
    if (GENUINE_BEER_KEYWORDS.test(item.name)) return;     // real beer — keep
    if (SAKE_RE.test(item.name)) return;                   // sake — already handled
    if (GENUINE_SPIRIT_KEYWORDS.test(item.name)) {
        // reclassify to Spirits
        item.category = 'Spirits';
        item.liquorType = 'Spirit';
        ml750Rescued++;
        return;
    }
    // Default: treat as Wine
    const name = item.name.toUpperCase();
    const hasN = mkHas(name);
    item.category = 'Wine';
    if (hasN('SANGRIA')) item.liquorType = 'Sangria';
    else if (hasN('MARSALA', 'PORT', 'SHERRY', 'MADEIRA', 'VERMOUTH', 'MUSCAT DE')) item.liquorType = 'Fortified & Dessert';
    else if (hasN('SPUMANTE', 'SPARKLING', 'BUBBLY', 'ASTI', 'CAVA', 'BRUT', 'PROSECCO')) item.liquorType = 'Sparkling Wine';
    else if (hasN('BLUSH', 'ROSÉ', 'ROSE')) item.liquorType = 'Rosé';
    else if (hasN('BLANC', 'CHABLIS', 'CHARDONNAY', 'RIESLING', 'PINOT GRIGIO', 'SAUVIGNON', 'MOSCATO', 'WHITE', 'GRIGIO')) item.liquorType = 'White Wine';
    else item.liquorType = 'Red Wine';   // default — red wine is the standard 750ML
    ml750Rescued++;
});
console.log(`750ML sweep: reclassified ${ml750Rescued} items from Beer to Wine/Spirits.`);

// ─── FIFTH POST-PROCESSING: All remaining ML-sized Beer items ─────────────────
// This catches 375ml, 200ml, 50ml, 187ml, 500ml, 350ml, 700ml items still in Beer.
// Standard beer cans/bottles are: 12 OZ, 16 OZ, 24 OZ, 25 OZ, 32 OZ, 40 OZ, 1 PT.
// Any item measured in ML that isn't a craft/specialty beer is probably not a beer.
// Standard European beer ML sizes that should be left alone: 500ML (some imports), 355ML (standard).
const ANY_ML_RE = /^\d+(\.\d+)?\s*ML$/i;
let mlRescued = 0;
inventory.forEach(item => {
    if (item.category !== 'Beer, Cider & Seltzers') return;
    if (item.liquorType !== 'Beer') return;  // only amend confirmed Beer type
    if (item.liquorType === 'Sake / Rice Wine') return;
    const size = (item.size || '').trim();
    if (!ANY_ML_RE.test(size)) return;
    // Skip 750 ML (already handled by previous pass)
    if (/^750\s*ML$/i.test(size)) return;
    const name = item.name.toUpperCase();
    const hasN = mkHas(name);

    // Keep genuine beers by name keyword
    if (GENUINE_BEER_KEYWORDS.test(name)) return;
    if (SAKE_RE.test(name)) { item.liquorType = 'Sake / Rice Wine'; return; }

    // RTD Cocktails (mini margaritas, marg mixes, hard lemonade, etc.)
    if (hasN('MARGARITA', 'COCKTAIL', 'LEMONADE', 'COSMO', 'MULE', 'PALOMA', 'MOJITO', 'MIMOSA', 'SANGRIA MIX', 'POPTAIL', 'JNRO', 'JNRO', 'SHOTZ', 'SHOT', 'TWISTED', 'CHIDO', 'HAWKE', 'CAZADORES', 'JOSE CUERVO', 'ON THE ROCKS')) {
        item.category = 'Beer, Cider & Seltzers';
        item.liquorType = 'Hard Seltzers / RTDs';
        mlRescued++;
        return;
    }
    // Spirits (mini bottles: vodka, tequila, gin etc.)
    if (GENUINE_SPIRIT_KEYWORDS.test(name) || hasN('AVION', 'SMIRNOFF', 'FIREBALL', 'HENNESSY', 'JOSE CUERVO', 'PATRON', 'BACARDI', 'MR BOSTON', 'JAGERMEISTER', 'JAGER', 'GOLDSCHLAGER', 'PEACH SCHNAPPS', 'KIRSCHWASSER', 'KIRSCH')) {
        item.category = 'Spirits';
        if (hasN('VODKA', 'SMIRNOFF')) item.liquorType = 'Vodka';
        else if (hasN('TEQUILA', 'AVION', 'PATRON')) item.liquorType = 'Agave Spirits';
        else if (hasN('RUM', 'BACARDI')) item.liquorType = 'Rum';
        else if (hasN('BOURBON', 'WHISKEY', 'WHISKY')) item.liquorType = 'Whiskey';
        else if (hasN('COGNAC', 'HENNESSY')) { item.liquorType = 'Brandy'; item.subType = 'Cognac'; }
        else if (hasN('GIN') && !hasN('GINGER')) item.liquorType = 'Gin';
        else if (hasN('SCHNAPPS', 'KIRSCHWASSER', 'KIRSCH', 'GOLDSCHLAGER')) { item.category = 'Liqueurs & Cordials'; item.liquorType = 'Schnapps'; }
        else item.liquorType = 'Spirit';
        mlRescued++;
        return;
    }
    // Liqueurs
    if (hasN('LIQUEUR', 'LIQUOR', 'MR BOSTON', 'JAGERMEISTER', 'JAGER', 'AMARETTO', 'KAHLUA', 'TRIPLE SEC', 'SCHNAPPS', 'LQS', 'BLACKBERRY', 'PEACH', 'RASPBERRY', 'APPLE PIE', 'MINTY')) {
        item.category = 'Liqueurs & Cordials';
        item.liquorType = 'Liqueur';
        mlRescued++;
        return;
    }
    // Wines (half-bottles, splits — 375ml, 187ml are classic wine sizes)
    item.category = 'Wine';
    if (hasN('MARSALA', 'PORT', 'SHERRY', 'TAWNY', 'SAUTERNES', 'MADEIRA', 'CREAM')) item.liquorType = 'Fortified & Dessert';
    else if (hasN('SPARKLING', 'ASTI', 'SPUMANTE', 'BUBBLY', 'CUVEE', 'BRUT', 'MOUSSEUX')) item.liquorType = 'Sparkling Wine';
    else if (hasN('BLUSH', 'ROSÉ', 'ROSE')) item.liquorType = 'Rosé';
    else if (hasN('BLANC', 'CHABLIS', 'CHARDONNAY', 'RIESLING', 'PINOT GRIGIO', 'SAUVIGNON', 'MOSCATO', 'WHITE', 'GRIGIO')) item.liquorType = 'White Wine';
    else item.liquorType = 'Red Wine';
    mlRescued++;
});
console.log(`Universal ML sweep: reclassified ${mlRescued} more items from Beer.`);

console.log(`Categorization complete. Processed ${updates} items.`);
console.log(`Post-processing: rescued ${wineRescued} liter-sized wines and ${spiritsRescued} liter-sized spirits from Beer category.`);

const outputPath = path.join(__dirname, 'src', 'data', 'inventory.json');
fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2));
