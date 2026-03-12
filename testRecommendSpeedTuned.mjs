import fs from 'fs';
import { RecommendationEngine } from './src/utils/RecommendationEngine.js';

const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inventory);

const start = performance.now();
engine.recommend({ search: "french wine", category: "All" });
const end = performance.now();

console.log(`RecommendationEngine.recommend() took ${(end - start).toFixed(2)} ms.`);
