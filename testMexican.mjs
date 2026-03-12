import fs from 'fs';
import { RecommendationEngine } from './src/utils/RecommendationEngine.js';
import { semanticEngine } from './src/utils/SemanticSearchEngine.js';

async function test() {
    const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
    const engine = new RecommendationEngine(inventory);

    console.log("--- 1. Testing RecommendationEngine (Fuzzy/Exact) ---");
    const exactRes = engine.recommend({ search: "mexican", category: "All" });
    console.log(`Found ${exactRes.length} matches`);
    if (exactRes.length > 0) {
        exactRes.slice(0, 5).forEach(r => console.log(`  [${r.category}] ${r.name} - ${r.matchType}`));
    }

    console.log("\n--- 2. Testing SemanticSearchEngine ---");
    try {
        const semRes = await semanticEngine.search("mexican");
        console.log(`Found ${semRes.length} results.`);
        if (semRes.length > 0) {
            semRes.slice(0, 5).forEach(r => console.log(`  [${r.category}] ${r.name} - Score: ${r.matchScore}`));
        } else {
            console.log("WARNING: 0 results returned from SemanticSearchEngine!");
        }
    } catch (e) {
        console.error("ERROR in semantic search:", e);
    }
}
test();
