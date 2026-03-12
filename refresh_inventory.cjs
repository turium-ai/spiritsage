const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ODS_FILE = 'premium_inventory_final.ods';
const JSON_OUTPUT = path.join(__dirname, 'src', 'data', 'inventory.json');

function refresh() {
    console.log(`Refreshing inventory from ${ODS_FILE}...`);

    if (!fs.existsSync(ODS_FILE)) {
        console.error(`Error: File ${ODS_FILE} not found.`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(ODS_FILE);
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const mappedData = rawData.map(row => {
        // Map ODS columns to internal JSON fields
        return {
            id: row['ID'],
            name: row['Name'],
            category: row['Category'],
            price: row['Price ($)'] || 0,
            size: row['Size'],
            style: row['Style'],
            flavorProfile: row['Flavor Profile'],
            tastingNotes: row['Description'],
            description: row['Description'],
            image: row['Image'],
            stock: row['Stock'] || 0,
            liquorType: row['Liquor Type'],
            fingerprint: row['Fingerprint']
        };
    });

    // Save to master inventory
    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(mappedData, null, 2));

    console.log(`--- INVENTORY REFRESH COMPLETE ---`);
    console.log(`Total Items Processed: ${mappedData.length}`);
    console.log(`Successfully updated ${JSON_OUTPUT}`);
}

refresh();
