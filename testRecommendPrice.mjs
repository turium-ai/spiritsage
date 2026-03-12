import { RecommendationEngine, extractPriceFilters } from './src/utils/RecommendationEngine.js';
import { readFileSync } from 'fs';

const inv = JSON.parse(readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inv);

const query = "bourbon whiskey $30-$50";
const parsed = extractPriceFilters(query);
console.log("Parsed:", parsed);

const results = engine.recommend({
    category: null,
    search: parsed.cleanQuery,
    strictMinPrice: parsed.min,
    strictMaxPrice: parsed.max
});

console.log(`Found ${results.length} results.`);
if (results.length > 0) {
    console.log(results.slice(0, 3).map(r => `${r.name} - $${r.price} - ${r.matchType} - ${r.matchScore}`));
}

