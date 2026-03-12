function getLevenshteinDistance(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
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

function isFuzzyMatch(term, text) {
    if (!text) return false;
    const normalizedTerm = term.replace(/\./g, '');
    const normalizedText = text.replace(/\./g, '');
    if (normalizedText.includes(normalizedTerm)) return true;
    if (normalizedTerm.length <= 3) return false;

    // Simulate old code - no digit regex bailout

    const textWords = normalizedText.split(/[\s\-]+/);
    for (const word of textWords) {
        if (Math.abs(word.length - normalizedTerm.length) <= 2) {
            if (word.length >= 4 && word[0] !== normalizedTerm[0] && word[1] !== normalizedTerm[1]) continue;

            const distance = getLevenshteinDistance(normalizedTerm, word);
            console.log(`Matching [${normalizedTerm}] against [${word}] => Distance: ${distance}`);
            if (normalizedTerm.length >= 4 && normalizedTerm.length <= 7 && distance <= 1) return true;
            if (normalizedTerm.length >= 8 && distance <= 2) return true;
        }
    }
    return false;
}

const terms = ["12", "YEAR", "SINGLE", "MALT"];
const name = "MACALLAN SCOTCH 12YR DOUBLE CASK";
const type = "WHISKEY";

for (const term of terms) {
    console.log(`Is '${term}' fuzzy matching Macallan name or type?`);
    const matchName = isFuzzyMatch(term, name);
    const matchType = isFuzzyMatch(term, type);
    console.log(`Result: name=${matchName}, type=${matchType}`);
}
