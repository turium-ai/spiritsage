const fs = require('fs');
const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));

function getLevenshteinDistance(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let v0 = new Int32Array(b.length + 1);
    let v1 = new Int32Array(b.length + 1);

    for (let i = 0; i <= b.length; i++) v0[i] = i;

    for (let i = 0; i < a.length; i++) {
        v1[0] = i + 1;
        const charA = a[i];
        
        for (let j = 0; j < b.length; j++) {
            const cost = charA === b[j] ? 0 : 1;
            v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
        }
        
        let temp = v0;
        v0 = v1;
        v1 = temp;
    }
    return v0[b.length];
}

function isFuzzyMatch(term, text) {
    if (!text) return false;
    const normalizedTerm = term.replace(/\./g, '');
    const normalizedText = text.replace(/\./g, '');
    if (normalizedText.includes(normalizedTerm)) return true;
    if (normalizedTerm.length <= 3) return false;

    const textWords = normalizedText.split(/[\s\-]+/);
    for (const word of textWords) {
        if (Math.abs(word.length - normalizedTerm.length) <= 2) {
            if (word.length >= 4 && word[0] !== normalizedTerm[0] && word[1] !== normalizedTerm[1]) {
                 continue; 
            }
            const distance = getLevenshteinDistance(normalizedTerm, word);
            if (normalizedTerm.length >= 4 && normalizedTerm.length <= 7 && distance <= 1) return true;
            if (normalizedTerm.length >= 8 && distance <= 2) return true;
        }
    }
    return false;
}

let matches = 0;
for (const item of inventory) {
    const term = "mexican".toUpperCase();
    const name = (item.name || "").toUpperCase();
    const type = (item.liquorType || "").toUpperCase();
    
    if (isFuzzyMatch(term, name) || isFuzzyMatch(term, type)) {
        console.log(`Matched: ${item.name} (${item.liquorType})`);
        matches++;
    }
}
console.log(`Total Matches: ${matches}`);
