import fs from 'fs';
import { RecommendationEngine } from './src/utils/RecommendationEngine.js';

const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inventory);

engine.recommend = function(preferences) {
    const { category, style, minPrice, maxPrice, search, strictMinPrice, strictMaxPrice } = preferences;

    let normalizedSearch = search ? this.normalizeAgeText(search).toLowerCase() : '';
    console.log("Normalized Search:", normalizedSearch);
    
    let eligibleItems = this.inventory.slice(0, 10);
    const frenchWine = this.inventory.find(i => i.name.toLowerCase().includes("french wine") || i.category === "Wine" && i.tastingNotes && i.tastingNotes.includes("French"));
    if (frenchWine) eligibleItems.push(frenchWine);
    
    // Test isFuzzyMatch logic explicitly for the selected items
    const searchTerms = normalizedSearch.toUpperCase().split(' ').filter(t => t.length > 0);
    
    console.log("Search Terms:", searchTerms);
    
    for (const item of eligibleItems) {
        let score = 0;
        const name = this.normalizeAgeText(item.name);
        const type = this.normalizeAgeText(item.liquorType);
        
        console.log(`\nTesting: ${item.name} (Name: ${name}, Type: ${type})`);
        
        let isBrandMatch = searchTerms.every(term => {
            const m1 = this.isFuzzyMatch(term, name);
            const m2 = this.isFuzzyMatch(term, type);
            console.log(`  term: ${term} -> in Name: ${m1}, in Type: ${m2}`);
            return m1 || m2;
        });
        
        console.log(`  isBrandMatch: ${isBrandMatch}`);
    }
}

engine.recommend({ search: "french wine", category: "All" });
