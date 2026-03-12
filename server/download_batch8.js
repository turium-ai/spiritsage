const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public/images/products');
const inventoryPath = path.join(__dirname, '../src/data/inventory.json');

const allImages = [
    // Bacardi
    { product: "Bacardi Superior", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2016/11/Bacardi-Superior-RUM-M.png", brand: "Bacardi", match: "superior" },
    { product: "Bacardi Gold", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2016/11/Bacardi-Gold-RUM-M.png", brand: "Bacardi", match: "gold" },
    { product: "Bacardi Black", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2016/11/Bacardi-Black-RUM-M.png", brand: "Bacardi", match: "black" },
    { product: "Bacardi Limon", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2018/06/bacardi_limon_hero.png", brand: "Bacardi", match: "limon" },
    { product: "Bacardi Coconut", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2018/06/bacardi_coconut_hero.png", brand: "Bacardi", match: "coconut" },
    { product: "Bacardi Dragonberry", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2018/06/bacardi_dragonberry_hero.png", brand: "Bacardi", match: "dragonberry" },
    { product: "Bacardi 8", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2021/04/Bacardi-Reserva-Ocho-M.png", brand: "Bacardi", match: "8" },
    { product: "Bacardi 10", imageUrl: "https://www.bacardi.com/us/en/wp-content/uploads/sites/4/2021/04/Bacardi-Gran-Reserva-Diez-M.png", brand: "Bacardi", match: "10" },

    // Absolut
    { product: "Absolut Vodka", imageUrl: "https://www.absolut.com/wp-content/uploads/Absolut_Vodka_1000ml_US_1_865beeb421.png", brand: "Absolut", match: "vodka" },
    { product: "Absolut Citron", imageUrl: "https://www.absolut.com/wp-content/uploads/Absolut_Citron_1000ml_US_9ed5a17688.png", brand: "Absolut", match: "citron" },
    { product: "Absolut Mandrin", imageUrl: "https://www.absolut.com/wp-content/uploads/Absolut_Mandrin_1000ml_US_b11d33cb44.png", brand: "Absolut", match: "mandrin" },
    { product: "Absolut Peppar", imageUrl: "https://www.absolut.com/wp-content/uploads/Absolut_Peppar_1000ml_US_2120ee70ce.png", brand: "Absolut", match: "peppar" },
    { product: "Absolut Watermelon", imageUrl: "https://www.absolut.com/wp-content/uploads/Absolut_Watermelon_1000ml_US_b7f611f7c5.png", brand: "Absolut", match: "watermelon" },
    { product: "Absolut Grapefruit", imageUrl: "https://www.absolut.com/wp-content/uploads/Absolut_Grapefruit_1000ml_US_cca7af0b6b.png", brand: "Absolut", match: "grapefruit" },

    // Downeast
    { product: "Downeast Original", imageUrl: "https://downeastcider.com/cdn/shop/files/Original_Can_Render-01.png?v=1738779932", brand: "Downeast", match: "original" },
    { product: "Downeast Double", imageUrl: "https://downeastcider.com/cdn/shop/files/Double_Can_Render-01.png?v=1738779774", brand: "Downeast", match: "double" },
    { product: "Downeast Blackberry", imageUrl: "https://downeastcider.com/cdn/shop/products/Blackberrycan_4.png?v=1620486695", brand: "Downeast", match: "blackberry" },
    { product: "Downeast White", imageUrl: "https://downeastcider.com/cdn/shop/products/Downeast_White_Can4.png?v=1620317513", brand: "Downeast", match: "white" }
];

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 15000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith("http")) redirectUrl = new URL(redirectUrl, url).href;
                downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
            const stream = fs.createWriteStream(filepath);
            res.pipe(stream);
            stream.on('finish', () => { stream.close(); resolve(); });
        }).on('error', reject);
    });
}

async function main() {
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    let matched = 0;

    for (const img of allImages) {
        const safeName = img.product.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const ext = img.imageUrl.match(/\.(png|jpg|jpeg|webp|avif|gif)/)?.[1] || 'png';
        const filename = `${safeName}.${ext}`;
        const filepath = path.join(imagesDir, filename);
        const imageRef = `/images/products/${filename}`;

        try {
            if (!fs.existsSync(filepath)) {
                await downloadImage(img.imageUrl, filepath);
                console.log(`✅ Downloaded: ${img.product}`);
            }
            inventory.forEach((item, idx) => {
                const itemLower = item.name.toLowerCase();
                if (itemLower.includes(img.brand.toLowerCase()) && itemLower.includes(img.match)) {
                    inventory[idx].image = imageRef;
                    matched++;
                }
            });
        } catch (err) {
            console.error(`❌ Failed: ${img.product} - ${err.message}`);
        }
    }

    // Exact brand mapping
    const brandImages = {
        'bacardi': ['bacardi_superior.png'],
        'absolut': ['absolut_vodka.png'],
        'downeast': ['downeast_original.png']
    };
    inventory.forEach((item, idx) => {
        if (item.image && item.image.startsWith('/images/products/')) return;
        for (const [brand, imgs] of Object.entries(brandImages)) {
            if (item.name.toLowerCase().includes(brand)) {
                inventory[idx].image = `/images/products/${imgs[0]}`;
                matched++;
                break;
            }
        }
    });

    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    fs.writeFileSync('/home/turium/.gemini/antigravity/scratch/liquor-rec-app/src/data/inventory.json', JSON.stringify(inventory, null, 2));
    console.log(`\nMatched ${matched} items.`);
}

main();
