import fs from 'fs';
import { RecommendationEngine } from './src/utils/RecommendationEngine.js';

function run() {
    const search = "12 year single malt";
    const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
    const engine = new RecommendationEngine(inventory);
    
    const prefs = { search: search };
    
    // We already have digit-typo disabled in the file. Let's see what matches.
    const results = engine.recommend(prefs);
    
    console.log(`Results for '${search}':`);
    results.filter(r => r.matchType === 'exact').slice(0, 10).forEach(r => {
        console.log(`[Exact] $${r.price} - ${r.name}`);
    });
    
    const macallan = results.find(r => r.name.toLowerCase().includes("macallan"));
    if (macallan) {
        console.log(`\nMacallan matchType: ${macallan.matchType}`);
    } else {
        console.log("\nMacallan completely missing from results!");
    }
}
run();
