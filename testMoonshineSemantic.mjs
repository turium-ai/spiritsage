import engine from './src/utils/SemanticSearchEngine.js';

async function test() {
    const results = await engine.search('moonshine');
    const semantic = results.filter(r => r.matchType === 'semantic');
    const comparable = results.filter(r => r.matchType === 'comparable');
    console.log('Semantic:', semantic.length);
    console.log('Comparable:', comparable.length);
    comparable.slice(0, 5).forEach(c => console.log('ALT:', c.name));
}

test();
