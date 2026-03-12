import fs from 'fs';
import { semanticEngine } from './src/utils/SemanticSearchEngine.js';

async function test() {
    console.log("Searching for french wine...");
    try {
        const results = await semanticEngine.search("french wine");
        console.log(`Found ${results.length} results.`);
        if (results.length > 0) {
            console.log(results.slice(0, 3).map(r => r.name));
        } else {
            console.log("WARNING: 0 results returned from SemanticSearchEngine!");
        }
    } catch (e) {
        console.error("ERROR in search:", e);
    }
}
test();
