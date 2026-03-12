import fs from 'fs';
import { semanticEngine } from './src/utils/SemanticSearchEngine.js';

async function test() {
    await semanticEngine.init();
    
    const query = "12 year single malt";
    console.log(`Searching for: ${query}`);
    
    // We do a regular search which enforces the 12yr rule
    const results = await semanticEngine.search(query);
    
    const macallan = results.find(r => r.name.includes("Macallan"));
    if (macallan) {
        console.log("Macallan found in top 24! Score:", macallan.similarity);
    } else {
        console.log("Macallan NOT in top 24 semantic matches.");
    }
}
test();
