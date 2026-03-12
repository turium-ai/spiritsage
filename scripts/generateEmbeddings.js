import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateEmbeddings() {
    console.log("Loading transformers...");
    const { pipeline, env } = await import('@xenova/transformers');

    env.allowLocalModels = false;
    env.useBrowserCache = false;

    console.log("Initializing embedding model (Xenova/all-MiniLM-L6-v2)...");
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const inventoryPath = path.join(__dirname, '../src/data/inventory.json');
    const outputPath = path.join(__dirname, '../src/data/inventory_embeddings.json');

    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    console.log(`Loaded ${inventory.length} items from inventory.json`);

    const embeddingsData = [];
    const batchSize = 50;

    for (let i = 0; i < inventory.length; i += batchSize) {
        const batch = inventory.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(inventory.length / batchSize)}...`);

        const texts = batch.map(item => {
            const parts = [
                item.name,
                item.category,
                item.liquorType || '',
                item.style || '',
                item.flavorProfile || '',
                item.tastingNotes || ''
            ];
            return parts.filter(Boolean).join('. ');
        });

        const output = await extractor(texts, { pooling: 'mean', normalize: true });
        const D = 384;

        for (let j = 0; j < batch.length; j++) {
            const embedding = Array.from(output.data.slice(j * D, (j + 1) * D));
            embeddingsData.push({
                id: batch[j].id,
                embedding: embedding
            });
        }
    }

    console.log(`Generated ${embeddingsData.length} embeddings. Saving to ${outputPath}`);
    fs.writeFileSync(outputPath, JSON.stringify(embeddingsData));
    console.log("Done.");
}

generateEmbeddings().catch(console.error);
