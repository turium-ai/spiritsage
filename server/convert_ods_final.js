const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const odsPath = '/home/turium/.gemini/antigravity/scratch/liquor-rec-app/INVENTORY_20240102134439.ods';
const outputPath = '/home/turium/.gemini/antigravity/scratch/liquor-rec-app/src/data/inventory.json';

function toTitleCase(str) {
    return str.toLowerCase().split(' ').map(word => {
        return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
}

function getCategory(dcode, name) {
    const d = dcode ? dcode.trim() : '';
    const n = name.toUpperCase();

    // 1. Keyword-based Classification (High Confidence)
    const wineKeywords = ['CABERNET', 'CHARDONNAY', 'PINOT', 'MERLOT', 'MALBEC', 'SAUVIGNON', 'ROSE', 'BLANC', 'RIOJA', 'BORDEAUX', 'MOSCATO', 'PROSECCO', 'CHAMPAGNE', 'BRUT', 'RIESLING', 'CHIANTI', 'ZINFANDEL', 'WINE', 'CHARD', 'ZIN', 'PORT', 'SHERRY', 'VERMOUTH', 'BORGHERESE'];
    const beerKeywords = ['BEER', 'IPA', 'ALE', 'LAGER', 'LITE', 'BUDWEISER', 'HEINEKEN', 'CORONA', 'GUINNESS', 'STELLA', 'MODELO', 'SELTZER', 'CIDER', 'PILSNER', 'STOUT', 'PORTER', 'SAMUEL ADAMS', 'COORS', 'BUSCH', 'MICHELOB', 'PABST', 'BLUE MOON'];
    const spiritKeywords = ['VODKA', 'GIN', 'TEQUILA', 'WHISKEY', 'WHISKY', 'BOURBON', 'RUM', 'BRANDY', 'COGNAC', 'LIQUEUR', 'CORDIAL', 'SCOTCH', 'RYE', 'MEZCAL', 'TRIPLE SEC', 'AMARETTO', 'SCHNAPPS', 'HENNESSY', 'TITO', 'DON JULIO', 'PATRON', 'JACK DANIEL', 'MACALLAN', 'JAMESON', 'CURACAO', 'BACARDI', 'KAPALI', 'KAHLUA', 'MALIBU', 'CAPTAIN MORGAN', 'ABSOLUT', 'JOHNNIE WALKER', 'DEKUYPER', 'SOUTHERN COMFORT', 'GORDONS', 'TANQUERAY', 'BAILEYS', 'KAHLUA', 'CAMPARI', 'APERTIVO', 'BITTERS'];

    if (wineKeywords.some(kw => n.includes(kw))) return 'Wine';
    if (spiritKeywords.some(kw => n.includes(kw))) return 'Spirit';
    if (beerKeywords.some(kw => n.includes(kw))) return 'Beer';

    // 2. Department Code Mapping (Fallback)
    const wineCodes = ['A07', 'A14', 'A16', 'A17', 'A18', 'A19', 'A20', 'A22', 'A25', 'A27'];
    if (wineCodes.includes(d)) return 'Wine';
    if (d === 'A05') return 'Beer';
    if (d === 'A01' || d === 'A02' || d === 'A03' || d === 'A04') return 'Spirit';

    return 'Other';
}

function getFlavorProfile(name, category) {
    const n = name.toUpperCase();

    const boldKeywords = ['IPA', 'STOUT', 'CABERNET', 'BOURBON', 'AGED', 'DARK', 'MALBEC', 'SYRAH', 'DOUBLE', 'TRIPLE', 'TENNESSEE', 'SCOTCH', 'OAK'];
    const crispKeywords = ['LITE', 'LAGER', 'SAUVIGNON', 'VODKA', 'GIN', 'DRY', 'PILSNER', 'BLANC', 'SILVER', 'BLANCO', 'CLEAN', 'NEUTRAL', 'CHARDONNAY', 'PINOT GRIGIO'];
    const fruityKeywords = ['MOSCATO', 'ROSE', 'SELTZER', 'LIQUEUR', 'SWEET', 'FRUIT', 'BERRY', 'PEACH', 'CITRUS', 'SANGRIA', 'PROSECCO', 'BUBBLY', 'APPLE', 'CHERRY'];
    const smokyKeywords = ['ISLAY', 'PEATED', 'SMOKED', 'MEZCAL', 'OAK', 'BARREL', 'TOASTED', 'EARTHY', 'LAGAVULIN', 'TALISKER', 'ARDBEG'];

    if (smokyKeywords.some(kw => n.includes(kw))) return 'Smoky';
    if (boldKeywords.some(kw => n.includes(kw))) return 'Bold';
    if (fruityKeywords.some(kw => n.includes(kw))) return 'Fruity';
    if (crispKeywords.some(kw => n.includes(kw))) return 'Crisp';

    return 'Balanced';
}

function getImage(name, category) {
    const n = name.toUpperCase();

    // Tier 1: Exact/Brand Matches
    if (n.includes('BLUE MOON')) return '/images/blue_moon.png';
    if (n.includes('BULLEIT')) return '/images/bulleit_bourbon.png';
    if (n.includes('CHIMAY')) return '/images/chimay.png';
    if (n.includes('COORS LIGHT')) return '/images/coors_light_can.png';
    if (n.includes('CORONA')) return '/images/corona_extra.png';
    if (n.includes('COTE DES ROSES')) return '/images/cote.png';
    if (n.includes('DON JULIO')) return '/images/donjulio.png';
    if (n.includes('GOLDEN STATE CIDER')) return '/images/golden_state_cider.png';
    if (n.includes('GREY GOOSE')) return '/images/greygoose.png';
    if (n.includes('HENDRICK')) return '/images/hendricks.png';
    if (n.includes('JOSH CELLARS')) return '/images/josh_cellars.png';
    if (n.includes('LAGAVULIN')) return '/images/lagavulin.png';
    if (n.includes('LAGUNITAS')) return '/images/lagunitas_ipa.png';
    if (n.includes('MACALLAN')) return '/images/macallan.png';
    if (n.includes('MODELO NEGRA')) return '/images/modelo_negra.png';
    if (n.includes('MODELO')) return n.includes('CAN') ? '/images/modelo_can.png' : '/images/modelo_bottle.png';
    if (n.includes('PACIFICO')) return '/images/pacifico.png';
    if (n.includes('SIERRA NEVADA PALE ALE')) return '/images/sierra_nevada_pale_ale.png';
    if (n.includes('SIERRA NEVADA')) return '/images/sierra_nevada.png';
    if (n.includes('TWISTED TEA')) return '/images/twisted_tea.png';
    if (n.includes('VEUVE CLICQUOT')) return '/images/veuve.png';
    if (n.includes('WHITE CLAW')) return '/images/white_claw.png';

    // Tier 2: Category Placeholders
    switch (category) {
        case 'Beer': return '/images/placeholder_beer.png';
        case 'Wine': return '/images/placeholder_wine.png';
        case 'Spirit': return '/images/placeholder_spirit.png';
        default: return '/images/placeholder.png';
    }
}

function getTastingNotes(name, category, style) {
    const notes = {
        'Beer': {
            'Bold': 'Expect notes of toasted malt, chocolate, or heavy hops.',
            'Crisp': 'Light-bodied with a clean, refreshing finish.',
            'Fruity': 'Bright and bubbly with subtle fruit undertones.',
            'Smoky': 'Deeply toasted with a hint of campfire or peat.',
            'Balanced': 'A well-rounded brew with subtle malt and hop notes.'
        },
        'Wine': {
            'Bold': 'Rich tannins with dark fruit and oak influences.',
            'Crisp': 'High acidity with citrus and mineral notes.',
            'Fruity': 'Sweet and aromatic with summer fruit flavors.',
            'Smoky': 'Earthy undertones with a hint of toasted wood.',
            'Balanced': 'Harmonious fruit and acidity with a smooth finish.'
        },
        'Spirit': {
            'Bold': 'Complex and intense with strong character and depth.',
            'Crisp': 'Pure and sharp, perfect for clean cocktails.',
            'Fruity': 'Sweet botanical or fruit infusions.',
            'Smoky': 'Distinctive peat and charred wood influence.',
            'Balanced': 'Smooth and versatile for sipping or mixing.'
        }
    };

    return notes[category]?.[style] || 'A versatile choice for any occasion.';
}

try {
    console.log('Starting Cleanup & Normalization conversion...');
    const workbook = XLSX.readFile(odsPath);
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const cleanData = rawData.map((item, index) => {
        let name = item.item_name ? item.item_name.trim().replace(/\s+/g, ' ') : 'Unknown Item';
        const priceStr = item.price ? item.price.toString().replace(/[^0-9.]/g, '') : '0';
        const price = parseFloat(priceStr);
        const category = getCategory(item.dcode, name);
        const flavor = getFlavorProfile(name, category);

        // Final name normalization
        name = toTitleCase(name);

        return {
            id: index + 1000,
            name: name,
            category: category,
            price: price,
            size: item.size ? item.size.trim() : 'N/A',
            style: flavor,
            flavorProfile: flavor,
            tastingNotes: getTastingNotes(name, category, flavor),
            image: getImage(name, category),
            stock: item.stock_count || 0
        };
    }).filter(item =>
        item.name !== 'Unknown Item' &&
        item.price > 0 &&
        item.category !== 'Other' // Prune miscellaneous items
    );

    // Save to src/data
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(cleanData, null, 2));
    console.log(`Successfully converted ${cleanData.length} cleaned items to ${outputPath}`);

} catch (err) {
    console.error('Conversion failed:', err);
}
