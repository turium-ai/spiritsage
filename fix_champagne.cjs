const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, 'src', 'data', 'inventory.json');
let inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

let fixes = 0;

inventory.forEach(item => {
    const nameUpper = item.name.toUpperCase();
    if ((nameUpper.includes('CHAMPAGNE') || nameUpper.includes('PERIGNON') || nameUpper.includes('CRISTAL') || nameUpper.includes('PROSECCO')) && !nameUpper.includes('TEQUILA')) {
        if (item.category !== 'Champagne') {
            item.category = 'Champagne';
            item.liquorType = 'Champagne';

            // Fix placeholder image to use champagne placeholder
            if (!item.image || item.image.includes('placeholder_')) {
                item.image = '/images/placeholder_champagne.png';
            }
            fixes++;
        }
    }
});

fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
console.log(`Successfully moved Champagnes to the 'Champagne' category. Changed ${fixes} items.`);
