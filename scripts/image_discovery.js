import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const INVENTORY_PATH = path.join(process.cwd(), 'src/data/inventory.json');
const OUTPUT_PATH = path.join(process.cwd(), 'scripts/discovery_results.json');
const BATCH_SIZE = 50;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
    // Find items that need images (have placeholder or no image)
    const needsImage = inventory.filter(item => !item.image || item.image.includes('placeholder'));

    console.log(`Found ${needsImage.length} items needing images.`);
    const batch = needsImage.slice(0, BATCH_SIZE);
    console.log(`Processing batch of ${batch.length} items...`);

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    // basic stealth
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const results = [];

    for (const item of batch) {
        console.log(`Searching for: ${item.name} (${item.id})`);

        try {
            const query = encodeURIComponent(`${item.name} bottle white background`);
            const searchUrl = `https://www.bing.com/images/search?q=${query}&form=HDRSC3`;

            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Extract image URLs from the 'm' attribute which Bing uses to store JSON data
            const candidates = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a.iusc'));
                return links.slice(0, 5).map(a => {
                    const mSrc = a.getAttribute('m');
                    if (mSrc) {
                        try {
                            const data = JSON.parse(mSrc);
                            return data.murl;
                        } catch (e) { return null; }
                    }
                    return null;
                }).filter(url => url && (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.png') || url.toLowerCase().endsWith('.jpeg') || url.toLowerCase().endsWith('.webp')));
            });

            console.log(`  -> Found ${candidates.length} candidate URLs`);

            results.push({
                id: item.id,
                name: item.name,
                url: item.url,
                candidates: candidates
            });

            await sleep(1500); // polite delay
        } catch (error) {
            console.error(`  -> Failed: ${error.message}`);
        }
    }

    await browser.close();

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    console.log(`Saved discovery results to ${OUTPUT_PATH}`);
}

main().catch(console.error);
