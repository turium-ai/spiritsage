import fs from 'fs';

const p = './src/data/inventory.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
let count = 0;

for (let item of data) {
    if (item.name.includes('Modelo Chelada') && item.category === 'Wine') {
        item.category = 'Beer, Cider & Seltzers';
        item.liquorType = 'Beer';
        item.style = 'Crisp & Refreshing';
        item.flavorProfile = 'Light Malt, Subtle Hops';
        item.tastingNotes = "Experience the essence of Modelo Chelada, a crisp & refreshing beer that captures the palate with light malt, subtle hops. Best enjoyed cold to maintain its crisp, balanced profile.";
        item.description = item.tastingNotes;
        count++;
    }
}

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log(`Fixed ${count} Modelo Chelada anomalies!`);
