import { RecommendationEngine, extractPriceFilters } from './src/utils/RecommendationEngine.js';
import { readFileSync } from 'fs';

const inv = JSON.parse(readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inv);

const query = "bourbon whiskey $30-$50";
const parsed = extractPriceFilters(query);
console.log("cleanQuery is:", `"${parsed.cleanText}"`);

const results = engine.recommend({
    category: null,
    search: parsed.cleanText,
    strictMinPrice: parsed.min,
    strictMaxPrice: parsed.max
});

console.log(`Length: ${results.length}`);
if (results.length > 0) {
    console.log(results[0]);
}
