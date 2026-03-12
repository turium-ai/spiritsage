const XLSX = require('xlsx');
const odsPath = '/home/turium/.gemini/antigravity/scratch/liquor-rec-app/INVENTORY_20240102134439.ods';

try {
    const workbook = XLSX.readFile(odsPath);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const dcodes = {};
    data.forEach(item => {
        const d = item.dcode ? item.dcode.trim() : 'UNKNOWN';
        if (!dcodes[d]) dcodes[d] = { count: 0, samples: [] };
        dcodes[d].count++;
        if (dcodes[d].samples.length < 3) dcodes[d].samples.push(item.item_name);
    });

    console.log(JSON.stringify(dcodes, null, 2));

} catch (err) {
    console.error(err);
}
