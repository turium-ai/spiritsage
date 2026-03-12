import fs from 'fs';
import { RecommendationEngine } from './src/utils/RecommendationEngine.js';

const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inventory);

const res = engine.recommend({ search: "hennessey xo", category: "All" });
const exactMatches = res.filter(i => i.matchType === 'exact');
const comparables = res.filter(i => i.matchType === 'comparable');
const badgedExacts = exactMatches.filter(i => i.isGreatUpgrade || i.isCheaperAlternative);

console.log(`Initial exactMatches: ${exactMatches.length}`);
console.log(`Initial comparables: ${comparables.length}`);
console.log(`Badged exacts: ${badgedExacts.length}`);

// Simulate the React logic
let finalComparables = comparables;
let finalExactMatches = exactMatches;

if (finalComparables.length === 0 && badgedExacts.length > 0) {
    const maxToMove = Math.min(4, Math.max(0, finalExactMatches.length - 2));
    console.log(`Max to move: ${maxToMove}`);
    if (maxToMove > 0) {
        finalComparables = badgedExacts.slice(0, maxToMove);
    }
}

console.log(`Final Comparables count: ${finalComparables.length}`);
