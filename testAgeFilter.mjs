import fs from 'fs';
import { RecommendationEngine } from './src/utils/RecommendationEngine.js';
import { semanticEngine } from './src/utils/SemanticSearchEngine.js';

async function test() {
    console.log("--- Testing SemanticSearchEngine Age Filter ---");
    try {
        const semRes = await semanticEngine.search("12 yr single malt");
        console.log(`Found ${semRes.length} results.`);
        if (semRes.length > 0) {
            semRes.slice(0, 5).forEach(r => console.log(`  [${r.category}] ${r.name} - Score: ${r.matchScore || 'N/A'}`));
        } else {
            console.log("WARNING: 0 results returned from SemanticSearchEngine!");
        }
    } catch (e) {
        console.error("ERROR in semantic search:", e);
    }
}
test();
