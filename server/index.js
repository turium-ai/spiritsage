const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const compression = require('compression');

const app = express();
app.use(compression()); // GZIP the responses to fix 34MB -> 13MB limit issues
app.use(cors());
app.use(express.json());

// Serve the compiled Vite application from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({
    server,
    path: '/live',
    perMessageDeflate: false // Safari iOS WebSocket compatibility
});

const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Serve the current inventory dynamically
app.get('/api/inventory', (req, res) => {
    res.json(inventory);
});

// Trigger a one-click refresh and enrichment
app.post('/api/refresh-inventory', (req, res) => {
    const { exec } = require('child_process');
    const scriptPath = path.join(__dirname, 'scripts/unified_refresh.py');

    console.log(`Starting Unified Refresh from ${__dirname}...`);
    exec(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Refresh error: ${error.message}`);
            return res.status(500).json({ error: 'Refresh failed', details: error.message });
        }

        // Reload inventory in-memory
        try {
            const inventoryPath = path.join(__dirname, 'data/inventory.json');
            const rawInventory = fs.readFileSync(inventoryPath, 'utf8');
            inventory = JSON.parse(rawInventory);
            console.log(`Backend inventory reloaded: ${inventory.length} items`);
            res.json({ message: 'Refresh successful', summary: stdout });
        } catch (reloadErr) {
            res.status(500).json({ error: 'Data update failed during reload', details: reloadErr.message });
        }
    });
});

// --- TikTok Trends Cache ---
let cachedTrends = null;
let lastTrendsFetch = 0;
const TRENDS_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

app.get('/api/trends', async (req, res) => {
    const now = Date.now();
    if (cachedTrends && (now - lastTrendsFetch < TRENDS_CACHE_DURATION_MS)) {
        return res.json({ trends: cachedTrends, lastFetch: lastTrendsFetch });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a mixology trend analyst. Search the web for the top 4 most popular trending alcoholic drinks or cocktails that have gone viral on TikTok in the LAST 30 DAYS ONLY (since ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}). 
        Focus on specific, highly-replicated drink recipes that are ACTIVE right now. Do not include older "classic" trends from previous years like the Parmesan Espresso Martini or the Negroni Sbagliato unless they have a massive new 2026 variation.
        Provide the data as a raw JSON array of objects. Do not use markdown blocks. Do not add any conversational text.
        Format MUST strictly be this JSON array:
        [
          {
            "trendName": "Drink Name",
            "description": "A very short description of the trend and its vibe (1-2 sentences max).",
            "keyIngredients": ["Ingredient 1", "Ingredient 2"],
            "trendingReason": "Why it's viral right now"
          }
        ]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.7
            }
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const trends = JSON.parse(cleanJson);

        cachedTrends = trends;
        lastTrendsFetch = now;
        res.json({ trends, lastFetch: now });
    } catch (err) {
        console.error('Failed to fetch trends from Gemini:', err);
        if (cachedTrends) {
            return res.json(cachedTrends); // Fallback to stale cache
        }
        res.status(500).json({ error: 'Failed to generate trends', details: err.message });
    }
});

// --- Dynamic AI Trend Blurbs ---
// Takes matched ingredients and generates snappy "Sage Recommendations" for why they fit the bundle
app.post('/api/generate-sage-blurbs', async (req, res) => {
    const { items, trendName } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Valid items array is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Construct the prompt mapping
        const itemListStr = items.map(i => `- ${i.product.name} (suggested for ingredient: ${i.ingredient})`).join('\n');
        
        const prompt = `You are "Spirit Sage", a brilliant Gen-Z mixologist AI. 
        A user is shopping for a TikTok trend bundle called "${trendName || 'this viral drink'}".
        Here are the specific bottles our semantic engine found in stock for each ingredient:
        ${itemListStr}
        
        Write exactly one snappy, fun, short sentence (max 12 words) for EACH bottle explaining why it's the perfect pick for this trend bundle.
        Return ONLY a raw JSON object where the keys are the exact product names, and the values are the 1-sentence blurbs. No markdown, no conversational text.
        Example: {"Casamigos Blanco": "The perfect bright, agave punch needed for this viral hit."}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.7 }
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const blurbs = JSON.parse(cleanJson);

        res.json(blurbs);
    } catch (err) {
        console.error('Failed to generate sage blurbs:', err);
        res.status(500).json({ error: 'Failed to generate blurbs', details: err.message });
    }
});

