require('dotenv').config({ path: '.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    const session = await ai.live.connect({ model: 'gemini-2.5-flash-native-audio-latest' });

    console.log("Session prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
    session.conn.close();
}
run().catch(console.error);
