const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');

async function testSemantic() {
    const embeddings = JSON.parse(fs.readFileSync('./src/data/inventory_embeddings.json', 'utf8'));
    const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));

    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor("mexican", { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    let mappedInventory = new Map();
    for (const item of inventory) {
        mappedInventory.set(item.id, {
            ...item,
            searchStr: `${item.flavorProfile || ''} ${item.tastingNotes || ''} ${item.name || ''}`.toLowerCase(),
            catLower: (item.category || '').toLowerCase(),
            typeLower: (item.liquorType || item.category || '').toLowerCase(),
            nameLower: (item.name || '').toLowerCase()
        });
    }

    function dotProduct(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
        return sum;
    }

    const scoredItems = [];
    for (const record of embeddings) {
        const fullItem = mappedInventory.get(record.id);
        if (!fullItem) continue;
        
        // Strict keyword enforcement test for "mexican"
        // Wait, "mexican" doesn't hit any of the strict keywords:
        // wine, champagne, beer, liqueur, whiskey, tequila, vodka, rum, gin, cognac, brandy
        
        let similarity = dotProduct(queryEmbedding, record.embedding);
        scoredItems.push({ name: fullItem.name, type: fullItem.liquorType, score: similarity });
    }
    
    scoredItems.sort((a,b) => b.score - a.score);
    console.log("Top 5 purely semantic matches for 'mexican':");
    scoredItems.slice(0, 5).forEach(i => console.log(`  ${i.name} (${i.type}) - ${i.score}`));
}

testSemantic();
