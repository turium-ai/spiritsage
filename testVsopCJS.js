const fs = require('fs');
const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));

// Provide a quick CommonJS shim for RecommendationEngine
let code = fs.readFileSync('./src/utils/RecommendationEngine.js', 'utf8');
code = code.replace(/export default new RecommendationEngine\(\);/, 'module.exports = new RecommendationEngine();');
code = code.replace(/import .* from .*/g, ''); // strip imports
code = code.replace(/export class/, 'class');
fs.writeFileSync('./shimEngine.js', code);

const engine = require('./shimEngine.js');
const results = engine.recommend(inventory, { searchQuery: 'vsop' });

console.log('Total Results:', results.length);
console.log('Comparables:', results.filter(i => i.matchType === 'comparable').length);
