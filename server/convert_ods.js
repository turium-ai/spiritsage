const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const odsPath = '/home/turium/.gemini/antigravity/scratch/liquor-rec-app/INVENTORY_20240102134439.ods';

try {
    console.log('Reading ODS file...');
    const workbook = XLSX.readFile(odsPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} records.`);
    if (data.length > 0) {
        console.log('Sample record:', JSON.stringify(data[0], null, 2));
        console.log('Available columns:', Object.keys(data[0]));
    }

    // Save a small sample for inspection
    fs.writeFileSync('ods_sample.json', JSON.stringify(data.slice(0, 5), null, 2));
    console.log('Sample saved to ods_sample.json');

} catch (err) {
    console.error('Error parsing ODS:', err);
}
