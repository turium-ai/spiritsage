import { pipeline, env } from '@xenova/transformers';
import inventoryEmbeddings from '../data/inventory_embeddings.json';
import inventory from '../data/inventory.json';

// Configure transformers.js for the browser
env.allowLocalModels = false;

// We use dot product for cosine similarity since the vectors are already normalized
function dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

class SemanticSearchEngine {
    constructor() {
        this.extractor = null;
        this.isInitializing = false;
        this.initPromise = null;
        this.mappedInventory = null;
    }

    async init() {
        if (this.extractor) return;
        if (this.initPromise) return this.initPromise;

        this.isInitializing = true;
        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                console.log("Initializing WebAssembly Embedding Model...");

                // Pre-compute lookup map for O(1) performance during search loop
                this.mappedInventory = new Map();
                for (const item of inventory) {
                    this.mappedInventory.set(item.id, {
                        ...item,
                        searchStr: `${item.flavorProfile || ''} ${item.tastingNotes || ''} ${item.name || ''}`.toLowerCase(),
                        catLower: (item.category || '').toLowerCase(),
                        typeLower: (item.liquorType || item.category || '').toLowerCase(),
                        nameLower: (item.name || '').toLowerCase()
                    });
                }

                this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                console.log("Model initialized.");
                resolve();
            } catch (err) {
                console.error("Failed to initialize embedding model:", err);
                reject(err);
            } finally {
                this.isInitializing = false;
            }
        });

        return this.initPromise;
    }

    async search(query) {
        if (!this.extractor) {
            await this.init();
        }

        console.log(`Generating embedding for query: "${query}"`);
        const output = await this.extractor(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = Array.from(output.data);

        console.log("Calculating similarities...");
        const scoredItems = [];

        const queryLower = query.toLowerCase();

        // --- Hard Keyword Extraction for Categories/Spirits/Ages ---
        // If the query explicitly asks for a primary category or age, enforce it strictly.
        // The embeddings alone aren't confident enough to distinguish "French Wine" from "French Brandy",
        // nor do they mathematically distinguish well between "12 yr" and "21 yr"
        let enforcedCategory = null;
        let enforcedSpirit = null;
        let enforcedAge = null;

        const normalizedQuery = queryLower.replace(/\./g, '').replace(/(\d+)[-\s]*(year|years|yr|yrs|yo)/g, '$1yr');
        const ageMatch = normalizedQuery.match(/\b(\d+yr)\b/);
        if (ageMatch) {
            enforcedAge = ageMatch[1];
        }

        if (queryLower.match(/\bwine\b/)) enforcedCategory = 'wine';
        else if (queryLower.match(/\bchampagne\b/)) enforcedCategory = 'champagne';
        else if (queryLower.match(/\bbeer|ale|lager|stout|ipa|pilsner\b/)) enforcedCategory = 'beer';
        else if (queryLower.match(/\bliqueur|cordial\b/)) enforcedCategory = 'liqueur';

        let enforcedSubCategory = null;

        // --- Classify Major Spirits and their Sub-categories based on POS taxonomy ---
        if (queryLower.match(/\bwhiskey|whisky|bourbon|scotch|rye|malt|irish|tennessee|japanese|moonshine|white whiskey\b/)) {
            enforcedSpirit = 'whiskey';
            if (queryLower.match(/\bsingle malt\b/)) enforcedSubCategory = 'single malt';
            else if (queryLower.match(/\bbourbon\b/)) enforcedSubCategory = 'bourbon';
            else if (queryLower.match(/\brye\b/)) enforcedSubCategory = 'rye';
            else if (queryLower.match(/\bscotch\b/)) enforcedSubCategory = 'scotch';
            else if (queryLower.match(/\birish\b/)) enforcedSubCategory = 'irish';
            else if (queryLower.match(/\btennessee\b/)) enforcedSubCategory = 'tennessee';
            else if (queryLower.match(/\bjapanese\b/)) enforcedSubCategory = 'japanese';
            else if (queryLower.match(/\bpot still\b/)) enforcedSubCategory = 'pot still';
            else if (queryLower.match(/\bblended\b/)) enforcedSubCategory = 'blended';
            else if (queryLower.match(/\bsingle grain\b/)) enforcedSubCategory = 'single grain';
            else if (queryLower.match(/\bmoonshine|white whiskey\b/)) enforcedSubCategory = 'moonshine';
        }
        else if (queryLower.match(/\btequila|mezcal\b/)) {
            enforcedSpirit = 'tequila';
            if (queryLower.match(/\bblanco|silver\b/)) enforcedSubCategory = 'blanco';
            else if (queryLower.match(/\breposado\b/)) enforcedSubCategory = 'reposado';
            else if (queryLower.match(/\bañejo|anejo\b/) && !queryLower.match(/\bextra\b/)) enforcedSubCategory = 'anejo';
            else if (queryLower.match(/\bextra a(ñ|n)ejo\b/)) enforcedSubCategory = 'extra anejo';
            else if (queryLower.match(/\bjoven\b/)) enforcedSubCategory = 'joven';
            else if (queryLower.match(/\bespad(i|í)n\b/)) enforcedSubCategory = 'espadin';
            else if (queryLower.match(/\btobal(a|á)\b/)) enforcedSubCategory = 'tobala';
        }
        else if (queryLower.match(/\bvodka\b/)) {
            enforcedSpirit = 'vodka';
            if (queryLower.match(/\bwheat\b/)) enforcedSubCategory = 'wheat';
            else if (queryLower.match(/\brye\b/)) enforcedSubCategory = 'rye';
            else if (queryLower.match(/\bcorn\b/)) enforcedSubCategory = 'corn';
            else if (queryLower.match(/\bpotato\b/)) enforcedSubCategory = 'potato';
            else if (queryLower.match(/\bflavored|fruit|citrus\b/)) enforcedSubCategory = 'flavored';
        }
        else if (queryLower.match(/\brum\b/)) {
            enforcedSpirit = 'rum';
            if (queryLower.match(/\bwhite|silver\b/)) enforcedSubCategory = 'white';
            else if (queryLower.match(/\bgold\b/)) enforcedSubCategory = 'gold';
            else if (queryLower.match(/\bdark\b/)) enforcedSubCategory = 'dark';
            else if (queryLower.match(/\bspiced\b/)) enforcedSubCategory = 'spiced';
            else if (queryLower.match(/\bjamaican\b/)) enforcedSubCategory = 'jamaican';
            else if (queryLower.match(/\bagricole\b/)) enforcedSubCategory = 'agricole';
            else if (queryLower.match(/\bnavy\b/)) enforcedSubCategory = 'navy';
        }
        else if (queryLower.match(/\bgin\b/)) {
            enforcedSpirit = 'gin';
            if (queryLower.match(/\blondon dry\b/)) enforcedSubCategory = 'london dry';
            else if (queryLower.match(/\bplymouth\b/)) enforcedSubCategory = 'plymouth';
            else if (queryLower.match(/\bold tom\b/)) enforcedSubCategory = 'old tom';
            else if (queryLower.match(/\bgenever\b/)) enforcedSubCategory = 'genever';
        }
        else if (queryLower.match(/\bcognac|hennessy|hennessey|remy martin|courvoisier\b/)) {
            enforcedSpirit = 'cognac';
        }
        else if (queryLower.match(/\bbrandy\b/)) {
            enforcedSpirit = 'brandy';
        }

        // --- Wine Sub-categories ---
        if (queryLower.match(/\bwine|champagne|cabernet sauvignon|pinot noir|merlot|malbec|chardonnay|sauvignon blanc|pinot grigio|prosecco|cava|ros(é|e)\b/)) {
            if (!enforcedCategory) enforcedCategory = 'wine'; // default fallback if wine or champagne wasn't explicitly said
            if (queryLower.match(/\bcabernet sauvignon\b/)) enforcedSubCategory = 'cabernet sauvignon';
            else if (queryLower.match(/\bpinot noir\b/)) enforcedSubCategory = 'pinot noir';
            else if (queryLower.match(/\bmerlot\b/)) enforcedSubCategory = 'merlot';
            else if (queryLower.match(/\bmalbec\b/)) enforcedSubCategory = 'malbec';
            else if (queryLower.match(/\bchardonnay\b/)) enforcedSubCategory = 'chardonnay';
            else if (queryLower.match(/\bsauvignon blanc\b/)) enforcedSubCategory = 'sauvignon blanc';
            else if (queryLower.match(/\bpinot grigio\b/)) enforcedSubCategory = 'pinot grigio';
            else if (queryLower.match(/\bchampagne|prosecco|cava|sparkling\b/)) enforcedSubCategory = 'sparkling';
            else if (queryLower.match(/\bros(é|e)\b/)) enforcedSubCategory = 'rose';
            else if (queryLower.match(/\bred\b/)) enforcedSubCategory = 'red';
            else if (queryLower.match(/\bwhite\b/)) enforcedSubCategory = 'white';
        }

        // Allow "smoke" and "smoky" to match each other based on root substring
        const effectiveQuery = (queryLower === 'smoky' || queryLower === 'smoke') ? 'smok' : queryLower;
        const isSmokySearch = (queryLower === 'smoky' || queryLower === 'smoke');

        for (const record of inventoryEmbeddings) {
            const fullItem = this.mappedInventory.get(record.id);
            if (!fullItem) continue;

            // Strict Filter: Don't bother scoring if it violates a core requested age
            if (enforcedAge) {
                const itemNormalizedStr = `${fullItem.liquorType || ''} ${fullItem.name || ''}`.toLowerCase().replace(/\./g, '').replace(/(\d+)[-\s]*(year|years|yr|yrs|yo)/g, '$1yr');
                if (!itemNormalizedStr.includes(enforcedAge)) {
                    continue; // Strip semantic results that violate the explicit age bracket completely
                }
            }

            // Strict Filter: Don't bother scoring if it violates a core requested category
            if (enforcedCategory) {
                if (!fullItem.catLower.includes(enforcedCategory)) continue;
            }

            if (enforcedSpirit) {
                let isSpiritMatch = fullItem.typeLower.includes(enforcedSpirit) || fullItem.nameLower.includes(enforcedSpirit);

                // Special handling for whiskey variants
                if (enforcedSpirit === 'whiskey' && (fullItem.typeLower.match(/bourbon|scotch|rye|malt|moonshine/) || fullItem.nameLower.match(/bourbon|scotch|rye|malt|moonshine|ole smokey/))) {
                    isSpiritMatch = true;
                    // If the user specifically asked for Rye, do not allow other generic whiskeys to pass the spirit check
                    if (enforcedSubCategory === 'rye' && !fullItem.typeLower.includes('rye') && !fullItem.nameLower.includes('rye')) {
                        isSpiritMatch = false;
                    }
                }

                if (!isSpiritMatch) continue;
            }

            if (enforcedSubCategory) {
                const classificationStr = `${fullItem.liquorType || ''} ${fullItem.name || ''} ${fullItem.style || ''} ${fullItem.category || ''}`.toLowerCase();
                let isSubCategoryMatch = false;

                // Handle string variations (e.g. añejo, rosé)
                const normalizedClassStr = classificationStr.replace(/[é]/g, 'e').replace(/[ñ]/g, 'n').replace(/[í]/g, 'i').replace(/[á]/g, 'a');

                isSubCategoryMatch = normalizedClassStr.includes(enforcedSubCategory);

                // Allow "malt" to count as "single malt" in names/types since our DB often just says "Single Malt Scotch" or "Malt"
                if (enforcedSubCategory === 'single malt' && normalizedClassStr.includes('malt')) {
                    isSubCategoryMatch = true;
                    // BUT prevent "Malt Liquor" (Beer) from impersonating a Single Malt Whiskey
                    if (normalizedClassStr.includes('malt liquor')) {
                        isSubCategoryMatch = false;
                    }
                }

                // For 'white' or 'silver' tequila/rum, allow both terms interchangeably
                if ((enforcedSubCategory === 'blanco' || enforcedSubCategory === 'silver' || enforcedSubCategory === 'white') &&
                    (normalizedClassStr.includes('blanco') || normalizedClassStr.includes('silver') || normalizedClassStr.includes('white'))) {
                    isSubCategoryMatch = true;
                }

                if (!isSubCategoryMatch) continue;
            }

            let similarity = dotProduct(queryEmbedding, record.embedding);

            // Keyword Boost: If the query term literally appears in the item's notes, boost its semantic score
            if (fullItem.searchStr.includes(effectiveQuery)) {
                similarity += 0.25; // Significant boost for exact text match within semantic context
            }

            // Extra boost if it explicitly says Islay or Peat when searching for "smoky" (domain-specific optimization)
            if (isSmokySearch && (fullItem.searchStr.includes('peat') || fullItem.searchStr.includes('islay'))) {
                similarity += 0.15;
            }

            scoredItems.push({ id: record.id, similarity });
        } // End of for...of loop

        // Sort by highest similarity
        scoredItems.sort((a, b) => b.similarity - a.similarity);

        // Get top 24 results with similarity > 0.3
        const topResults = scoredItems
            .filter(item => item.similarity > 0.3)
            .slice(0, 24);

        // Map back to inventory full items
        const results = topResults.map(res => {
            const originalItem = inventory.find(i => i.id === res.id); // It's fine here, only 24 items
            return {
                ...originalItem,
                matchType: 'semantic',
                similarityScore: res.similarity,
                matchScore: Math.round(res.similarity * 100) // pseudo match score for UI
            };
        });

        return results;
    }
}

export const semanticEngine = new SemanticSearchEngine();
