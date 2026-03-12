import fs from 'fs';
const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
const embeddings = JSON.parse(fs.readFileSync('./src/data/inventory_embeddings.json', 'utf8'));

// Mocks pipeline
function dotProduct(a, b) { return 0.5; }

console.log("Simulating mapped approach (O(N))...");
const mappedInventory = new Map();
for (const item of inventory) {
    mappedInventory.set(item.id, {
        ...item,
        searchStr: `${item.flavorProfile || ''} ${item.tastingNotes || ''} ${item.name || ''}`.toLowerCase(),
        catLower: (item.category || '').toLowerCase(),
        typeLower: (item.liquorType || item.category || '').toLowerCase(),
        nameLower: (item.name || '').toLowerCase()
    });
}

function runOptimized() {
    const scoredItems = [];
    const queryLower = "french wine";
    const enforcedCategory = 'wine';
    let count = 0;
    
    for (const record of embeddings) {
        const fullItem = mappedInventory.get(record.id);
        if (!fullItem) continue;
        if (enforcedCategory && !fullItem.catLower.includes(enforcedCategory)) continue;
        
        // Simulating the work
        let similarity = 0.5;
        if (fullItem.searchStr.includes(queryLower)) similarity += 0.25;
        scoredItems.push({ id: record.id, similarity });
        count++;
    }
    return count;
}

const startOpt = performance.now();
const optCount = runOptimized();
const endOpt = performance.now();
console.log(`Optimized loop processed ${optCount} matches in ${(endOpt - startOpt).toFixed(2)} ms.`);

console.log("\nSimulating OLD approach (O(N^2))...");
function runUnoptimized() {
    const scoredItems = [];
    const queryLower = "french wine";
    const enforcedCategory = 'wine';
    let count = 0;
    
    for (const record of embeddings) {
        const fullItem = inventory.find(i => i.id === record.id); // The O(N^2) bottleneck
        if (!fullItem) continue;
        
        const catLower = (fullItem.category || '').toLowerCase();
        if (enforcedCategory && !catLower.includes(enforcedCategory)) continue;
        
        let similarity = 0.5;
        const searchStr = `${fullItem.flavorProfile} ${fullItem.tastingNotes} ${fullItem.name}`.toLowerCase();
        if (searchStr.includes(queryLower)) similarity += 0.25;
        scoredItems.push({ id: record.id, similarity });
        count++;
    }
    return count;
}

const startOld = performance.now();
const oldCount = runUnoptimized();
const endOld = performance.now();
console.log(`Unoptimized loop processed ${oldCount} matches in ${(endOld - startOld).toFixed(2)} ms.`);

