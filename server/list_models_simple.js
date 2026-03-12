const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels(); // This is just a dummy to get the client
        // Actually the SDK might have a better way, let's check.
        // Standard way is often just via the REST API or specialized list tool.
        console.log("Listing models...");
        // Let's use the actual listModels method if available or a simple fetch
    } catch (e) {
        console.error(e);
    }
}

// Since I'm not sure about the exact JS SDK method for listing, 
// I'll use a simple CURL in the next step instead. 
