const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, 'src', 'data', 'inventory.json');
let inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

let fixes = 0;

inventory.forEach(item => {
    // 1. Fix miscategorized Champagnes (often tagged as Beer)
    const nameUpper = item.name.toUpperCase();
    if ((nameUpper.includes('CHAMPAGNE') || nameUpper.includes('PERIGNON') || nameUpper.includes('CRISTAL') || nameUpper.includes('PROSECCO')) && !nameUpper.includes('TEQUILA')) {
        if (item.category !== 'Wine') {
            item.category = 'Wine';
            item.liquorType = item.liquorType || 'Champagne';

            // Fix placeholder image if it was pointing to the wrong one
            if (item.image === '/images/placeholder_beer.png' || item.image === '/images/placeholder_spirit.png') {
                item.image = '/images/placeholder_wine.png';
            }
            fixes++;
        }
    }

    // 2. Fix placeholders
    if (!item.image) {
        if (item.category === 'Wine') item.image = '/images/placeholder_wine.png';
        else if (item.category === 'Beer') item.image = '/images/placeholder_beer.png';
        else item.image = '/images/placeholder_spirit.png';
        fixes++;
    }
});

fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
console.log(`Successfully fixed ${fixes} anomalies in the inventory data.`);
