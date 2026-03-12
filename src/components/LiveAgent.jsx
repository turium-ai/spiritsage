import React, { useState, useEffect, useRef } from 'react';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { Mic, MicOff, Video, VideoOff, Play, Square, Send, Crosshair, X, Wine } from 'lucide-react';

export default function LiveAgent({ browsingContext, onVoiceSearch }) {
    const { connect, disconnect, connected, playing, error: socketError, sendAudio, sendVideo, sendClientContent, activeImageUrl, setOnSearchResults, interruptPlayback } = useLiveAPI();

    const [isOpen, setIsOpen] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [inputText, setInputText] = useState('');
    const [showAimingGuide, setShowAimingGuide] = useState(false);
    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioWorkletNodeRef = useRef(null);
    const videoIntervalRef = useRef(null);
    const micEnabledRef = useRef(false);
    const cameraEnabledRef = useRef(false);
    const connectedRef = useRef(false);
    const [sessionKey, setSessionKey] = useState(0);

    useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
    useEffect(() => { cameraEnabledRef.current = cameraEnabled; }, [cameraEnabled]);
    useEffect(() => { connectedRef.current = connected; }, [connected]);

    useEffect(() => {
        if (setOnSearchResults && onVoiceSearch) {
            setOnSearchResults((query) => { onVoiceSearch(query); });
        }
    }, [setOnSearchResults, onVoiceSearch]);

    const recorderWorkletCode = `
class AudioRecorderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) { 
      const samples = input[0];
      this.port.postMessage({ type: 'audio', samples });
      
      // Local VAD: Calculate RMS energy to detect speech
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }
      const rms = Math.sqrt(sum / samples.length);
      
      // If RMS exceeds threshold (0.05 is a typical "voice" floor), signal an interruption
      if (rms > 0.05) {
        this.port.postMessage({ type: 'speech_detected' });
      }
    }
    return true;
  }
}
registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
    `;

    useEffect(() => { return () => { stopMedia(); disconnect(); }; }, [disconnect]);

    const startMedia = async () => {
        setLocalError(null);
        try {
            // Camera (hidden — sends frames to Gemini but no visible preview needed)
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                mediaStreamRef.current = videoStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = videoStream;
                    videoRef.current.play().catch(() => { });
                }
                setCameraEnabled(true);
                cameraEnabledRef.current = true;
            } catch (vidErr) { console.warn('Camera not available', vidErr); }

            // Microphone
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
                const preferredDevice = audioInputDevices.find(d =>
                    d.label.toLowerCase().includes('jabra') || d.label.toLowerCase().includes('usb') || d.label.toLowerCase().includes('headset')
                );
                const audioConstraints = { sampleRate: 16000, channelCount: 1, echoCancellation: true };
                if (preferredDevice) audioConstraints.deviceId = { exact: preferredDevice.deviceId };

                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.addTrack(audioStream.getAudioTracks()[0]);
                } else {
                    mediaStreamRef.current = audioStream;
                }

                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();

                    const source = audioContextRef.current.createMediaStreamSource(audioStream);
                    const blob = new Blob([recorderWorkletCode], { type: 'application/javascript' });
                    await audioContextRef.current.audioWorklet.addModule(URL.createObjectURL(blob));

                    const node = new AudioWorkletNode(audioContextRef.current, 'audio-recorder-processor');
                    node.port.onmessage = (e) => {
                        const { type, samples } = e.data;
                        
                        if (type === 'speech_detected' && playing) {
                            // Instant local barge-in: Kill audio playback immediately when user speaks
                            interruptPlayback();
                        }

                        if (type === 'audio' && micEnabledRef.current && connectedRef.current) {
                            const pcm16 = new Int16Array(samples.length);
                            for (let i = 0; i < samples.length; i++) pcm16[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
                            const bytes = new Uint8Array(pcm16.buffer);
                            let binary = '';
                            for (let i = 0; i < bytes.length; i += 0x8000)
                                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
                            sendAudio(window.btoa(binary));
                        }
                    };
                    source.connect(node);
                    node.connect(audioContextRef.current.destination);
                    audioWorkletNodeRef.current = node;
                }
                setMicEnabled(true);
            } catch (audErr) { console.warn('Microphone not available', audErr); }

            // Video frame sending
            videoIntervalRef.current = setInterval(() => {
                if (cameraEnabledRef.current && connectedRef.current && videoRef.current) {
                    const canvas = document.createElement('canvas');
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    if (canvas.width > 0 && canvas.height > 0) {
                        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
                        sendVideo(canvas.toDataURL('image/jpeg', 0.5).split(',')[1], 'image/jpeg');
                    }
                }
            }, 1000);
        } catch (err) { setLocalError(err.message); }
    };

    const stopMedia = () => {
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
        audioWorkletNodeRef.current = null;
        if (videoIntervalRef.current) { clearInterval(videoIntervalRef.current); videoIntervalRef.current = null; }
        if (videoRef.current) videoRef.current.srcObject = null;
        setMicEnabled(false); setCameraEnabled(false); setShowAimingGuide(false);
        micEnabledRef.current = false; cameraEnabledRef.current = false; connectedRef.current = false;
    };

    const toggleConnection = () => {
        if (connected) { stopMedia(); disconnect(); }
        else { setLocalError(null); setSessionKey(prev => prev + 1); connect(browsingContext || null); connectedRef.current = true; startMedia(); }
    };

    const handleClose = () => { if (connected) { stopMedia(); disconnect(); } setIsOpen(false); };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (inputText.trim() && connected) { sendClientContent(inputText); setInputText(''); }
    };

    // Hidden video element for camera capture (never shown)
    const hiddenVideo = (
        <video key={`video-${sessionKey}`} ref={videoRef}
            autoPlay playsInline muted
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
    );

    // ========== FAB BUTTON (Collapsed) ==========
    if (!isOpen) {
        return (
            <>
                {hiddenVideo}
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed', bottom: '24px', right: '24px',
                        width: '64px', height: '64px', borderRadius: '50%',
                        border: 'none', cursor: 'pointer',
                        background: connected ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #d4af37, #b8942e)',
                        color: connected ? '#fff' : '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: connected
                            ? '0 6px 24px rgba(34, 197, 94, 0.5), 0 2px 8px rgba(0,0,0,0.3)'
                            : '0 6px 24px rgba(212, 175, 55, 0.4), 0 2px 8px rgba(0,0,0,0.3)',
                        zIndex: 9999, transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    title="Virtual Sommelier"
                >
                    {playing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: '4px', borderRadius: '2px', backgroundColor: '#fff',
                                    animation: `barBounce 0.6s ${i * 0.15}s ease-in-out infinite alternate`
                                }} />
                            ))}
                        </div>
                    ) : <Wine size={28} />}
                </button>

                {/* Tooltip */}
                {!connected && (
                    <div style={{
                        position: 'fixed', bottom: '32px', right: '96px',
                        background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(10px)',
                        color: '#d4af37', padding: '8px 14px', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, border: '1px solid rgba(212,175,55,0.2)',
                        zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                    }}>
                        🍷 Gemini
                    </div>
                )}

                {/* Active session mini-indicator */}
                {connected && (
                    <div style={{
                        position: 'fixed', bottom: '92px', right: '20px',
                        background: 'rgba(20,20,30,0.92)', backdropFilter: 'blur(12px)',
                        padding: '6px 12px', borderRadius: '12px',
                        border: '1px solid rgba(34,197,94,0.2)',
                        zIndex: 9999, pointerEvents: 'none',
                        fontSize: '11px', color: '#22c55e', fontWeight: 600,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                        {playing ? 'Speaking...' : 'Listening'}
                    </div>
                )}

                <style>{`
                    @keyframes barBounce {
                        from { height: 8px; } to { height: 20px; }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
                    }
                `}</style>
            </>
        );
    }

    // ========== EXPANDED PANEL (only shows when FAB is clicked) ==========
    return (
        <div style={{
            position: 'fixed', bottom: '24px', left: '50%',
            transform: 'translateX(-65%)',
            width: '320px', maxHeight: 'calc(100vh - 100px)',
            borderRadius: '16px',
            background: 'rgba(20, 20, 30, 0.95)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            boxShadow: '0 16px 64px rgba(0,0,0,0.6), 0 0 30px rgba(212, 175, 55, 0.08)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', animation: 'slideUp 0.25s ease-out'
        }}>
            {hiddenVideo}

            {/* Compact Header */}
            <div style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(212, 175, 55, 0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wine size={18} color="#d4af37" />
                    <span style={{ color: '#d4af37', fontSize: '14px', fontWeight: 600 }}>Gemini</span>
                    {connected && (
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            backgroundColor: playing ? '#ef4444' : '#22c55e',
                            animation: playing ? 'pulse 1s infinite' : 'none'
                        }} />
                    )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {connected && (
                        <>
                            <button onClick={() => setMicEnabled(!micEnabled)} style={{
                                width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                                background: micEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: micEnabled ? '#22c55e' : '#ef4444',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
                            </button>
                            <button onClick={() => {
                                if (mediaStreamRef.current) { const vt = mediaStreamRef.current.getVideoTracks()[0]; if (vt) vt.enabled = !cameraEnabled; }
                                setCameraEnabled(!cameraEnabled);
                            }} style={{
                                width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                                background: cameraEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: cameraEnabled ? '#22c55e' : '#ef4444',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {cameraEnabled ? <Video size={13} /> : <VideoOff size={13} />}
                            </button>
                        </>
                    )}
                    <button onClick={toggleConnection} style={{
                        padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        fontSize: '11px', fontWeight: 600,
                        background: connected ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #d4af37, #b8942e)',
                        color: connected ? '#ef4444' : '#000',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        {connected ? <><Square size={10} /> Stop</> : <><Play size={10} /> Start</>}
                    </button>
                    <button onClick={handleClose} style={{
                        width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                        background: 'rgba(255,255,255,0.06)', color: '#666', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
                {!connected ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: '36px', marginBottom: '10px' }}>🍷</div>
                        <p style={{ color: '#999', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                            Point your camera at food & ask for drink pairing suggestions. Products appear live in the grid behind.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Speaking indicator */}
                        {playing && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                borderRadius: '8px', background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.15)', marginBottom: '8px'
                            }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
                                <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>Sommelier is speaking...</span>
                            </div>
                        )}

                        {/* Status */}
                        <div style={{
                            padding: '8px 12px', borderRadius: '8px',
                            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)',
                            fontSize: '11px', color: '#999', fontFamily: 'monospace'
                        }}>
                            🟢 Connected &nbsp;|&nbsp; 🎙️ {micEnabled ? 'On' : 'Off'} &nbsp;|&nbsp; 📷 {cameraEnabled ? 'On' : 'Off'}
                        </div>

                        {/* Recommended Drink */}
                        {activeImageUrl && (
                            <div style={{
                                marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '12px', borderRadius: '10px',
                                background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)'
                            }}>
                                <span style={{ color: '#d4af37', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Recommended 🍷</span>
                                <img src={activeImageUrl} alt="Recommended" style={{ maxHeight: '120px', objectFit: 'contain', borderRadius: '6px' }} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Text Input */}
            {connected && (
                <form onSubmit={handleTextSubmit} style={{
                    padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.15)'
                }}>
                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask something..."
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: '6px', outline: 'none',
                            fontSize: '12px', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)', color: '#eee'
                        }}
                    />
                    <button type="submit" style={{
                        padding: '0 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #d4af37, #b8942e)', color: '#000',
                        display: 'flex', alignItems: 'center'
                    }}>
                        <Send size={13} />
                    </button>
                </form>
            )}

            {(localError || socketError) && (
                <div style={{ padding: '6px 12px', fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                    {localError || socketError}
                </div>
            )}

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-65%) translateY(12px); }
                    to { opacity: 1; transform: translateX(-65%) translateY(0); }
                }
            `}</style>
        </div>
    );
}
