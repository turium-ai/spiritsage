const fs = require('fs');

const raw = fs.readFileSync('out.json', 'utf8');
const chunks = raw.split('MESSAGE:');
console.log('Got ' + chunks.length + ' chunks.');

let count = 0;
for (const chunk of chunks) {
    if (!chunk || chunk.trim() === '') continue;
    if (chunk.includes('OPENED!')) continue;

    try {
        const data = JSON.parse(chunk.trim());
        if (data.serverContent?.modelTurn?.parts) {
            for (const p of data.serverContent.modelTurn.parts) {
                if (p.inlineData) {
                    console.log(`Found audio chunk ${count++} with length ${p.inlineData.data.length}. MimeType: ${p.inlineData.mimeType}`);
                }
            }
        }
    } catch (e) { }
}
console.log('Total audio chunks found:', count);
