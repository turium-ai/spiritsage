require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Test with standard v1beta 

async function test() {
    const models = [
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-exp-1206',
        'gemini-2.5-flash-native-audio-latest'
    ];
    for (const m of models) {
        console.log(`\nTesting ${m}...`);
        try {
            const session = await ai.live.connect({
                model: m,
                config: {
                    responseModalities: ['AUDIO'],
                },
                callbacks: {
                    onopen: () => console.log('OPENED!'),
                    onerror: (e) => console.log('ERROR callback:', e),
                    onmessage: () => { },
                    onclose: (e) => console.log('CLOSED callback:', e.reason)
                }
            });
            console.log(`=> SUCCESS with ${m}!`);
            // wait a little bit to see if it closes
            await new Promise(r => setTimeout(r, 1000));
            // if we have a connection and it didn't close
            if (session && session.conn && session.conn.readyState === 1) {
                console.log(`=> STILL OPEN with ${m}!`);
                session.conn.close();
                return m;
            }
        } catch (err) {
            console.log(`=> Failed exception for ${m}: ${err.message || 'unknown error'}`);
        }
    }
}

test();
