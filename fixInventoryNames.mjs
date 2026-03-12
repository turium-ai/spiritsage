import fs from 'fs';

const p = './src/data/inventory.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
let count = 0;

for (let item of data) {
    if (item.image && item.image.includes('placeholder')) {
        item.image = '';
        count++;
    }
}

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log(`Wiped ${count} hardcoded placeholder images!`);
