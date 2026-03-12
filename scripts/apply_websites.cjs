const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const inventoryPath = path.join(__dirname, '../src/data/inventory.json');
const websitesPath = path.join(__dirname, '../src/data/brand_websites.json');
const excelOutputPath = path.join(__dirname, '../inventory_with_websites.xlsx');

function main() {
    console.log("Loading inventory and brand websites...");

    if (!fs.existsSync(websitesPath)) {
        console.error("Error: brand_websites.json not found. Did the Gemini script finish?");
        process.exit(1);
    }

    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    const websites = JSON.parse(fs.readFileSync(websitesPath, 'utf8'));

    let matchedCount = 0;

    console.log("Applying official websites to inventory items...");

    for (const item of inventory) {
        // Calculate the prefix the exact same way the python script did
        const words = item.name.split(/\s+/).filter(w => w.length > 0);
        let prefix = "";
        if (words.length >= 2) {
            prefix = `${words[0]} ${words[1]}`;
        } else if (words.length === 1) {
            prefix = words[0];
        }

        if (prefix && websites[prefix] && websites[prefix].url) {
            const data = websites[prefix];
            // Only assign if it's a valid looking URL and not "Unknown"
            if (data.url.startsWith('http') && data.brand !== "Unknown") {
                item.officialBrand = data.brand;
                item.officialWebsite = data.url;
                matchedCount++;
            }
        }
    }

    console.log(`Matched ${matchedCount} items with an official brand website.`);

    // Save updated JSON
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    console.log("Updated src/data/inventory.json");

    // Export to Excel
    console.log(`Exporting ${inventory.length} items to Excel...`);

    // Flatten the data a bit for better Excel readability
    const exportData = inventory.map(item => ({
        ID: item.id,
        "Item Name": item.name,
        Category: item.category,
        "Liquor Type": item.liquorType,
        Size: item.size,
        Price: item.price,
        "Official Brand": item.officialBrand || "",
        "Official Website": item.officialWebsite || "",
        "Image Path": item.image || "",
        "Data Quality Image URL": item.url || "",
        "Flavor Profile": item.flavorProfile || "",
        "Tasting Notes": Array.isArray(item.tastingNotes) ? item.tastingNotes.join(", ") : (item.tastingNotes || "")
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);

    // Auto-size columns loosely
    const cols = Object.keys(exportData[0]).map(key => ({ wch: Math.max(15, key.length + 5) }));
    ws['!cols'] = cols;

    xlsx.utils.book_append_sheet(wb, ws, "Inventory");
    xlsx.writeFile(wb, excelOutputPath);

    console.log(`Successfully exported to ${excelOutputPath}`);
}

main();
