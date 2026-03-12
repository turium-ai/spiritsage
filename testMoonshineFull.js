const fs = require('fs');
const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));

let code = fs.readFileSync('./src/utils/RecommendationEngine.js', 'utf8');
code = code.replace(/export class/, 'class');
fs.writeFileSync('./shimEngine.cjs', code + '\nmodule.exports = { RecommendationEngine };');

const engine = require('./shimEngine.cjs');
const engineInst = new engine.RecommendationEngine(inventory);

const results = engineInst.recommend({ search: 'moonshine' });

console.log('Total Results:', results.length);
results.slice(0, 10).forEach(r => console.log(r.matchType, r.name, r.liquorType, r.category));
