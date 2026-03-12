const fs = require('fs');
const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));

let code = fs.readFileSync('./src/utils/RecommendationEngine.js', 'utf8');
code = code.replace(/export default new RecommendationEngine\(\);/, 'module.exports = new class RecommendationEngine');
code = code.replace(/export class/, 'class');
fs.writeFileSync('./shimEngine.js', code);

const engine = require('./shimEngine.js');
const engineInst = new engine.RecommendationEngine(inventory);

const results = engineInst.recommend({ searchQuery: 'moonshine' });

const comparable = results.filter(r => r.matchType === 'comparable');
console.log('Comparables:', comparable.length);
if(comparable.length > 0) {
    comparable.slice(0, 5).forEach(c => console.log('ALT:', c.name, '|| Type:', c.liquorType, '|| Cat:', c.category));
}
