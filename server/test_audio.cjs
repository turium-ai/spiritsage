require('dotenv').config({ path: '.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-latest',
        config: {
            responseModalities: ['AUDIO']
        },
        callbacks: {
            onmessage: (data) => {
                console.log("Received data keys:", Object.keys(data));
                if (data.serverContent?.modelTurn) {
                    console.log("Got response!");
                    for (const part of data.serverContent.modelTurn.parts) {
                        if (part.inlineData) console.log("Got Audio!");
                        if (part.text) console.log("Got Text!", part.text);
                    }
                }
            },
            onerror: (e) => console.error("WS ERROR:", e),
            onclose: (e) => console.log("WS CLOSED:", e.reason)
        }
    });

    try {
        console.log("Sending silent audio packet to bypass modality filter...");
        const silence = new Uint8Array(32000).fill(0); // 1 second of 16kHz 16-bit PCM = 32000 bytes
        const base64Audio = Buffer.from(silence).toString('base64');
        session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } });

        console.log("Sending text...");
        session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Hello, please respond now.' }] }] });
    } catch (e) {
        console.error("Format failed", e.message);
    }
}
run().catch(console.error);
