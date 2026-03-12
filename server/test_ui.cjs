const fs = require('fs');

(async () => {
    const { RecommendationEngine } = await import('../src/utils/RecommendationEngine.js');
    const { semanticEngine } = await import('../src/utils/SemanticSearchEngine.js');
    
    const inventory = JSON.parse(fs.readFileSync('./server/data/inventory.json', 'utf8'));
    const engine = new RecommendationEngine(inventory);
    
    const rankedRecommendations = engine.recommend({ category: 'All', search: 'tito' });
    const semanticResults = await semanticEngine.search('tito', inventory);
    
    // Simulate UI baseResults logic
    let base = rankedRecommendations;
    if (semanticResults.length > 0) {
        const exactMatches = rankedRecommendations.filter(i => i.matchType === 'exact');
        const comps = rankedRecommendations.filter(i => i.matchType === 'comparable');
        const pureSemantic = semanticResults.filter(s =>
            !exactMatches.some(e => e.id === s.id) &&
            !comps.some(c => c.id === s.id)
        );
        base = [...pureSemantic.sort((a,b)=>a.price-b.price), ...exactMatches, ...comps];
    }
    
    // Simulate Luxury filter
    const filtered = base.filter(item => item.price >= 50 && item.price <= 150);
    
    console.log('Filtered items:', filtered.length);
    filtered.forEach(i => console.log(`${i.name} [${i.matchType}] - $${i.price}`));
    
    const isSemanticSearch = filtered.some(i => i.matchType === 'semantic');
    const hasBadgedExacts = filtered.some(i => i.matchType === 'exact' && (i.isGreatUpgrade || i.isCheaperAlternative));
    const isSearchWithComparables = filtered.some(i => i.matchType === 'comparable') || hasBadgedExacts;
    
    let exactMatches = (isSearchWithComparables || isSemanticSearch) ? filtered.filter(i => i.matchType === 'exact' || i.matchType === 'semantic') : [...filtered];
    let comparables = isSearchWithComparables ? filtered.filter(i => i.matchType === 'comparable') : [];
    
    if (comparables.length === 0 && hasBadgedExacts) {
        comparables = exactMatches.filter(i => i.isGreatUpgrade || i.isCheaperAlternative || i.isSplurge).slice(0, 4);
        if (exactMatches.length > comparables.length) {
            exactMatches = exactMatches.filter(i => !comparables.includes(i));
        }
    }
    console.log('\nFinal Main Grid:', exactMatches.length);
    exactMatches.forEach(i => console.log(i.name, i.matchType));
    
    console.log('\nFinal Sidebar (Comparables):', comparables.length);
    comparables.forEach(i => console.log(i.name, i.matchType));
})();
