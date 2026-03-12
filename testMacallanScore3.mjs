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
    
    const query = "12 year single malt";
    const queryEmbeddingObj = await featureExtractor(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryEmbeddingObj.data);
    
    let enforcedAge = '12yr';
    
    const scoredItems = [];
    
    for (const record of inventoryEmbeddings) {
        const fullItem = inventory.find(i => i.id === record.id);
        if (!fullItem) continue;

        const itemNormalizedStr = `${fullItem.liquorType || ''} ${fullItem.name || ''}`.toLowerCase().replace(/\./g, '').replace(/(\d+)[-\s]*(year|years|yr|yrs|yo)/g, '$1yr');
        if (!itemNormalizedStr.includes(enforcedAge)) continue;

        let similarity = dotProduct(queryEmbedding, record.embedding);
        
        // Effective query
        let effectiveQuery = "12 year single malt";
        let isSmokySearch = false; // it's not smoky
        
        let searchStr = [
            fullItem.name, fullItem.liquorType||'', fullItem.style||'', fullItem.flavorProfile||'',
            fullItem.tastingNotes||'', fullItem.description||''
        ].join(' ').toLowerCase();

        if (searchStr.includes(effectiveQuery)) {
            similarity += 0.25; 
        }

        scoredItems.push({ id: record.id, similarity, name: fullItem.name, price: fullItem.price });
    }
    
    scoredItems.sort((a, b) => b.similarity - a.similarity);
    
    console.log("Top 10 Semantic Matches:");
    scoredItems.slice(0, 10).forEach(i => console.log(`[${i.similarity.toFixed(3)}] $${i.price} - ${i.name}`));
    
    const macallan = scoredItems.find(i => i.name.toLowerCase().includes("macallan"));
    if (macallan) {
        console.log(`\nMacallan is ranked #${scoredItems.indexOf(macallan)+1} with score ${macallan.similarity.toFixed(3)}`);
    } else {
        console.log("\nMacallan not found in eligible items!");
    }
}
test();
