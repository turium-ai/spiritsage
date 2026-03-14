import { useState, useRef, useCallback, useEffect } from 'react';

const audioWorkletCode = `
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferQueue = [];
    this.currentBuffer = null;
    this.currentBufferIndex = 0;

    this.port.onmessage = (e) => {
      if (e.data === 'clear') {
        this.bufferQueue = [];
        this.currentBuffer = null;
        this.currentBufferIndex = 0;
      } else {
        this.bufferQueue.push(e.data);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channelCount = output.length;
    const frameCount = output[0].length;

    for (let i = 0; i < frameCount; i++) {
        let sample = 0;

        while ((!this.currentBuffer || Math.floor(this.currentBufferIndex) >= this.currentBuffer.length) && this.bufferQueue.length > 0) {
            this.currentBuffer = this.bufferQueue.shift();
            this.currentBufferIndex = 0;
        }

        if (this.currentBuffer && Math.floor(this.currentBufferIndex) < this.currentBuffer.length) {
            const idx = Math.floor(this.currentBufferIndex);
            const nextIdx = Math.min(idx + 1, this.currentBuffer.length - 1);
            const frac = this.currentBufferIndex - idx;
            sample = this.currentBuffer[idx] * (1 - frac) + this.currentBuffer[nextIdx] * frac;
            this.currentBufferIndex += 0.5;
        }

        for (let c = 0; c < channelCount; c++) {
            output[c][i] = sample;
        }
    }

    return true;
  }
}
registerProcessor('pcm-player-processor', PCMPlayerProcessor);
`;

const getWsUrl = () => {
    if (typeof window === 'undefined') return 'ws://localhost:8081/live';
    const isLocal = window.location.hostname === 'localhost';
    const host = isLocal ? window.location.host : 'spiritsage-backend-447843351231.us-central1.run.app';
    const protocol = isLocal ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : 'wss:';
    return `${protocol}//${host}/live`;
};

export function useLiveAPI(url = getWsUrl()) {
    const [connected, setConnected] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState(null);
    const [activeImageUrl, setActiveImageUrl] = useState(null);

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioWorkletNodeRef = useRef(null);
    const isPlayingRef = useRef(false);
    const onSearchResultsRef = useRef(null);

    const setOnSearchResults = useCallback((callback) => {
        onSearchResultsRef.current = callback;
    }, []);

    const interruptPlayback = useCallback(() => {
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.port.postMessage('clear');
        }
        setPlaying(false);
        isPlayingRef.current = false;
        // Notify backend to signal Gemini to stop generating and accept new input
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
        }
    }, []);

    const initAudio = async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000
            });

            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }

            const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            await audioContextRef.current.audioWorklet.addModule(workletUrl);

            const node = new AudioWorkletNode(audioContextRef.current, 'pcm-player-processor');
            node.connect(audioContextRef.current.destination);
            audioWorkletNodeRef.current = node;
        }
    };

    const connect = useCallback(async (browsingContext) => {
        setError(null);
        setActiveImageUrl(null);
        try {
            await initAudio();
        } catch (err) {
            console.error('Failed to init audio context', err);
            setError('Audio context initialization failed.');
            return;
        }

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to backend proxy');
            setConnected(true);
            setError(null);

            // Send initSession with browsing context to defer Gemini session start
            ws.send(JSON.stringify({
                type: 'initSession',
                context: browsingContext || null
            }));
        };

        ws.onclose = (event) => {
            console.log(`Disconnected from backend proxy. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
            setConnected(false);
            setActiveImageUrl(null);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            console.log('WebSocket state on error:', ws.readyState);
            setError('WebSocket error occurred.');
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof Blob) return;

            const msg = JSON.parse(event.data);

            if (msg.type === 'serverMessage' && msg.data) {
                // Occasional log for downlink traffic
                if (Math.random() < 0.01) {
                    console.log('Received serverMessage from Gemini');
                }
                const serverContent = msg.data.serverContent;
                if (serverContent) {
                    if (serverContent.interrupted) {
                        if (audioWorkletNodeRef.current) {
                            audioWorkletNodeRef.current.port.postMessage('clear');
                        }
                        setPlaying(false);
                        isPlayingRef.current = false;
                    }

                    const parts = serverContent.modelTurn?.parts || [];
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                            try {
                                const base64 = part.inlineData.data;
                                const binaryStr = window.atob(base64);
                                const len = Math.floor(binaryStr.length / 2);
                                const float32 = new Float32Array(len);

                                for (let i = 0; i < len; i++) {
                                    const lower = binaryStr.charCodeAt(i * 2);
                                    const upper = binaryStr.charCodeAt(i * 2 + 1);
                                    let val = lower + (upper << 8);
                                    if (val >= 32768) val -= 65536;
                                    float32[i] = val / 32768.0;
                                }

                                if (audioWorkletNodeRef.current) {
                                    audioWorkletNodeRef.current.port.postMessage(float32);
                                    if (!isPlayingRef.current) {
                                        isPlayingRef.current = true;
                                        setPlaying(true);
                                    }
                                }
                            } catch (err) {
                                console.error('Audio chunk decoding error:', err);
                            }
                        }
                    }

                    if (serverContent.turnComplete) {
                        setPlaying(false);
                        isPlayingRef.current = false;
                    }
                }
            } else if (msg.type === 'error') {
                setError(msg.message);
            } else if (msg.type === 'uiEvent' && msg.event === 'showImage') {
                console.log('Received UI Event: showImage', msg.imageUrl);
                setActiveImageUrl(msg.imageUrl);
            } else if (msg.type === 'searchResults') {
                // Relay search results to the parent component for live UI updates
                console.log('Received search results for:', msg.query, '—', msg.results.length, 'items');
                if (onSearchResultsRef.current) {
                    onSearchResultsRef.current(msg.query, msg.results);
                }
            }
        };
    }, [url]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(e => console.error("Error closing AudioContext", e));
            audioContextRef.current = null;
        }
        audioWorkletNodeRef.current = null;
        setError(null);
    }, []);

    const sendAudio = useCallback((base64Audio) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'realtimeInput',
                audio: base64Audio
            }));
        }
    }, []);

    const sendVideo = useCallback((base64Video, mimeType = 'image/jpeg') => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'realtimeInput',
                video: base64Video,
                videoMimeType: mimeType
            }));
        }
    }, []);

    const sendClientContent = useCallback((text) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'clientContent',
                parts: [{ text }]
            }));
        }
    }, []);

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    return { connect, disconnect, connected, playing, error, sendAudio, sendVideo, sendClientContent, activeImageUrl, setOnSearchResults, interruptPlayback };
}
