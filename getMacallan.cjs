const fs = require('fs');

async function run() {
    const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
    const macallan = inventory.find(i => i.name.toLowerCase().includes('macallan') && i.name.toLowerCase().includes('12'));
    console.log(JSON.stringify(macallan, null, 2));
}
run();
