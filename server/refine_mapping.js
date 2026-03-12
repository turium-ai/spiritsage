const XLSX = require('xlsx');
const odsPath = '/home/turium/.gemini/antigravity/scratch/liquor-rec-app/INVENTORY_20240102134439.ods';

try {
    const workbook = XLSX.readFile(odsPath);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const mapping = {};
    data.forEach(item => {
        const d = item.dcode ? item.dcode.trim() : 'NONE';
        if (!mapping[d]) mapping[d] = { count: 0, items: [] };
        mapping[d].count++;
        if (mapping[d].items.length < 5) mapping[d].items.push(item.item_name);
    });

    console.log('DCODE ANALYSIS:');
    Object.keys(mapping).sort().forEach(d => {
        console.log(`\n[${d}] (${mapping[d].count} items)`);
        console.log(`Samples: ${mapping[d].items.join(', ')}`);
    });

} catch (err) {
    console.error(err);
}
