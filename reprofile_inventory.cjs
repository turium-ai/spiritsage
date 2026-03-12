const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, 'src', 'data', 'inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

/**
 * reprofile_inventory.cjs
 * 
 * Logic:
 *   1. Analyze Name + Description for 5 key flavor markers.
 *   2. Use Category/Type as a baseline score.
 *   3. Assign the Winner.
 */

const PROFILES = {
    BOLD: 'Bold',
    CRISP: 'Crisp',
    FRUITY: 'Fruity',
    SMOKY: 'Smoky',
    BALANCED: 'Balanced'
};

const RULES = {
    [PROFILES.BOLD]: {
        keywords: /OAK|VANILLA|CARAMEL|RICH|INTENSE|FULL-BODIED|HEAVY|DARK|STOUT|PORTER|COFFEE|CHOCOLATE|BARREL|BOURBON|ANEJO|TANNIC|COMPLEX|ROBUST|LEATHER|PEPPER/i,
        types: /STOUT|PORTER|BOURBON|COGNAC|ANEJO|CABERNET|MALBEC|ZINFANDEL|PORT|SHERRY|DOUBLE IPA/i,
        weight: 1.2
    },
    [PROFILES.CRISP]: {
        keywords: /CLEAN|REFRESHING|DRY|MINERAL|CITRUS|LEMON|LIME|LIGHT|ZESTY|BRACING|CRISP|PALE LAGER|PILSNER|GIN|VODKA|BLANCO|PINOT GRIGIO|SAUVIGNON BLANC/i,
        types: /LAGER|PILSNER|VODKA|GIN|BLANCO|SAUVIGNON BLANC|PINOT GRIGIO|CHABLIS|RIESLING DRY/i,
        weight: 1.1
    },
    [PROFILES.FRUITY]: {
        keywords: /FRUIT|BERRY|CHERRY|SWEET|JAMMY|MOSCATO|RIESLING|LIQUEUR|PEACH|APPLE|GRAPE|STRAWBERRY|TROPICAL|PINEAPPLE|MANGO|CANDY|VIBRANT|LUSCIOUS/i,
        types: /MOSCATO|RIESLING|LIQUEUR|SCHNAPPS|ROSE|SANGRIA|SELZTER|CIDER|SOUR/i,
        weight: 1.0
    },
    [PROFILES.SMOKY]: {
        keywords: /SMOKE|PEAT|CHARRED|EARTHY|MEZCAL|ISLAY|SMOKY|TOASTED|ROASTED|TOBACCO|ASH|CAMPFIRE/i,
        types: /MEZCAL|ISLAY|RAUCHBIER|SMOKED/i,
        weight: 1.5 // High priority if smoky keywords found
    },
    [PROFILES.BALANCED]: {
        keywords: /SMOOTH|WELL-ROUNDED|HARMONY|GRACEFUL|BALANCED|CLASSIC|TRADITIONAL|BLEND|EASY-DRINKING|VERSATILE/i,
        types: /PALE ALE|AMBER|MERLOT|CHARDONNAY|BLENDED WHISKEY/i,
        weight: 0.9
    }
};

const BRAND_OVERRIDES = [
    { name: /LAPHROAIG|LAGAVULIN|ARDBEG|TALISKER|CAOL ILA|PORT CHARLOTTE|MEZCAL/i, profile: PROFILES.SMOKY },
    { name: /MACALLAN|BALVENIE|DALMORE|HENNESSY|REMY MARTIN|COURVOISIER/i, profile: PROFILES.BOLD },
    { name: /GREY GOOSE|BELVEDERE|KETEL ONE|TANQUERAY|BOMBAY/i, profile: PROFILES.CRISP },
    { name: /MOSCATO|BAILEYS|KAHLUA|RUMPLE|SCHNAPPS/i, profile: PROFILES.FRUITY }
];

let counts = { [PROFILES.BOLD]: 0, [PROFILES.CRISP]: 0, [PROFILES.FRUITY]: 0, [PROFILES.SMOKY]: 0, [PROFILES.BALANCED]: 0 };

inventory.forEach(item => {
    const text = `${item.name} ${item.description || ''} ${item.tastingNotes || ''} ${item.liquorType || ''} ${item.subType || ''}`.toUpperCase();

    // 1. Check Brand Overrides First
    let override = BRAND_OVERRIDES.find(o => o.name.test(item.name));
    if (override) {
        item.flavorProfile = override.profile;
        item.style = override.profile;
        counts[override.profile]++;
        return;
    }

    let scores = {};
    for (const profile in RULES) {
        let score = 0;
        const rule = RULES[profile];

        // Match keywords
        const matches = text.match(new RegExp(rule.keywords, 'gi'));
        if (matches) score += matches.length * 2.5;

        // Match types
        if (rule.types.test(text)) score += 12;

        scores[profile] = score * rule.weight;
    }

    // Determine the highest score
    let bestProfile = PROFILES.BALANCED;
    let maxScore = 4; // Lowered default threshold

    for (const profile in scores) {
        if (scores[profile] > maxScore) {
            maxScore = scores[profile];
            bestProfile = profile;
        }
    }

    // Assign the profile
    item.flavorProfile = bestProfile;
    item.style = bestProfile;
    counts[bestProfile]++;
});

console.log('--- FLAVOR RE-PROFILING RESULTS ---');
console.log(counts);
console.log(`Total Items: ${inventory.length}`);

fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
console.log('\n✅ Inventory flavor profiles updated successfully.');
