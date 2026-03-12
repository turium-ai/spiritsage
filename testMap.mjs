import { RecommendationEngine } from './src/utils/RecommendationEngine.js';
import fs from 'fs';

const inv = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inv);
const search = "12 year";
const normalizedSearch = search.toLowerCase().replace(/(\d+)\s*(year|years|yr|yrs)/g, '$1yr');
console.log('Search:', search, 'Normalized:', normalizedSearch);

const searchTerms = normalizedSearch.toUpperCase().split(' ');
console.log('Search Terms:', searchTerms);

const eligibleItems = inv.filter(i => i.name.toUpperCase().includes('MACALLAN') && i.name.toUpperCase().includes('12YR'));
console.log('Eligible Macallans:', eligibleItems.length);

const mapped = eligibleItems.map(item => {
    let score = 0;
    let itemCopy = { ...item };
    const name = item.name.toUpperCase();
    const type = (item.liquorType || '').toUpperCase();

    console.log(`\nEvaluating: ${name} [${type}]`);
    let isBrandMatch = searchTerms.every(term => name.includes(term) || type.includes(term));
    console.log(`Initial isBrandMatch:`, isBrandMatch);

    if (isBrandMatch && ['WINE', 'BEER', 'SPIRIT', 'LIQUOR', 'CHAMPAGNE', 'TEQUILA', 'VODKA', 'WHISKEY', 'GIN', 'RUM'].includes(normalizedSearch.toUpperCase())) {
        console.log("Entered broad category check block!");
    }

    if (isBrandMatch) {
        score += 100; // Perfect match for the searched brand
        itemCopy.matchType = 'exact';
        console.log(`Assigned exact match! Score now: ${score}`);

        // Let's simulate Smart Upgrades just in case it breaks something
        const searchIntent = { referencePrice: 50, ageStatement: 12, category: 'Spirits', baseSpiritType: 'Whiskey' };
        if (searchIntent && (itemCopy.matchType === 'exact' || itemCopy.matchType === 'comparable')) {
            const itemAge = engine.getAgeStatement(item.liquorType) || engine.getAgeStatement(item.name);
            const itemNormPrice = engine.getNormalizedPrice(item.price, item.size);

            if (searchIntent.ageStatement && itemAge) {
                if (itemAge === searchIntent.ageStatement && itemCopy.matchType === 'comparable') {
                    score += 20;
                } else if (itemAge > searchIntent.ageStatement && itemNormPrice <= searchIntent.referencePrice + 10) {
                    score += 30;
                    itemCopy.isGreatUpgrade = true;
                }
            }

            if (!itemCopy.isGreatUpgrade) {
                if (itemNormPrice < searchIntent.referencePrice) {
                    if (itemCopy.matchType === 'comparable') score += 20;
                    itemCopy.isCheaperAlternative = true;
                } else if (itemNormPrice > searchIntent.referencePrice && itemNormPrice <= searchIntent.referencePrice * 1.6) {
                    if (itemCopy.matchType === 'comparable') score += 10;
                    itemCopy.isSplurge = true;
                }
            }
        }
    } else {
        console.log("Failed isBrandMatch logic!");
    }

    if (item.stock > 0) score += 5;

    itemCopy.matchScore = Math.round(score);
    console.log(`Final Item MatchType: ${itemCopy.matchType}, MatchScore: ${itemCopy.matchScore}`);
    return itemCopy;
});

const sorted = mapped.sort((a, b) => {
    if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
    if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
    return a.price - b.price;
});

console.log("\nResults Array Length:", sorted.length);
console.log("Top Result:", sorted[0]?.name, sorted[0]?.matchType, sorted[0]?.matchScore);

