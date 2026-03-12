/**
 * BrewSage Weighted Recommendation Engine
 * Optimized for large datasets (4,000+ items)
 */

class RecommendationEngine {
    constructor(inventory) {
        this.inventory = inventory;
    }

    /**
     * Calculates Levenshtein distance between two string tokens
     */
    getLevenshteinDistance(a, b) {
        if (a === b) return 0;
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    /**
     * Checks if a search term matches a target string, allowing minor typos
     */
    isFuzzyMatch(term, text) {
        if (!text) return false;

        // Normalize both sides by removing dots for acronym matching (X.O -> XO)
        const normalizedTerm = term.replace(/\./g, '');
        const normalizedText = text.replace(/\./g, '');

        // Exact substring match passes instantly
        if (normalizedText.includes(normalizedTerm)) return true;

        // Don't risk fuzzy matching on tiny 3-character acronyms/words
        if (normalizedTerm.length <= 3) return false;

        // Strict Filter: Never perform fuzzy typo math on numbers (e.g., ages, sizes, pack quantities)!
        // A distance of 1 between "12yr" and "14yr" makes them completely different products.
        if (/\d/.test(normalizedTerm)) return false;

        const textWords = normalizedText.split(/[\s\-]+/);
        for (const word of textWords) {
            // Only compare if the lengths are vaguely similar
            if (Math.abs(word.length - normalizedTerm.length) <= 2) {
                // Heuristic: Must share at least the first letter to bother parsing Levenshtein completely
                if (word.length >= 4 && word[0] !== normalizedTerm[0] && word[1] !== normalizedTerm[1]) {
                    continue; // Not a likely typo if both first two letters are completely wrong
                }

                const distance = this.getLevenshteinDistance(normalizedTerm, word);
                // Allow 1 typo for words 5-8 characters long
                if (normalizedTerm.length >= 5 && normalizedTerm.length <= 8 && distance <= 1) return true;
                // Allow 1 typo for 9+ characters. Only allow 2 typos if the string is 10+ characters AND shares the first 3 letters.
                if (normalizedTerm.length >= 9 && distance <= 1) return true;
                if (normalizedTerm.length >= 10 && distance <= 2 && word.substring(0, 3) === normalizedTerm.substring(0, 3)) return true;
            }
        }
        return false;
    }

    /**
     * Extracts the base spirit type from a detailed liquorType string
     */
    getBaseSpirit(type) {
        if (!type) return null;
        const t = type.toLowerCase();
        if (t.includes('whiskey') || t.includes('whisky') || t.includes('bourbon') || t.includes('scotch')) return 'whiskey';
        if (t.includes('vodka')) return 'vodka';
        if (t.includes('rum')) return 'rum';
        if (t.includes('tequila') || t.includes('mezcal')) return 'tequila';
        if (t.includes('gin')) return 'gin';
        if (t.includes('cognac')) return 'cognac';
        if (t.includes('brandy')) return 'brandy';
        if (t.includes('liqueur') || t.includes('cordial')) return 'liqueur';
        return null;
    }

    getWhiskeySubtype(type) {
        if (!type) return null;
        const t = type.toLowerCase();
        if (t.includes('irish')) return 'irish';
        if (t.includes('bourbon')) return 'bourbon';
        if (t.includes('scotch') || t.includes('single malt')) return 'scotch';
        if (t.includes('rye')) return 'rye';
        if (t.includes('japanese')) return 'japanese';
        if (t.includes('canadian')) return 'canadian';
        if (t.includes('tennessee')) return 'tennessee';
        return null;
    }

    /**
     * Extracts an age statement (e.g. 12 from "12-Year-Old") from a string
     */
    getAgeStatement(text) {
        if (!text) return null;
        const normalized = this.normalizeAgeText(text);
        const match = normalized.match(/(\d+)YR/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Extracts a pack size (e.g. 6 from "6 pk", "6 pack")
     * If category is Beer, intelligently infer standalone numbers as pack sizes.
     */
    getPackSize(text, categoryContext = null) {
        if (!text) return { size: null, raw: null };
        const match = text.match(/\b(\d+)\s*-?\s*(?:pk|pck|pack|pcs|pks)\b/i);
        if (match) return { size: parseInt(match[1], 10), raw: match[0] };

        // Implicit pack sizes for Beer
        if (categoryContext === 'Beer, Cider & Seltzers' || text.toLowerCase().includes('beer')) {
            const implicitMatch = text.match(/\b(4|6|8|12|15|18|24|30|36)\b/i);
            if (implicitMatch) {
                // Ensure the number isn't a volume like 24oz or 12ml
                const lookahead = text.substring(implicitMatch.index + implicitMatch[0].length);
                if (!lookahead.match(/^\s*(oz|ml|liter|l|can|cans|bottle|bottles|btl|btls)\b/i)) {
                    return { size: parseInt(implicitMatch[1], 10), raw: implicitMatch[0] };
                }
            }
        }

        return { size: null, raw: null };
    }

    /**
     * Extracts a Cognac/Brandy quality grade (e.g., VS, VSOP, XO)
     */
    getQualityGrade(text) {
        if (!text) return null;
        const t = text.toUpperCase().replace(/\./g, ''); // Remove all dots for normalization (X.O -> XO, V.S.O.P -> VSOP)
        if (t.match(/\bXO\b/)) return 'XO';
        if (t.match(/\bVSOP\b/)) return 'VSOP';
        if (t.match(/\bVS\b/)) return 'VS';
        return null;
    }

    getVolumeML(sizeStr) {
        if (!sizeStr) return 750;
        const str = sizeStr.toString().toUpperCase();
        const num = parseFloat(str) || 0;
        if (num === 0) return 750;

        if (str.includes("ML")) return num;
        if (str.includes("L") || str.includes("LTR")) return num * 1000;
        if (str.includes("OZ") || str.includes("Z") || str.includes("OUNCE")) return num * 29.5735;

        return 750;
    }

    getNormalizedPrice(price, sizeStr) {
        const ml = this.getVolumeML(sizeStr);
        return (price / ml) * 750;
    }

    /**
     * Normalizes age strings (e.g. "12 year", "12-Year", "12 YO") to a consistent "12yr" format
     */
    normalizeAgeText(str) {
        return (str || '')
            .toLowerCase()
            .replace(/\./g, '') // Stripping dots globally for acronym stability (XO, VSOP)
            .replace(/(\d+)[-\s]*(year|years|yr|yrs|yo)/g, '$1yr')
            .toUpperCase();
    }

    /**
     * Score and rank items based on user preferences
     * @param {Object} preferences - { category, style, minPrice, maxPrice, search, strictMinPrice, strictMaxPrice }
     * @returns {Array} Ranked recommendations
     */
    recommend(preferences) {
        const { category, style, minPrice, maxPrice, search, strictMinPrice, strictMaxPrice } = preferences;

        // Normalize "12 year" or "10 yrs" down to "12yr" to match the database's string format symmetrically
        let normalizedSearch = search ? this.normalizeAgeText(search).toLowerCase() : '';

        let searchCategoryContext = category;
        if ((!searchCategoryContext || searchCategoryContext === 'All') && normalizedSearch) {
            const firstWord = normalizedSearch.split(' ')[0];
            if (firstWord.length > 2) {
                const hintMatch = this.inventory.find(i => {
                    const n = this.normalizeAgeText(i.name).toLowerCase();
                    const t = this.normalizeAgeText(i.liquorType).toLowerCase();
                    return n.includes(firstWord) || t.includes(firstWord);
                });
                if (hintMatch) {
                    searchCategoryContext = hintMatch.category;
                }
            }
        }

        // 1. Pre-process Search Intent
        const packSizeExtract = this.getPackSize(normalizedSearch, searchCategoryContext);
        const searchPackSize = packSizeExtract.size;

        if (searchPackSize) {
            // Remove the pack size from the text search string so it doesn't pollute the word tokenizer
            // e.g. "stella 6" -> "stella"
            normalizedSearch = normalizedSearch.replace(packSizeExtract.raw, '').trim();
        }

        let searchIntent = null;
        if (normalizedSearch && normalizedSearch.length > 2) {
            const searchTerms = normalizedSearch.toUpperCase().split(' ').filter(t => t.length > 0);
            const allExactMatches = this.inventory.filter(item => {
                // Enforce category constraints for intent generation
                if (category && category !== 'All') {
                    if (category !== item.category) {
                        const targetCategories = category.split(',').map(c => c.trim());
                        if (!targetCategories.includes(item.category)) return false;
                    }
                }

                // If user asked for a specific pack size, discard everything else from building intent
                if (searchPackSize) {
                    const itemPackSize = this.getPackSize(item.name).size || this.getPackSize(item.size).size;
                    if (itemPackSize !== searchPackSize) return false;
                }

                const name = this.normalizeAgeText(item.name);
                const type = this.normalizeAgeText(item.liquorType);
                return searchTerms.every(term => this.isFuzzyMatch(term, name) || this.isFuzzyMatch(term, type));
            });
            const exactMatches = allExactMatches.slice(0, 5);

            if (exactMatches.length > 0) {
                // Infer dominant traits from the brand/item searched
                const firstMatch = exactMatches[0];
                const avgNormalizedPrice = allExactMatches.reduce((sum, item) => sum + this.getNormalizedPrice(item.price, item.size), 0) / allExactMatches.length;
                let age = null;
                let quality = null;
                for (const match of allExactMatches) {
                    age = this.getAgeStatement(match.liquorType) || this.getAgeStatement(match.name);
                    quality = this.getQualityGrade(match.liquorType) || this.getQualityGrade(match.name);
                    if (age || quality) break;
                }
                console.log('Extracted Intent:', {
                    category: firstMatch.category,
                    style: firstMatch.style,
                    flavorProfile: firstMatch.flavorProfile,
                    referencePrice: avgNormalizedPrice,
                    baseSpiritType: firstMatch.liquorType || firstMatch.category,
                    ageStatement: age,
                    qualityGrade: quality,
                    packSize: searchPackSize
                };
            }
        } else if (searchPackSize) {
            // Fallback if they ONLY searched for "6 pk"
            searchIntent = { packSize: searchPackSize };
        }

        // STEP 1: Strict Filtering
        // Remove items that definitely shouldn't be shown based on hard filters
        let eligibleItems = this.inventory.filter(item => {
            // Globally exclude miniature sizes unless explicitly searched for
            const sizeStr = ((item.size || '') + ' ' + (item.name || '')).toLowerCase().replace(/\s/g, '');
            const miniatureRegex = /(^|\D)(50ml|100ml|200ml|375ml|pint|nip)($|\D)/;
            const isMiniature = miniatureRegex.test(sizeStr);

            const searchStr = (search || '').toLowerCase().replace(/\s/g, '');
            const searchWantsMiniature = miniatureRegex.test(searchStr);

            if (isMiniature && !searchWantsMiniature) return false;

            // A. Strict Price Filters (from the UI buckets)
            if (strictMinPrice !== undefined && item.price < strictMinPrice) return false;
            if (strictMaxPrice !== undefined && item.price > strictMaxPrice) return false;

            // B. Strict Category Filters (always enforce if a specific category is selected)
            if (category && category !== 'All') {
                if (category !== item.category) {
                    const targetCategories = category.split(',').map(c => c.trim());
                    if (!targetCategories.includes(item.category)) return false;
                }
            }

            // C. Strict Pack Size Filters
            if (searchIntent && searchIntent.packSize) {
                const itemPackSize = this.getPackSize(item.name).size || this.getPackSize(item.size).size;
                if (itemPackSize !== searchIntent.packSize) return false;
            }

            // C. Strict Style Filters (only when not searching, so text queries aren't arbitrarily dropped)
            if (!search) {
                if (style) {
                    if (item.style !== style && item.flavorProfile !== style) return false;
                }
            }

            return true;
        });

        // STEP 2: Scoring & Ranking (only on eligible items)
        // STEP 2: Scoring & Ranking (only on eligible items)

        const ranked = eligibleItems
            .map(item => {
                let score = 0;
                let itemCopy = { ...item };
                const name = this.normalizeAgeText(item.name);
                const type = this.normalizeAgeText(item.liquorType);

                // Direct Search Match (Highest Priority)
                if (normalizedSearch) {
                    const searchTerms = normalizedSearch.toUpperCase().split(' ');
                    let isBrandMatch = searchTerms.every(term => this.isFuzzyMatch(term, name) || this.isFuzzyMatch(term, type));

                    // Prevent an item from being an exact match for a broad category search if its actual category differs
                    if (isBrandMatch && ['WINE', 'BEER', 'SPIRIT', 'LIQUOR', 'CHAMPAGNE', 'TEQUILA', 'VODKA', 'WHISKEY', 'GIN', 'RUM'].includes(normalizedSearch.toUpperCase())) {
                        const itemCategoryUpper = (item.category || '').toUpperCase();
                        let targetCategory = normalizedSearch.toUpperCase() === 'LIQUOR' ? 'SPIRIT' : normalizedSearch.toUpperCase();

                        // Handle generic broad searches mapping to subcategories
                        const isSubcategory = ['TEQUILA', 'VODKA', 'WHISKEY', 'GIN', 'RUM'].includes(targetCategory);
                        const itemTypeUpper = (item.liquorType || '').toUpperCase();

                        if (isSubcategory) {
                            if (!itemTypeUpper.includes(targetCategory)) isBrandMatch = false;
                        } else if (itemCategoryUpper !== targetCategory) {
                            isBrandMatch = false;
                        }
                    }

                    if (isBrandMatch) {
                        score += 100; // Perfect match for the searched brand
                        itemCopy.matchType = 'exact';
                    } else if (searchIntent && item.category === searchIntent.category) {
                        let isComparable = false;
                        const searchBase = searchIntent.baseSpiritType ? this.getBaseSpirit(searchIntent.baseSpiritType) : null;

                        if (searchBase) {
                            // strictly match base spirit (Whiskey -> Whiskey)
                            const itemBase = this.getBaseSpirit(item.liquorType);
                            isComparable = itemBase === searchBase;

                            // If base is whiskey, enforce subtype match if one exists
                            if (isComparable && searchBase === 'whiskey') {
                                const searchSubtype = this.getWhiskeySubtype(searchIntent.baseSpiritType);
                                const itemSubtype = this.getWhiskeySubtype(item.liquorType) || this.getWhiskeySubtype(item.name);

                                if (searchSubtype) {
                                    if (itemSubtype !== searchSubtype) {
                                        isComparable = false;
                                    }
                                }
                            }

                            // Prevent unaged spirits from being Smart Alternatives to explicitly aged searches
                            if (isComparable && searchIntent.ageStatement) {
                                const itemAge = this.getAgeStatement(item.liquorType) || this.getAgeStatement(item.name);
                                if (!itemAge) {
                                    isComparable = false;
                                }
                            }

                            // Quality Grade Matching (Cognac/Brandy specific)
                            if (isComparable && searchIntent.qualityGrade) {
                                const itemQuality = this.getQualityGrade(item.liquorType) || this.getQualityGrade(item.name);
                                if (!itemQuality) {
                                    isComparable = false; // VSOP shouldn't show generic brandy as primary alternative
                                } else if (itemQuality !== searchIntent.qualityGrade) {
                                    // Maybe allow VS if they searched VSOP as a value alt? 
                                    // For now, let's keep it strict so the sidebar "refreshes"
                                    isComparable = false;
                                }
                            }
                        } else {
                            // fallback to strict style match (Wine/Beer)
                            isComparable = !!(searchIntent.style && item.style === searchIntent.style);
                        }

                        if (isComparable) {
                            score += 50;
                            itemCopy.matchType = 'comparable';
                        }
                    }

                    // Calculate Smart Upgrades & Values for ALL matched/comparable items
                    if (searchIntent && (itemCopy.matchType === 'exact' || itemCopy.matchType === 'comparable')) {
                        const itemAge = this.getAgeStatement(item.liquorType) || this.getAgeStatement(item.name);
                        const itemNormPrice = this.getNormalizedPrice(item.price, item.size);

                        // Age-based Smart Upgrades
                        if (searchIntent.ageStatement && itemAge) {
                            if (itemAge === searchIntent.ageStatement && itemCopy.matchType === 'comparable') {
                                score += 20; // Same age bracket -> highly comparable
                            } else if (itemAge > searchIntent.ageStatement && itemNormPrice <= searchIntent.referencePrice + 10) {
                                // Upgrade (older) but normalized price is within $10 threshold
                                score += 30;
                                itemCopy.isGreatUpgrade = true;
                            }
                        }

                        // Value vs Splurge Logic
                        if (!itemCopy.isGreatUpgrade) {
                            // Only consider it a "Smart Alternative" if it's not radically cheaper (e.g. don't suggest $10 brandy for $200 cognac)
                            // A cheaper alternative should be at least 25% of the reference price to be considered "comparable in quality"
                            const isAtLeastReasonableValue = itemNormPrice >= searchIntent.referencePrice * 0.25;

                            if (itemNormPrice < searchIntent.referencePrice) {
                                // Great Value
                                if (isAtLeastReasonableValue) {
                                    if (itemCopy.matchType === 'comparable') score += 20;
                                    itemCopy.isCheaperAlternative = true;
                                } else {
                                    // Too cheap to be a "Smart Alternative", but we'll still show it in exact matches
                                    // Just don't let it siphon into the "Smart Alternatives" sidebar if it's too budget
                                }
                            } else if (itemNormPrice > searchIntent.referencePrice && itemNormPrice <= searchIntent.referencePrice * 1.6) {
                                // Worth the Splurge / Step-Up
                                // If it's a bit more expensive but strongly comparable
                                if (itemCopy.matchType === 'comparable') score += 10;
                                itemCopy.isSplurge = true;
                            }
                        }
                    }
                } else {
                    // When not searching, eligible items have already passed the strict Category/Style check.
                    // Give them a base score so they are guaranteed to show up.
                    score += 50;
                }

                // General Boosts (Stock & Price Tiers) applied to ALL matched items
                // Boost standard-priced items ($8-$35) so category browsing surfaces standard packs
                if (item.price >= 8 && item.price <= 35) {
                    score += 15;
                } else if (item.price > 35) {
                    score += 5; // Expensive items beat loose cans, but trail standard packs
                }

                // ⭐ Elevate blockbuster popular items into their own highest score tier
                // so they surface cleanly to the top page while remaining purely sorted by price
                if (item.stock > 300) {
                    score += 20;
                }

                if (item.stock > 0) score += 5;

                return { ...itemCopy, matchScore: Math.round(score) };
            })
            // Only require a positive matchScore now, since baseline valid items get 50.
            // Items that are completely unrelated to a search might score 0 or 5.
            .filter(item => {
                if (search) {
                    // Must have an actual search match — general boosts alone (stock, price tier) are not enough
                    return item.matchType === 'exact' || item.matchType === 'comparable';
                }
                return item.matchScore >= 50; // Must be a valid filtered item
            })
            .sort((a, b) => {
                // Strict separation of match tiers
                if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
                if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
                if (a.matchType === 'comparable' && b.matchType !== 'comparable') return -1;
                if (b.matchType === 'comparable' && a.matchType !== 'comparable') return 1;

                // For generic category searches AND comparable backups, prioritize score tiers
                // Only true exact text results bypass scoring to be strictly sorted ascending by lowest price
                if (!search || a.matchType !== 'exact') {
                    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
                }

                // If scores match (or exact search), STRICTLY sort ascending by price to keep the UI perfectly lined up
                return a.price - b.price;
            })
            .slice(0, 48); // Show 48 results (2 heavily populated pages)

        if (search === "12 year" || search === "12yr") {
            console.log(`[DEBUG] SEARCH: "${search}", INTENT:`, searchIntent);
            console.log(`[DEBUG] EXACT MATCH COUNT in output:`, ranked.filter(i => i.matchType === 'exact').length);
            console.log(`[DEBUG] RANKED ITEMS:`, ranked.map(i => `${i.name} [${i.matchType}]`));
        }

        console.log("searchIntent was:", searchIntent); return ranked;
    }
}

module.exports = { RecommendationEngine };