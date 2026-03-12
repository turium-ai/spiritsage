const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const inventoryPath = path.join(__dirname, 'src', 'data', 'inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

// Flatten inventory into clean rows for review
const rows = inventory.map(item => ({
    'New': item.isNew ? '★ NEW' : '',
    'Fingerprint': item.fingerprint || '',
    'ID': item.id,
    'Name': item.name,
    'Category': item.category || '',
    'Liquor Type': item.liquorType || '',
    'Sub Type': item.subType || '',
    'Price ($)': item.price,
    'Size': item.size || '',
    'Style': item.style || '',
    'Flavor Profile': item.flavorProfile || '',
    'Stock': item.stock || '',
    'Image': item.image || '',
    'Description': item.description || item.tastingNotes || ''
}));

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(rows);

// Set column widths for readability
worksheet['!cols'] = [
    { wch: 8 },   // New
    { wch: 20 },  // Fingerprint
    { wch: 6 },   // ID
    { wch: 40 },  // Name
    { wch: 20 },  // Category
    { wch: 20 },  // Liquor Type
    { wch: 20 },  // Sub Type
    { wch: 10 },  // Price
    { wch: 10 },  // Size
    { wch: 12 },  // Style
    { wch: 16 },  // Flavor Profile
    { wch: 8 },   // Stock
    { wch: 40 },  // Image
    { wch: 60 },  // Description
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

const outputPath = path.join(__dirname, 'inventory_review.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log(`✅ Excel file saved to: ${outputPath}`);
console.log(`   Total items: ${rows.length}`);
