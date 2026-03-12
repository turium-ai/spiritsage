import fs from 'fs';
import { pipeline } from '@xenova/transformers';

function dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

async function test() {
    const featureExtractor = await pipeline('feature-extraction', 'Supabase/bge-small-en', {
        quantized: true,
        progress_callback: null
    });
    
    // Read JSON directly
    const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
    const inventoryEmbeddings = JSON.parse(fs.readFileSync('./src/data/inventory_embeddings.json', 'utf8'));
    
    const queries = ["bourbon", "rye", "scotch", "irish whiskey", "single malt"];
    
    for (const query of queries) {
        console.log(`\n\n=== Searching for: '${query}' ===`);
        const queryEmbeddingObj = await featureExtractor(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = Array.from(queryEmbeddingObj.data);
        
        let enforcedWhiskeyType = null;
        if (query.match(/\bsingle malt\b/)) enforcedWhiskeyType = 'single malt';
        else if (query.match(/\bbourbon\b/)) enforcedWhiskeyType = 'bourbon';
        else if (query.match(/\brye\b/)) enforcedWhiskeyType = 'rye';
        else if (query.match(/\bscotch\b/)) enforcedWhiskeyType = 'scotch';
        else if (query.match(/\birish\b/)) enforcedWhiskeyType = 'irish';
        
        const scoredItems = [];
        for (const record of inventoryEmbeddings) {
            const fullItem = inventory.find(i => i.id === record.id);
            if (!fullItem) continue;

            const typeLower = (fullItem.liquorType||'').toLowerCase();
            const nameLower = (fullItem.name||'').toLowerCase();
            const isSpiritMatch = typeLower.match(/bourbon|scotch|rye|malt|whiskey/) || nameLower.match(/bourbon|scotch|rye|malt|whiskey/);
            
            if (!isSpiritMatch) continue;

            if (enforcedWhiskeyType) {
                const classificationStr = `${fullItem.liquorType || ''} ${fullItem.name || ''} ${fullItem.style || ''}`.toLowerCase();
                let isWhiskeyTypeMatch = classificationStr.includes(enforcedWhiskeyType);
                if (enforcedWhiskeyType === 'single malt' && classificationStr.includes('malt')) {
                    isWhiskeyTypeMatch = true;
                }
                if (!isWhiskeyTypeMatch) continue;
            }

            let similarity = dotProduct(queryEmbedding, record.embedding);
            scoredItems.push({ id: record.id, similarity, name: fullItem.name, type: fullItem.liquorType });
        }
        
        scoredItems.sort((a, b) => b.similarity - a.similarity);
        
        console.log("Top 5 matches:");
        scoredItems.slice(0, 5).forEach(i => console.log(`[${i.similarity.toFixed(3)}] [${i.type}] ${i.name}`));
    }
}
test();
