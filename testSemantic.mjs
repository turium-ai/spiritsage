import fs from 'fs';
let code = fs.readFileSync('./src/utils/SemanticSearchEngine.js', 'utf8');
code = code.replace(/assert/g, 'with');
fs.writeFileSync('./shimSemantic.mjs', code);
