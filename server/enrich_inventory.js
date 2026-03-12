const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const inventoryPath = path.join(__dirname, '../src/data/inventory.json');
const MODEL_NAME = 'gemini-3.1-pro-preview';
const BATCH_SIZE = 20;

async function enrichInventory() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log('Loading inventory...');
    let inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    console.log(`Original inventory size: ${inventory.length}`);

    // Create a backup
    fs.writeFileSync(`${inventoryPath}.bak`, JSON.stringify(inventory, null, 2));
    console.log('Backup created.');

    const total = inventory.length;
    // For safety and cost, we can process a subset or the whole thing.
    // User asked to "build it", so I will process in batches.

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = inventory.slice(i, i + BATCH_SIZE);

        // Skip items that already have a liquorType and a non-generic description if we are resuming
        if (batch.every(item => item.liquorType && item.description && !item.description.includes('A versatile choice'))) {
            console.log(`Skipping batch ${i / BATCH_SIZE + 1} (already enriched)`);
            continue;
        }

        console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(total / BATCH_SIZE)}...`);

        const prompt = `Act as a master sommelier. For each liquor item in the list below, identify its highly specific "liquorType" (e.g. "Peated Islay Single Malt Scotch", "Russian Imperial Stout", "Rutherford Cabernet Sauvignon") and write a professional 2-sentence "description" based on its flavor profile and heritage.
        
        Items:
        ${batch.map((it, idx) => `${idx + 1}. Name: ${it.name}, Category: ${it.category}, Info: ${it.tastingNotes}`).join('\n')}
        
        Return exactly a JSON array of objects with keys: "name", "liquorType", "description". No markdown, no intro.`;

        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            let responseText = response.candidates[0].content.parts[0].text.trim();
            // Clean up possible markdown code blocks
            if (responseText.startsWith('```json')) {
                responseText = responseText.replace(/```json|```/g, '').trim();
            }

            const enrichedBatch = JSON.parse(responseText);

            // Map back to inventory
            enrichedBatch.forEach(enrichedItem => {
                const originalIndex = inventory.findIndex(inv => inv.name === enrichedItem.name);
                if (originalIndex !== -1) {
                    inventory[originalIndex].liquorType = enrichedItem.liquorType;
                    inventory[originalIndex].description = enrichedItem.description;
                    // Update tastingNotes to the more descriptive one if preferred
                    inventory[originalIndex].tastingNotes = enrichedItem.description;
                }
            });

            // Save after each batch to prevent data loss
            fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
            console.log(`Batch ${i / BATCH_SIZE + 1} saved.`);

            // Short sleep to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
            console.error(`Error in batch ${i / BATCH_SIZE + 1}:`, err.message);
            // Continue to next batch
        }
    }

    console.log('Enrichment complete!');
}

enrichInventory();