// --- Admin Logging & Monitoring ---
const logBuffer = [];
const MAX_LOGS = 200;

function logEvent(level, type, message, details = null) {
    const event = {
        timestamp: new Date().toISOString(),
        level, // INFO, WARN, ERROR
        type,  // GEMINI, SYSTEM, SEARCH, UI
        message,
        details
    };
    logBuffer.unshift(event);
    if (logBuffer.length > MAX_LOGS) {
        logBuffer.pop();
    }
    // Also mirror to console for standard log viewing
    const logMethod = level === 'ERROR' ? 'error' : (level === 'WARN' ? 'warn' : 'log');
    console[logMethod](`[${type}] ${message}`, details || '');
}

app.get('/api/admin/logs', (req, res) => {
    res.json(logBuffer);
});

app.post('/api/admin/log-event', (req, res) => {
    const { level, type, message, details } = req.body;
    logEvent(level || 'INFO', type || 'UI', message, details);
    res.json({ success: true });
});

// All other GET requests not handled before will return the React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Load Inventory Once at Startup ---
let inventory = [];
let inventorySummary = '';
try {
    const inventoryPath = path.join(__dirname, 'data/inventory.json');
    const rawInventory = fs.readFileSync(inventoryPath, 'utf8');
    inventory = JSON.parse(rawInventory);

    const categories = [...new Set(inventory.map(i => i.category))];
    inventorySummary = categories.map(cat => {
        const count = inventory.filter(i => i.category === cat).length;
        const samples = inventory.filter(i => i.category === cat).slice(0, 3).map(i => i.name).join(', ');
        return `- ${cat} (${count} items): e.g., ${samples}`;
    }).join('\n');
    logEvent('INFO', 'SYSTEM', `Inventory loaded: ${inventory.length} items across ${categories.length} categories`);
} catch (err) {
    logEvent('ERROR', 'SYSTEM', 'Could not read inventory.json', err.message);
}

