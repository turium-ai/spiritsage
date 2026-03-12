import engine from './src/utils/SemanticSearchEngine.js';

async function test() {
    console.log("Parsing 'hennessey':");
    const intent1 = await engine.parseQueryIntent('hennessey');
    console.log(JSON.stringify(intent1, null, 2));

    console.log("\nParsing 'hennessy':");
    const intent2 = await engine.parseQueryIntent('hennessy');
    console.log(JSON.stringify(intent2, null, 2));
}

test();
