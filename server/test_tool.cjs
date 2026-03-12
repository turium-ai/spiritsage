require('dotenv').config({ path: '.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-latest',
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: {
                parts: [{ text: "You must always use the 'timeOfDay' tool right away." }]
            },
            tools: [{
                functionDeclarations: [{
                    name: 'timeOfDay',
                    description: 'Returns the current time',
                    parameters: { type: 'OBJECT', properties: {} }
                }]
            }]
        },
        callbacks: {
            onmessage: (data) => {
                console.log("Received data keys:", Object.keys(data));
                if (data.toolCall) {
                    console.log("Got toolCall!", data.toolCall);
                    const callId = data.toolCall.functionCalls[0].id;

                    // Try sending tool response
                    // According to types, it expects an array or object of FunctionResponse
                    const responseObj = {
                        functionResponses: [{
                            id: callId,
                            name: 'timeOfDay',
                            response: { time: "12:00 PM" }
                        }]
                    };
                    console.log("Sending Tool Response:", JSON.stringify(responseObj, null, 2));
                    try {
                        session.sendToolResponse(responseObj);
                    } catch (e) {
                        console.error("Failed to send tool response", e);
                    }
                }
                if (data.serverContent?.modelTurn) {
                    console.log("Got Model Turn Answer!");
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
        // 1s of 16kHz PCM
        const silence = new Uint8Array(32000).fill(0);
        const base64Audio = Buffer.from(silence).toString('base64');
        session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } });

        console.log("Sending text...");
        session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'What time is it?' }] }] });
    } catch (e) {
        console.error("Format failed", e.message);
    }
}
run().catch(console.error);