// --- Levenshtein Fuzzy Search ---
function getLevenshteinDistance(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function isFuzzyMatch(term, text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    if (lowerText.includes(lowerTerm)) return true;
    if (lowerTerm.length <= 3) return false;
    const textWords = lowerText.split(/[\s\-]+/);
    for (const word of textWords) {
        if (Math.abs(word.length - lowerTerm.length) <= 2) {
            const distance = getLevenshteinDistance(lowerTerm, word);
            if (lowerTerm.length >= 4 && lowerTerm.length <= 7 && distance <= 1) return true;
            if (lowerTerm.length >= 8 && distance <= 2) return true;
        }
    }
    return false;
}

function extractPriceFilters(text) {
    let min = undefined;
    let max = undefined;
    let cleanText = text ? text.toString() : '';

    if (!cleanText) return { min, max, cleanQuery: cleanText };

    const rangeMatch = cleanText.match(/(?:between\s+)?\$?(\d+)\s*(?:-|to|and)\s*\$?(\d+)(?:\s*bucks|\s*dollars)?/i);
    if (rangeMatch) {
        min = parseInt(rangeMatch[1], 10);
        max = parseInt(rangeMatch[2], 10);
        cleanText = cleanText.replace(rangeMatch[0], '');
    } else {
        const underMatch = cleanText.match(/(?:under|below|<|less than|max(?:imum)?)\s*\$?(\d+)(?:\s*bucks|\s*dollars)?/i);
        if (underMatch) {
            max = parseInt(underMatch[1], 10);
            cleanText = cleanText.replace(underMatch[0], '');
        } else {
            const overMatch = cleanText.match(/(?:over|above|>|more than|min(?:imum)?)\s*\$?(\d+)(?:\s*bucks|\s*dollars)?/i);
            if (overMatch) {
                min = parseInt(overMatch[1], 10);
                cleanText = cleanText.replace(overMatch[0], '');
            } else {
                const exactMatch = cleanText.match(/(?:around|about|~|for)?\s*\$(\d+)(?:\s*bucks|\s*dollars)?/i);
                if (exactMatch) {
                    const val = parseInt(exactMatch[1], 10);
                    min = Math.max(0, val - 10);
                    max = val + 15;
                    cleanText = cleanText.replace(exactMatch[0], '');
                }
            }
        }
    }

    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    return { min, max, cleanQuery: cleanText };
}

function searchInventoryFuzzy(inventory, query) {
    const parsed = extractPriceFilters(query);
    const lowerQ = parsed.cleanQuery.toLowerCase();
    const terms = lowerQ.split(/\s+/).filter(t => t.length > 0);

    // Category intent detection: restrict category when query explicitly names one
    const spiritTypes = ['whiskey', 'whisky', 'bourbon', 'scotch', 'vodka', 'gin', 'rum', 'tequila', 'mezcal', 'cognac', 'brandy', 'liqueur', 'cordial'];
    const isSpiritQuery = spiritTypes.some(s => lowerQ.includes(s));
    const isBeerQuery = /\bbeer\b|\bale\b|\bipa\b|\blager\b|\bstout\b|\bporter\b|\bbrewed\b|\bpilsner\b|\bbud\b/.test(lowerQ);
    const isWineQuery = /\bwine\b|\bchardonnay\b|\bpinot\b|\bcabernet\b|\bmerlot\b|\brosé\b|\brose\b|\bchampagne\b|\bprosecco\b/.test(lowerQ);

    return inventory
        .filter(item => {
            if (parsed.min !== undefined && item.price < parsed.min) return false;
            if (parsed.max !== undefined && item.price > parsed.max) return false;

            // Enforce category intent to prevent cross-category pollution
            const cat = (item.category || '').toLowerCase();
            if (isSpiritQuery && !isBeerQuery && !isWineQuery) {
                // Spirit query: exclude beer and wine items
                if (cat.includes('beer') || cat.includes('wine')) return false;
            }
            if (isBeerQuery && !isSpiritQuery) {
                if (!cat.includes('beer')) return false;
            }
            if (isWineQuery && !isSpiritQuery) {
                if (!cat.includes('wine')) return false;
            }
            return true;
        })
        .map(item => {
            let score = 0;
            for (const term of terms) {
                if (item.name.toLowerCase().includes(term)) score += 60;
                if (item.category.toLowerCase().includes(term)) score += 40;

                if (isFuzzyMatch(term, item.name)) score += 50;
                if (isFuzzyMatch(term, item.category)) score += 30;
                if (isFuzzyMatch(term, item.style)) score += 25;
                if (item.flavorProfile && isFuzzyMatch(term, item.flavorProfile)) score += 20;
                if (item.tastingNotes && isFuzzyMatch(term, item.tastingNotes)) score += 15;
                if (item.description && isFuzzyMatch(term, item.description)) score += 10;
            }
            return { ...item, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
}

// --- Build System Prompt with Browsing Context ---
function buildSystemPrompt(browsingContext) {
    let contextSection = '';
    if (browsingContext) {
        const parts = [];
        if (browsingContext.category && browsingContext.category !== 'All') {
            parts.push(`The user is currently browsing the "${browsingContext.category}" category.`);
        }
        if (browsingContext.searchQuery) {
            parts.push(`They were just searching for "${browsingContext.searchQuery}".`);
        }
        if (browsingContext.priceRange) {
            parts.push(`They're looking at the ${browsingContext.priceRange} price tier.`);
        }
        if (parts.length > 0) {
            contextSection = `\nUSER'S CURRENT SESSION:\n${parts.join(' ')}\nUse this context to personalize your opening greeting and prioritize relevant suggestions.\n`;
        }
    }

    return `You are 'SpiritSage,' the Virtual Sommelier — a world-class Master Sommelier and Certified Cicerone with encyclopedic knowledge of wine, spirits, and craft beer. Your tone is sophisticated, warm, and slightly witty — like a trusted advisor at an upscale tasting room.

PERSONALITY:
- Greet guests warmly and introduce yourself briefly on first interaction.
- Be genuinely enthusiastic about great pairings and hidden gems.
- Use vivid, sensory language ("this bourbon opens with honeyed vanilla and closes with a whisper of charred oak").
- Keep responses concise (2-3 sentences max) — this is a live conversation, not a lecture.
- If you're unsure, say so honestly rather than guessing.

INVENTORY ACCESS (${inventory.length}+ items):
${inventorySummary}
${contextSection}
CRITICAL RULES:
1. ALWAYS use the 'searchInventory' tool before recommending any specific product. Never guess.
2. Only recommend items confirmed to exist via the search tool.
3. When you find an item, describe its flavor profile using the tasting notes provided.
4. Call 'showDrinkImage' with the 'image' path from the search results to display it.
5. When the user shows food on camera, identify the flavor profile (acidity, fat, spice, sweetness) and suggest a complementary pairing.

FOOD PAIRING EXPERTISE:
- Sweet → Higher sweetness in glass than on plate (Port, Dessert Wines)
- Spiced → Moderate alcohol, aromatic (Gewürztraminer, Wheat Beer)

ACTIVE CO-PILOT MODE:
You have "eyes" on the search bar. You will receive real-time updates in this format: 
[UI_STATE] {"query": "...", "resultCount": X, "topVisibleItems": [...], "isTyping": true/false}

Your Role as Co-Pilot:
1. "Mind Reader" Opener: If the user types a specific term (e.g. "Peaty Scotch"), don't wait for a question. Chirp in: "I see you're looking at the heavy hitters! Are you in the mood for something medicinal, or a smoother malt?"
2. "The Refiner": If resultCount > 10, offer to help narrow it down (e.g. "That's a big list of Tequilas! Is this for sipping neat or for margaritas? I can filter these for you.").
3. "Check the Back": If resultCount is 0, proactively offer a "hidden gem" alternative confirmable via searchInventory.
4. "Semantic Interpretation": If the query is vague (e.g. "rainy night"), interpret the intent and call searchInventory with suitable styles (e.g. Stout, Spiced Rum).
5. "Typing Awareness": If isTyping is true, keep your comments brief and wait for a pause before a larger recommendation.
6. "Immediate Synthesis": After calling searchInventory, immediately synthesize the top 2-3 matched items into a verbal recommendation. Do not wait for the user to speak.
`;
}

const activeSessions = new Map();

wss.on('connection', async (clientWs) => {
    console.log('Frontend client connected');
    let genaiSession = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set');
        clientWs.send(JSON.stringify({ type: 'error', message: 'API validation failed on server' }));
        clientWs.close();
        return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- WebSocket Heartbeat ---
    const pingInterval = setInterval(() => {
        if (clientWs.readyState === clientWs.OPEN) {
            clientWs.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);

    clientWs.on('pong', () => {
        // Heartbeat received
    });

    // --- Deferred Session: Wait for initSession with browsing context ---
    async function startGeminiSession(browsingContext) {
        try {
            const systemPrompt = buildSystemPrompt(browsingContext);
            logEvent('INFO', 'GEMINI', 'Starting Live session', { context: browsingContext });

            genaiSession = await ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-latest',
                config: {
                    responseModalities: ['AUDIO'],
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    realtimeInputConfig: {
                        automaticActivityDetection: {
                            startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                            silenceDurationMs: 500,
                            prefixPaddingMs: 200
                        }
                    },
                    tools: [{
                        functionDeclarations: [
                            {
                                name: 'searchInventory',
                                description: 'Search the item inventory for drinks matching a query, category, or style. Use this before recommending any product.',
                                parameters: {
                                    type: 'OBJECT',
                                    properties: {
                                        query: {
                                            type: 'STRING',
                                            description: 'Search term (e.g., brand name, style like "IPA", food pairing like "steak", or category like "Wine")'
                                        },
                                        minPrice: {
                                            type: 'NUMBER',
                                            description: 'Minimum price filter in dollars (e.g. 50 for $50+). Optional.'
                                        },
                                        maxPrice: {
                                            type: 'NUMBER',
                                            description: 'Maximum price filter in dollars (e.g. 100 for up to $100). Optional.'
                                        }
                                    },
                                    required: ['query']
                                }
                            },
                            {
                                name: 'showDrinkImage',
                                description: 'Show an image of the recommended drink on the user interface.',
                                parameters: {
                                    type: 'OBJECT',
                                    properties: {
                                        imageUrl: {
                                            type: 'STRING',
                                            description: 'The exact image path from the inventory data (e.g. /images/macallan.png)'
                                        }
                                    },
                                    required: ['imageUrl']
                                }
                            }
                        ]
                    }]
                },
                callbacks: {
                    onopen: () => {
                        console.log('Connected to Gemini Live API');
                        clientWs.send(JSON.stringify({ type: 'status', message: 'connected to gemini' }));
                    },
                    onmessage: (data) => {
                        // Handle tool calls
                        if (data.toolCall && data.toolCall.functionCalls) {
                            for (const call of data.toolCall.functionCalls) {
                                console.log('TOOL CALL:', call.name, call.args);

                                if (call.name === 'searchInventory') {
                                    const q = call.args.query;
                                    const minPrice = call.args.minPrice;
                                    const maxPrice = call.args.maxPrice;

                                    // Build a query string the frontend's extractPriceFilters can parse
                                    let searchQuery = q;
                                    if (minPrice !== undefined && maxPrice !== undefined) {
                                        searchQuery = `${q} $${minPrice}-$${maxPrice}`;
                                    } else if (minPrice !== undefined) {
                                        searchQuery = `${q} over $${minPrice}`;
                                    } else if (maxPrice !== undefined) {
                                        searchQuery = `${q} under $${maxPrice}`;
                                    }

                                    logEvent('INFO', 'SEARCH', `Inventory tool called: "${searchQuery}"`);
                                    const results = searchInventoryFuzzy(inventory, searchQuery);
                                    logEvent('INFO', 'SEARCH', `Tool found ${results.length} matches`);

                                    // Relay search results to the frontend UI for live grid update
                                    clientWs.send(JSON.stringify({
                                        type: 'searchResults',
                                        query: searchQuery,  // Include price range so frontend filter activates
                                        results: results.map(r => ({
                                            name: r.name,
                                            price: r.price,
                                            category: r.category,
                                            style: r.style,
                                            flavorProfile: r.flavorProfile,
                                            image: r.image
                                        }))
                                    }));

                                    try {
                                        genaiSession.sendToolResponse({
                                            functionResponses: [{
                                                id: call.id,
                                                name: "searchInventory",
                                                response: {
                                                    results: results.map(r => ({
                                                        name: r.name,
                                                        price: r.price,
                                                        category: r.category,
                                                        style: r.style,
                                                        flavorProfile: r.flavorProfile,
                                                        description: r.description,
                                                        image: r.image,
                                                        tastingNotes: r.tastingNotes
                                                    }))
                                                }
                                            }]
                                        });
                                    } catch (err) {
                                        console.error('Failed to send search toolResponse:', err);
                                    }
                                } else if (call.name === 'showDrinkImage') {
                                    console.log('Relaying UI Event: showDrinkImage', call.args);
                                    clientWs.send(JSON.stringify({
                                        type: 'uiEvent',
                                        event: 'showImage',
                                        imageUrl: call.args.imageUrl
                                    }));

                                    try {
                                        genaiSession.sendToolResponse({
                                            functionResponses: [{
                                                id: call.id,
                                                name: "showDrinkImage",
                                                response: { result: "image displayed successfully" }
                                            }]
                                        });
                                    } catch (err) {
                                        console.error('Failed to send toolResponse:', err);
                                    }
                                }
                            }
                        }

                        // Forward all messages downward, including `serverContent.interrupted` signals
                        if (clientWs.readyState === clientWs.OPEN) {
                            if (data.serverContent?.interrupted) {
                                console.log('Relaying Interruption Signal to Frontend...');
                            }
                            clientWs.send(JSON.stringify({ type: 'serverMessage', data }));
                        }
                    },
                    onerror: (err) => {
                        console.error('Gemini Live API Error:', err);
                        if (clientWs.readyState === clientWs.OPEN) {
                            clientWs.send(JSON.stringify({ type: 'error', message: 'Gemini API Error' }));
                        }
                    },
                    onclose: (event) => {
                        const reason = event?.reason || 'No reason provided';
                        const code = event?.code || 'No code';
                        logEvent('WARN', 'GEMINI', `Connection closed. Code: ${code}, Reason: ${reason}`);
                        
                        if (clientWs.readyState === clientWs.OPEN) {
                            clientWs.close(1000, 'Gemini connection closed');
                        }
                    }
                }
            });

            activeSessions.set(clientWs, genaiSession);

            // Send a silent audio frame to bypass the Native Audio modality filter
            // This is done AFTER connect returns to ensure genaiSession is defined.
            try {
                const silence = new Uint8Array(32000).fill(0);
                const base64Audio = Buffer.from(silence).toString('base64');
                genaiSession.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } });
                console.log('Sent silent audio setup frame');
            } catch (e) {
                console.error('Failed to send silent frame:', e);
            }

            // Auto-greeting with context awareness
            setTimeout(() => {
                if (genaiSession) {
                    let greeting = "Hello! Please introduce yourself as the SpiritSage Virtual Sommelier in one warm, sophisticated sentence.";
                    if (browsingContext?.searchQuery) {
                        greeting = `The user is already searching for "${browsingContext.searchQuery}". Greet them briefly and offer your expert take on that selection. One sentence.`;
                    } else if (browsingContext?.category && browsingContext.category !== 'All') {
                        greeting = `The user is browsing ${browsingContext.category}. Greet them and offer to guide them through our ${browsingContext.category} collection. One sentence.`;
                    }
                    genaiSession.sendClientContent({
                        turns: [{ role: 'user', parts: [{ text: greeting }] }]
                    });
                }
            }, 500);
        } catch (err) {
            console.error('Failed to connect to Gemini:', err);
            clientWs.send(JSON.stringify({ type: 'error', message: 'Failed to connect to Gemini Live API' }));
            clientWs.close();
        }
    }

    clientWs.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);

            // Handle session initialization with browsing context
            if (parsed.type === 'initSession') {
                if (!genaiSession) {
                    startGeminiSession(parsed.context || null);
                }
                return;
            }

            if (!genaiSession) return;

            if (parsed.type === 'realtimeInput') {
                const inputOpts = {};
                if (parsed.audio) {
                    if (Math.random() < 0.01) {
                        console.log(`Relaying buffered audio chunk. Length: ${parsed.audio.length}`);
                    }
                    inputOpts.audio = { mimeType: 'audio/pcm;rate=16000', data: parsed.audio };
                }
                if (parsed.video) {
                    // Reduce video frame frequency to 10% for better stability on the audio-native model
                    if (Math.random() < 0.1) {
                        if (Math.random() < 0.2) {
                            console.log(`Received video frame. Base64 length: ${parsed.video.length}`);
                        }
                        inputOpts.video = { mimeType: parsed.videoMimeType || 'image/jpeg', data: parsed.video };
                    }
                }
                if (Object.keys(inputOpts).length > 0) {
                    try {
                        genaiSession.sendRealtimeInput(inputOpts);
                    } catch (sendErr) {
                        console.error('Error sending media to Gemini:', sendErr);
                    }
                }
            } else if (parsed.type === 'clientContent') {
                genaiSession.sendClientContent({
                    turns: [{
                        role: 'user',
                        parts: parsed.parts
                    }]
                });
            } else if (parsed.type === 'interrupt') {
                // Barge-in: user spoke while Gemini was talking.
                // Send an empty client turn so Gemini knows the user's turn has started
                // and it should stop generating and go back to listening.
                console.log('Barge-in interrupt received. Notifying Gemini session.');
                try {
                    genaiSession.sendRealtimeInput({ audio: null }); // Signal end of model turn
                } catch (e) { /* ignore */ }
            }
        } catch (err) {
            console.error('Error handling frontend message:', err);
        }
    });

    clientWs.on('close', (code, reason) => {
        logEvent('INFO', 'UI', `Frontend client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
        clearInterval(pingInterval);
        activeSessions.delete(clientWs);
        if (genaiSession && genaiSession.conn) {
            genaiSession.conn.close();
        }
        genaiSession = null;
    });
});

server.listen(PORT, () => {
    console.log(`Backend Server listening on port ${PORT}`);
});
