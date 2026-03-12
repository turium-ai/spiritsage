import inventory from './src/data/inventory.json' assert { type: 'json' };
import engine from './src/utils/RecommendationEngine.js';

const results = engine.recommend(inventory, { searchQuery: 'vsop' });

const semantic = results.filter(r => r.matchType === 'semantic');
const exact = results.filter(r => r.matchType === 'exact');
const comparable = results.filter(r => r.matchType === 'comparable');

console.log('Semantic:', semantic.length);
console.log('Exact:', exact.length);
console.log('Comparable:', comparable.length);

if(comparable.length > 0) {
    comparable.forEach(c => console.log('ALT:', c.name, c.price));
}
