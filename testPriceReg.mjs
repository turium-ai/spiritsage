export function extractPriceFilters(text) {
    let min = undefined;
    let max = undefined;
    let cleanText = text ? text.toString() : '';

    if (!cleanText) return { min, max, cleanText };

    // Common phrases
    const phrases = [
        /(?:cheap|budget|inexpensive)/i,
        /(?:premium|expensive|high-end)/i
    ];

    // Range: $30-$50, 30 to 50, between 30 and 50
    const rangeMatch = cleanText.match(/(?:between\s+)?\$?(\d+)\s*(?:-|to|and)\s*\$?(\d+)(?:\s*bucks|\s*dollars)?/i);
    if (rangeMatch) {
        min = parseInt(rangeMatch[1], 10);
        max = parseInt(rangeMatch[2], 10);
        cleanText = cleanText.replace(rangeMatch[0], '');
    } else {
        // Under/Max: under 50, <50, below $50
        const underMatch = cleanText.match(/(?:under|below|<|less than|max(?:imum)?)\s*\$?(\d+)(?:\s*bucks|\s*dollars)?/i);
        if (underMatch) {
            max = parseInt(underMatch[1], 10);
            cleanText = cleanText.replace(underMatch[0], '');
        } else {
            // Over/Min: over 50, >50, more than $50
            const overMatch = cleanText.match(/(?:over|above|>|more than|min(?:imum)?)\s*\$?(\d+)(?:\s*bucks|\s*dollars)?/i);
            if (overMatch) {
                min = parseInt(overMatch[1], 10);
                cleanText = cleanText.replace(overMatch[0], '');
            } else {
                // Exact/Around: $50, around 50 bucks
                const exactMatch = cleanText.match(/(?:around|about|~|for)?\s*\$(\d+)(?:\s*bucks|\s*dollars)?/i);
                if (exactMatch) {
                    const val = parseInt(exactMatch[1], 10);
                    min = Math.max(0, val - 10);
                    max = val + 15;
                    cleanText = cleanText.replace(exactMatch[0], '');
                }
            }
        }
    }

    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    return { min, max, cleanText };
}

[
    "bourbon whiskey $30-$50",
    "tequila under 40 bucks",
    "scotch over $100",
    "cheap vodka",
    "wine around $20",
    "between 30 and 50 dollars rum",
].forEach(q => {
    console.log(`"${q}" ->`, extractPriceFilters(q));
});
