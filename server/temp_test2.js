require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-latest',
        config: { tools: [{ functionDeclarations: [{ name: 'testFunc', description: 'test' }] }] },
        callbacks: {
            onmessage: (data) => {
                if (data.serverContent?.modelTurn?.parts?.[0]?.functionCall) {
                    const id = data.serverContent.modelTurn.parts[0].functionCall.id;
                    console.log('Got functionCall', id);
                    session.sendToolResponse({ functionResponses: [{ id: id, name: 'testFunc', response: { result: 'ok' } }] });
                    console.log('Called sendToolResponse');
                } else if (data.serverContent?.modelTurn?.parts?.[0]?.text) {
                    console.log('Model said:', data.serverContent.modelTurn.parts[0].text);
                } else {
                    console.log('Other message:', Object.keys(data.serverContent || {}));
                }
            },
            onerror: console.error,
            onclose: () => { console.log('CLOSED BY GOOGLE'); process.exit(1); }
        }
    });

    session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Please call testFunc right now.' }] }] });
}
test();
