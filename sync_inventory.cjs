const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * sync_inventory.cjs
 * 
 * Usage: node sync_inventory.cjs <path_to_fresh_ods_json>
 * 
 * Description: 
 *   Daily sync tool that merges fresh store data with the enriched master catalog.
 *   Uses SHA-256 fingerprints to preserve sommelier-grade tasting notes, styles,
 *   and granular categories while updating dynamic fields (Price, Stock, Size).
 */

const MASTER_PATH = path.join(__dirname, 'src', 'data', 'inventory.json');
const MASTER_DATA = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

// Classification regex and logic (Synchronized with apply_all_fixes.cjs)
const BRAND_MAP = [
    { re: /DON JULIO|PATRON|JOSE CUERVO|CUERVO|1800 TEQUILA|HERRADURA|EL JIMADOR|CAZADORES|ESPOLON|OLMECA|SAUZA|MILAGRO|HORNITOS|AVION|CASAMIGOS|CLASE AZUL|CODIGO|TEREMANA|LUNAZUL|CENOTE|TEQUILA/i, cat: 'Spirits', type: 'Tequila' },
    { re: /BACARDI|CAPTAIN MORGAN|MOUNT GAY|RON RICO|RON DIAZ|CRUZAN|MYERS RUM|APPLETON|KRAKEN|SAILOR JERRY|BUMBU|PLANTATION RUM|ANGOSTURA|MONTEGO BAY|FLOR DE CANA|GOSLINGS/i, cat: 'Spirits', type: 'Rum' },
    { re: /JOHNNIE WALKER|CHIVAS|DEWARS|GLENFIDDICH|GLENLIVET|MACALLAN|HIGHLAND PARK|BALVENIE|LAPHROAIG|OBAN|DALMORE|SINGLETON|MONKEY SHOULDER|FAMOUS GROUSE|GRANT'S|WHYTE|HW KIRSCHWASSER|KIRSCHWASSER|GLENMORANGIE|GLENDRONACH|GLENFARCLAS/i, cat: 'Spirits', type: 'Scotch Whisky' },
    { re: /JAMESON|BUSHMILLS|TULLAMORE|JAMESONS|POWERS GOLD|REDBREAST|GREEN SPOT|TEELING/i, cat: 'Spirits', type: 'Irish Whiskey' },
    { re: /JACK DANIEL|GEORGE DICKEL/i, cat: 'Spirits', type: 'Tennessee Whiskey' },
    { re: /MAKER'S MARK|MAKERS MARK|JIM BEAM|WILD TURKEY|KNOB CREEK|BUFFALO TRACE|FOUR ROSES|WOODFORD|BULLEIT|ANGEL'S ENVY|ANGELS ENVY|BASIL HAYDEN|EVAN WILLIAMS|ELIJAH CRAIG|PAPPY VAN WINKLE|OLD FORESTER|HENRY MCKENNA|LARCENY|W\.L\. WELLER|WELLER|BAKERS BOURBON/i, cat: 'Spirits', type: 'Bourbon' },
    { re: /SEAGRAM'S|SEAGRAMS|CROWN ROYAL|CANADIAN CLUB|BLACK VELVET|SOUTHERN COMFORT|FIREBALL/i, cat: 'Spirits', type: 'Whiskey' },
    { re: /RYE WHISKEY|RYE WHISKE|\bRYE\b.*WHISKEY|SAZERAC RYE|HIGH PLAINS RYE|STELLUM RYE|HEMINGWAY RYE|E\.H\. TAYLOR|EH TAYLOR|WHISTLEPIG|PIGGY BACK|YUKON JACK/i, cat: 'Spirits', type: 'Rye Whiskey' },
    { re: /GREY GOOSE|ABSOLUT|SMIRNOFF|KETEL ONE|TITO'S|TITOS|BELVEDERE|CIROC|STOLICHNAYA|STOLI|SKYY|PINNACLE|BURNETT|POPOV|BARTON|SVEDKA|FINLANDIA|BRAND VODKA|LUKSUSOWA|CHOPIN|BORU VODKA|PUTINKA|ZELIKOV|SOBIESKI|HANGAR 1|ULTRAMARINO/i, cat: 'Spirits', type: 'Vodka' },
    { re: /HENDRICKS|TANQUERAY|BOMBAY SAPPHIRE|BEEFEATER|GORDON'S|GORDONS GIN|AVIATION GIN|BOTANIST|ROKU GIN|NOLETS|JUNIPERO|HAYMAN|CITADELLE/i, cat: 'Spirits', type: 'Gin' },
    { re: /HENNESSY|REMY MARTIN|COURVOISIER|MARTELL|CAMUS COGNAC|DELAMAIN|HINE COGNAC|DUSSE|DUSS[EÉ]|SOLIGNAC|CONJURE|RASTIGNAC|NAUD|NYAK/i, cat: 'Spirits', type: 'Cognac' },
    { re: /KORBEL BRANDY|E\. & J\.|E&J BRANDY|CHRISTIAN BROTHERS|PAUL MASSON BRANDY|TORRES BRANDY|METAXA|ASBACH|STOCK BRANDY/i, cat: 'Spirits', type: 'Brandy' },
    { re: /RUMPLEMINZE|RUMPLE MINZE|DEKUYPER|PEPPERMINT SCHNAPPS|PEACH SCHNAPPS|BUTTERSCOTCH|GOLDSCHLAGER|JAGERMEISTER|JAGER|KAMORA|TIA MARIA|AMARETTO|DI AMORE|DISARONNO|BAILEYS|BAILIES|IRISH CREAM|KAHLUA|FRANGELICO|LIMONCELLO|MIDORI|ST GERMAIN|CHAMBORD|COINTREAU|GRAND MARNIER|TRIPLE SEC|SCHNAPPS|KAPALI|COFFEE LIQUEUR|LUXARDO|MARASCHINO/i, cat: 'Liqueurs & Cordials', type: 'Liqueur' },
];

function getFingerprint(id, name) {
    const rawString = `${id}|${name}`;
    return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 16).toUpperCase();
}

function classifyItem(item) {
    const name = (item.name || '').toUpperCase();
    const size = (item.size || '').toUpperCase();

    // NA check
    const isExplicitNA = name.includes('NON ALCOHOL') || name.includes('NON ALC') || name.includes('0.0') || name.includes('ZERO ALCOHOL');
    const isSoftDrink = /\bSODA\b|\bWATER\b|\bTONIC\b|\bCLUB SODA\b|\bFOXON\b|\bFEVER TREE\b|\bPOLAND SPRING\b|\bAQUAFINA\b|\bGINGER BEER\b/i.test(name);
    const hasSpiritKeyword = /VODKA|GIN|RUM|WHISKEY|BOURBON|SCOTCH|TEQUILA|LIQUEUR/i.test(name);

    if (isExplicitNA || (isSoftDrink && !name.includes('HARD') && !name.includes('ALC ') && !hasSpiritKeyword)) {
        item.category = 'Non-Alcoholic';
        item.liquorType = name.includes('WINE') ? 'Non-Alcoholic Wine' : (name.includes('BEER') ? 'Non-Alcoholic Beer' : 'Non-Alcoholic Beverage');
        return item;
    }

    // Spirit Resolution
    for (const rule of BRAND_MAP) {
        if (rule.re.test(name)) {
            item.category = rule.cat;
            item.liquorType = rule.type;
            return item;
        }
    }

    // Wine varietal fallback
    if (item.category === 'Wine' || /WINE|CABERNET|CHARDONNAY|MERLOT|CHIANTI|MALBEC/i.test(name)) {
        item.category = 'Wine';
        if (/PORT|SHERRY|VERMOUTH|MARSALA/i.test(name)) item.liquorType = 'Fortified & Dessert';
        else if (/CHARDONNAY|WHITE/i.test(name)) item.liquorType = 'White Wine';
        else item.liquorType = item.liquorType || 'Red Wine';
    }

    return item;
}

function sync(freshDataPath) {
    if (!fs.existsSync(freshDataPath)) {
        console.error(`Error: Fresh data file not found at ${freshDataPath}`);
        process.exit(1);
    }

    const freshData = JSON.parse(fs.readFileSync(freshDataPath, 'utf8'));
    const masterMap = new Map();
    MASTER_DATA.forEach(item => masterMap.set(item.fingerprint, item));

    let updatedPrices = 0;
    let newItems = 0;
    let priceChanges = [];

    const result = freshData.map(freshItem => {
        // 1. Generate fingerprint for incoming item
        const fp = getFingerprint(freshItem.id, freshItem.name);

        // 2. Lookup in master
        const existing = masterMap.get(fp);

        if (existing) {
            // Found: Update dynamic fields while preserving enriched ones
            if (existing.price !== freshItem.price) {
                priceChanges.push(`${freshItem.name}: $${existing.price} -> $${freshItem.price}`);
                existing.price = freshItem.price;
                updatedPrices++;
            }
            existing.stock = freshItem.stock || 0;
            existing.size = freshItem.size || existing.size;
            return existing;
        } else {
            // New Item: Categorize using rules
            const initialized = {
                ...freshItem,
                fingerprint: fp,
                category: freshItem.category || 'Spirits',
                description: 'Expert analysis pending...',
                image: '/images/placeholder_generic.png',
                isNew: true
            };
            const categorized = classifyItem(initialized);
            newItems++;
            return categorized;
        }
    });

    // Save back to master
    fs.writeFileSync(MASTER_PATH, JSON.stringify(result, null, 2));

    console.log('--- INVENTORY SYNC RESULTS ---');
    console.log('Total Items in Fresh Feed:', freshData.length);
    console.log('Updated Prices/Stock:', updatedPrices);
    console.log('New Items Successfully Categorized:', newItems);
    if (priceChanges.length > 0) {
        console.log('\nSample Price Changes:');
        priceChanges.slice(0, 5).forEach(c => console.log(' -', c));
    }
    console.log('\n✅ Enriched Inventory Synchronized Successfully.');
}

// CLI usage
const target = process.argv[2];
if (target) {
    sync(target);
} else {
    console.log('Usage: node sync_inventory.cjs <path_to_fresh_json>');
}
