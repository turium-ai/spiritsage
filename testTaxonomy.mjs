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
    
    const queries = ["blanco tequila", "cabernet sauvignon", "dark rum"];
    
    for (const query of queries) {
        console.log(`\n\n=== Searching for: '${query}' ===`);
        const queryEmbeddingObj = await featureExtractor(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = Array.from(queryEmbeddingObj.data);
        
        let enforcedSpirit = null;
        let enforcedSubCategory = null;
        let enforcedCategory = null;
        
        const queryLower = query;
        if (queryLower.match(/\btequila|mezcal\b/)) {
            enforcedSpirit = 'tequila';
            if (queryLower.match(/\bblanco|silver\b/)) enforcedSubCategory = 'blanco';
        } else if (queryLower.match(/\brum\b/)) {
            enforcedSpirit = 'rum';
            if (queryLower.match(/\bdark\b/)) enforcedSubCategory = 'dark';
        } else if (queryLower.match(/\bwine|cabernet sauvignon\b/)) {
            if (!enforcedCategory) enforcedCategory = 'wine';
            if (queryLower.match(/\bcabernet sauvignon\b/)) enforcedSubCategory = 'cabernet sauvignon';
        }
        
        const scoredItems = [];
        for (const record of inventoryEmbeddings) {
            const fullItem = inventory.find(i => i.id === record.id);
            if (!fullItem) continue;

            if (enforcedCategory) {
                if (!(fullItem.category||'').toLowerCase().includes(enforcedCategory)) continue;
            }

            if (enforcedSpirit) {
                let isSpiritMatch = (fullItem.liquorType||'').toLowerCase().includes(enforcedSpirit) || (fullItem.name||'').toLowerCase().includes(enforcedSpirit);
                if (!isSpiritMatch) continue;
            }

            if (enforcedSubCategory) {
                const classificationStr = `${fullItem.liquorType || ''} ${fullItem.name || ''} ${fullItem.style || ''} ${fullItem.category || ''}`.toLowerCase();
                let isSubCategoryMatch = classificationStr.includes(enforcedSubCategory);
                
                if ((enforcedSubCategory === 'blanco' || enforcedSubCategory === 'silver' || enforcedSubCategory === 'white') && 
                    (classificationStr.includes('blanco') || classificationStr.includes('silver') || classificationStr.includes('white'))) {
                    isSubCategoryMatch = true;
                }
                if (!isSubCategoryMatch) continue;
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
