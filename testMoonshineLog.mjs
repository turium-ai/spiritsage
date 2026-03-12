import fs from 'fs';
let code = fs.readFileSync('./src/utils/RecommendationEngine.js', 'utf8');
code = code.replace(/return ranked;\n    }/, "console.log('Intent:', searchIntent); return ranked;\n    }");
fs.writeFileSync('./shim.mjs', code);
