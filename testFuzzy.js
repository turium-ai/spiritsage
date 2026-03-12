const fs = require('fs');
let code = fs.readFileSync('./src/utils/RecommendationEngine.js', 'utf8');
code = code.replace(/export default new RecommendationEngine\(\);/, 'module.exports = new class RecommendationEngine');
code = code.replace(/export class/, 'class');
fs.writeFileSync('./shimEngine.js', code);

const engine = require('./shimEngine.js');
console.log(engine.isFuzzyMatch("moonshine", "moonstone"));
console.log(engine.isFuzzyMatch("moonshine", "moon"));
console.log(engine.isFuzzyMatch("hennessey", "tennessee"));
