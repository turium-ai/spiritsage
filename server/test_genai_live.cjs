require('dotenv').config({ path: '.env' });
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    console.log("Connecting...");
    const session = await ai.live.connect({ model: 'gemini-2.5-flash-native-audio-latest' });
    console.log("Connected. Methods on session:", Object.keys(session));
    console.log("Methods on session.sendRealtimeInput:", typeof session.sendRealtimeInput);
    session.conn.close();
}
run().catch((err) => {
    console.error("Setup error", err);
    process.exit(1);
});
