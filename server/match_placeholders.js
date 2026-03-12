const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../src/data/inventory.json');
const imgDir = path.join(__dirname, 'public/images/products');

// Reload the ORIGINAL inventory from the main app (the one before bad fuzzy matching)
const mainInvPath = '/home/turium/.gemini/antigravity/scratch/liquor-rec-app/src/data/inventory.json';
const inventory = JSON.parse(fs.readFileSync(mainInvPath, 'utf8'));
const imageFiles = fs.readdirSync(imgDir).filter(f => !f.endsWith('.json'));

// Brand -> image mapping (only match within same brand)
const brandImages = {
    'barefoot': imageFiles.filter(f => f.startsWith('barefoot_')),
    'yellow tail': imageFiles.filter(f => f.startsWith('yellow_tail_')),
    'sutter home': imageFiles.filter(f => f.startsWith('sutter_home_')),
    'johnnie walker': imageFiles.filter(f => f.startsWith('johnnie_walker_')),
    'corona': imageFiles.filter(f => f.startsWith('corona_')),
    'heineken': imageFiles.filter(f => f.startsWith('heineken_')),
    'patron': imageFiles.filter(f => f.startsWith('patron_')),
    'white claw': imageFiles.filter(f => f.startsWith('white_claw_')),
    'modelo': imageFiles.filter(f => f.startsWith('modelo_')),
    'budweiser': imageFiles.filter(f => f.startsWith('budweiser')),
    'bud light': imageFiles.filter(f => f.startsWith('bud_light')),
    'smirnoff': imageFiles.filter(f => f.startsWith('smirnoff_')),
    'truly': imageFiles.filter(f => f.startsWith('truly_')),
    'carlo rossi': imageFiles.filter(f => f.startsWith('carlo_rossi_')),
    'dekuyper': imageFiles.filter(f => f.startsWith('dekuyper_')),
    'baileys': imageFiles.filter(f => f.startsWith('baileys_')),
    'beringer': imageFiles.filter(f => f.startsWith('beringer_')),
    'woodbridge': imageFiles.filter(f => f.startsWith('woodbridge_')),
    'josh': imageFiles.filter(f => f.startsWith('josh_')),
    'don julio': imageFiles.filter(f => f.startsWith('don_julio_')),
    'sam adams': imageFiles.filter(f => f.startsWith('sam_adams_')),
    'samuel adams': imageFiles.filter(f => f.startsWith('sam_adams_')),
    'miller': imageFiles.filter(f => f.startsWith('miller_')),
    'coors': imageFiles.filter(f => f.startsWith('coors_')),
    'black box': imageFiles.filter(f => f.startsWith('black_box_')),
    'cavit': imageFiles.filter(f => f.startsWith('cavit_')),
    'twisted tea': imageFiles.filter(f => f.startsWith('twisted_tea') ? true : false),
};

let matched = 0;
let alreadyHad = 0;
const matchLog = [];

inventory.forEach((item, idx) => {
    // Skip items that already have CORRECT real images
    if (item.image && item.image.startsWith('/images/products/')) {
        alreadyHad++;
        return;
    }

    const itemLower = item.name.toLowerCase();

    // Find which brand this item belongs to
    for (const [brand, images] of Object.entries(brandImages)) {
        if (!itemLower.includes(brand)) continue;
        if (images.length === 0) continue;

        // Try to find best match within brand
        let bestMatch = null;
        let bestScore = 0;

        for (const imgFile of images) {
            const keywords = imgFile.replace(/\.(png|jpg|jpeg|webp|avif|gif)$/, '')
                .replace(brand.replace(/ /g, '_') + '_', '') // Remove brand prefix
                .split('_');

            let score = 0;
            for (const kw of keywords) {
                if (kw.length >= 3 && itemLower.includes(kw)) {
                    score += kw.length;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = imgFile;
            }
        }

        // If we found a keyword match, use it; otherwise use the first/generic brand image
        if (bestMatch && bestScore >= 4) {
            inventory[idx].image = `/images/products/${bestMatch}`;
            matched++;
            matchLog.push(`  ✅ "${item.name}" -> ${bestMatch} (score: ${bestScore})`);
        } else if (images.length > 0) {
            // Use the most generic brand image as fallback
            const generic = images[0];
            inventory[idx].image = `/images/products/${generic}`;
            matched++;
            matchLog.push(`  📌 "${item.name}" -> ${generic} (brand fallback)`);
        }
        break;
    }
});

// Fix the Barefoot Sweet Red specifically
inventory.forEach((item, idx) => {
    if (item.name.toLowerCase().includes('barefoot sweet red')) {
        inventory[idx].image = '/images/products/barefoot_red_moscato.png';
    }
});

// Save to both locations
fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
fs.writeFileSync(mainInvPath, JSON.stringify(inventory, null, 2));

console.log(`=== BRAND-AWARE MATCHING ===`);
console.log(`Already had real images: ${alreadyHad}`);
console.log(`Newly matched (same brand): ${matched}`);
console.log(`Still need images: ${inventory.length - alreadyHad - matched}`);
console.log(`\nMatches:`);
matchLog.forEach(l => console.log(l));
