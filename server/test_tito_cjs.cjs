const fs = require('fs');
// Mock the RecommendationEngine by importing its logic...
// Wait, I can't easily require ES modules directly without dynamic import.
(async () => {
    const { RecommendationEngine } = await import('../src/utils/RecommendationEngine.js');
    const inventory = JSON.parse(fs.readFileSync('./server/data/inventory.json', 'utf8'));
    const engine = new RecommendationEngine(inventory);
    const res = engine.recommend({ category: 'All', search: 'tito' });
    console.log('Results returned:', res.length);
    res.slice(0, 10).forEach(i => console.log(`${i.name} [${i.matchType}]`));
})();
