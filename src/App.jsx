import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import LiquidNavbar from './components/LiquidNavbar'
import Onboarding from './components/Onboarding'
import Recommendations from './components/Recommendations'
import TrendingSection from './components/TrendingSection'
import TrendBundleDrawer from './components/TrendBundleDrawer'
import CartDrawer from './components/CartDrawer'
import AdminDashboard from './components/AdminDashboard'
import { useLiveAPI } from './hooks/useLiveAPI'

const DEFAULT_FILTERS = { category: 'All', style: 'All' };

function App() {
  const [preferences, setPreferences] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [selectedTrendBundle, setSelectedTrendBundle] = useState(null)
  const [inventory, setInventory] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const getApiUrl = (endpoint) => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocal ? '' : 'https://spiritsage-backend-447843351231.us-central1.run.app';
    return `${baseUrl}${endpoint}`;
  };

  // Fetch inventory on mount
  useEffect(() => {
    fetch(getApiUrl('/api/inventory'))
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(err => console.error('Failed to fetch inventory:', err))
  }, [])

  const handleRefreshInventory = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(getApiUrl('/api/refresh-inventory'), { method: 'POST' })
      const result = await res.json()
      if (result.message === 'Refresh successful') {
        // Re-fetch the updated inventory
        const invRes = await fetch(getApiUrl('/api/inventory'))
        const invData = await invRes.json()
        setInventory(invData)
        alert('Inventory refreshed and enriched successfully!')
      } else {
        alert('Refresh failed: ' + result.error)
      }
    } catch (err) {
      console.error('Refresh error:', err)
      alert('Refresh error: ' + err.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Sommelier state
  const { connect, disconnect, connected, playing, error: socketError, sendAudio, sendVideo, sendClientContent, setOnSearchResults } = useLiveAPI()
  const [micEnabled, setMicEnabled] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [resultMetadata, setResultMetadata] = useState({ count: 0, topItems: [], query: '' })
  const videoRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const videoIntervalRef = useRef(null)
  const micEnabledRef = useRef(false)
  const cameraEnabledRef = useRef(false)
  const connectedRef = useRef(false)
  const audioBufferRef = useRef([])
  const skipNextUiSync = useRef(false)

  useEffect(() => { micEnabledRef.current = micEnabled }, [micEnabled])
  useEffect(() => { cameraEnabledRef.current = cameraEnabled }, [cameraEnabled])
  useEffect(() => { connectedRef.current = connected }, [connected])

  useEffect(() => {
    if (preferences || searchQuery) setIsBrowsing(true)
  }, [preferences, searchQuery])

  const browsingContext = useMemo(() => ({
    category: preferences?.category || 'All',
    searchQuery: searchQuery || null,
    priceRange: preferences?.priceRange || null
  }), [preferences, searchQuery])

  // Voice search from Gemini -> update search query so the full local engine runs
  useEffect(() => {
    if (setOnSearchResults) {
      setOnSearchResults((query) => {
        skipNextUiSync.current = true
        setSearchQuery(query)
        setIsBrowsing(true)
        setTimeout(() => {
          const el = document.querySelector('.recommendations-section')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      })
    }
  }, [setOnSearchResults])

  const recorderWorkletCode = `
class AudioRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) { if (inputs[0].length > 0) this.port.postMessage(inputs[0][0]); return true; }
}
registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
  `

  const startMedia = useCallback(async () => {
    try {
      // Camera (hidden)
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        mediaStreamRef.current = vs
        if (videoRef.current) { videoRef.current.srcObject = vs; videoRef.current.play().catch(() => { }) }
        setCameraEnabled(true); cameraEnabledRef.current = true
      } catch (e) { console.warn('No camera', e) }

      // Mic
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const pref = devices.filter(d => d.kind === 'audioinput').find(d =>
          d.label.toLowerCase().includes('jabra') || d.label.toLowerCase().includes('usb') || d.label.toLowerCase().includes('headset')
        )
        const ac = { sampleRate: 16000, channelCount: 1, echoCancellation: true }
        if (pref) ac.deviceId = { exact: pref.deviceId }
        const as = await navigator.mediaDevices.getUserMedia({ audio: ac })
        if (mediaStreamRef.current) mediaStreamRef.current.addTrack(as.getAudioTracks()[0])
        else mediaStreamRef.current = as

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
          if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume()
          const src = audioContextRef.current.createMediaStreamSource(as)
          const blob = new Blob([recorderWorkletCode], { type: 'application/javascript' })
          await audioContextRef.current.audioWorklet.addModule(URL.createObjectURL(blob))
          const node = new AudioWorkletNode(audioContextRef.current, 'audio-recorder-processor')
          node.port.onmessage = (e) => {
            if (micEnabledRef.current && connectedRef.current) {
              const samples = e.data;
              for (let i = 0; i < samples.length; i++) {
                audioBufferRef.current.push(samples[i]);
              }

              // Buffer 2048 samples (~128ms at 16kHz) before sending to reduce WebSocket overhead
              if (audioBufferRef.current.length >= 2048) {
                const bufferToSend = new Float32Array(audioBufferRef.current);
                audioBufferRef.current = [];

                const pcm = new Int16Array(bufferToSend.length)
                for (let i = 0; i < bufferToSend.length; i++) {
                  pcm[i] = Math.max(-32768, Math.min(32767, bufferToSend[i] * 32768))
                }
                const bytes = new Uint8Array(pcm.buffer)
                let bin = ''
                for (let i = 0; i < bytes.length; i += 0x8000) {
                  bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
                }
                sendAudio(window.btoa(bin))
              }
            }
          }
          src.connect(node); node.connect(audioContextRef.current.destination)
        }
        setMicEnabled(true)
      } catch (e) { console.warn('No mic', e) }

      // Video frames
      videoIntervalRef.current = setInterval(() => {
        if (cameraEnabledRef.current && connectedRef.current && videoRef.current) {
          const c = document.createElement('canvas')
          c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight
          if (c.width > 0 && c.height > 0) {
            c.getContext('2d').drawImage(videoRef.current, 0, 0)
            sendVideo(c.toDataURL('image/jpeg', 0.5).split(',')[1], 'image/jpeg')
          }
        }
      }, 1000)
    } catch (err) { console.error('Media error', err) }
  }, [sendAudio, sendVideo])

  const stopMedia = useCallback(() => {
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null }
    if (videoIntervalRef.current) { clearInterval(videoIntervalRef.current); videoIntervalRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setMicEnabled(false); setCameraEnabled(false)
    micEnabledRef.current = false; cameraEnabledRef.current = false; connectedRef.current = false
    setIsTyping(false)
  }, [])

  const handleToggleConnection = useCallback(() => {
    if (connected) { stopMedia(); disconnect() }
    else { connect(browsingContext); connectedRef.current = true; startMedia() }
  }, [connected, browsingContext, connect, disconnect, startMedia, stopMedia])

  // When the user types manually, always clear Gemini results so the full search engine runs
  const handleManualSearch = useCallback((query) => {
    setSearchQuery(query)
    setGeminiResults(null)
  }, [])

  const handleToggleMic = useCallback(() => setMicEnabled(v => !v), [])
  const handleToggleCamera = useCallback(() => {
    if (mediaStreamRef.current) { const vt = mediaStreamRef.current.getVideoTracks()[0]; if (vt) vt.enabled = !cameraEnabled }
    setCameraEnabled(v => !v)
  }, [cameraEnabled])

  const handleTextSubmit = useCallback((e) => {
    e.preventDefault()
    if (inputText.trim() && connected) { sendClientContent(inputText); setInputText('') }
  }, [inputText, connected, sendClientContent])

  // Sommelier prop bundle for the navbar
  const sommelierProps = useMemo(() => ({
    connected, playing,
    micEnabled, cameraEnabled,
    inputText,
    onToggle: handleToggleConnection,
    onToggleMic: handleToggleMic,
    onToggleCamera: handleToggleCamera,
    onTextSubmit: handleTextSubmit,
    onInputChange: setInputText,
    error: socketError,
    isThinking: connected && (isTyping || playing)
  }), [connected, playing, micEnabled, cameraEnabled, inputText, handleToggleConnection, handleToggleMic, handleToggleCamera, handleTextSubmit, socketError, isTyping])

  useEffect(() => { return () => { stopMedia(); disconnect() } }, [stopMedia, disconnect])

  // Typing detection logic
  const typingTimerRef = useRef(null)

  useEffect(() => {
    if (searchQuery) {
      if (!isTyping) setIsTyping(true)

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1500) // User has stopped typing for 1.5 seconds
    } else {
      setIsTyping(false)
    }
  }, [searchQuery])

  // Context Synchronization: Tell Gemini when the user changes view/search during a session
  const lastSyncContext = useRef(null)
  const lastUIStateSync = useRef(null)

  // Enriched UI State Sync (The "Context Sandwich")
  useEffect(() => {
    if (connected && !isTyping) {
      if (skipNextUiSync.current) {
        console.log('Skipping UI sync because it was triggered by an AI tool call.');
        skipNextUiSync.current = false;
        return;
      }
      // Only send the UI state when the user is done typing to avoid WebSocket flooding
      const uiState = {
        type: "UI_STATE_UPDATE",
        query: searchQuery,
        resultCount: resultMetadata.count,
        topVisibleItems: resultMetadata.topItems,
        isTyping: false
      };

      const stateStr = JSON.stringify(uiState);
      if (stateStr !== lastUIStateSync.current) {
        lastUIStateSync.current = stateStr;
        sendClientContent(`[UI_STATE] ${stateStr}`);
      }
    } else if (connected && isTyping) {
      // Don't send isTyping: true if Gemini itself triggered the search — it would cause a 1.5s wait
      if (skipNextUiSync.current) return;
      const typingState = JSON.stringify({ type: "UI_STATE_UPDATE", isTyping: true });
      if (typingState !== lastUIStateSync.current) {
        lastUIStateSync.current = typingState;
        sendClientContent(`[UI_STATE] ${typingState}`);
      }
    }
  }, [connected, isTyping, resultMetadata, sendClientContent, searchQuery]);

  useEffect(() => {
    if (connected && browsingContext) {
      const current = JSON.stringify(browsingContext)
      if (current !== lastSyncContext.current) {
        lastSyncContext.current = current
        const parts = []
        if (browsingContext.category && browsingContext.category !== 'All') {
          parts.push(`User is now browsing the "${browsingContext.category}" category.`)
        }
        if (browsingContext.searchQuery) {
          parts.push(`They are now searching for "${browsingContext.searchQuery}".`)
        }
        if (browsingContext.priceRange) {
          parts.push(`They're looking at the ${browsingContext.priceRange} price tier.`)
        }

        if (parts.length > 0) {
          sendClientContent(`[SESSION CONTEXT UPDATE] ${parts.join(' ')} Keep this in mind for the next part of our conversation.`);
        }
      }
    } else {
      lastSyncContext.current = null
    }
  }, [connected, browsingContext, sendClientContent])

  if (window.location.pathname === '/admin') {
    return <AdminDashboard />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <LiquidNavbar
        showControls={isBrowsing}
        onSearch={handleManualSearch}
        searchQuery={searchQuery}
        onReset={() => {
          setPreferences(null); setSearchQuery(''); setIsBrowsing(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        sommelier={sommelierProps}
        onRefresh={handleRefreshInventory}
        isRefreshing={isRefreshing}
        cartItems={cartItems}
        onToggleCart={() => setIsCartOpen(!isCartOpen)}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
        {!isBrowsing ? (
          <>
            <TrendingSection 
               onSelectTrend={setSelectedTrendBundle} 
            />
            <Onboarding
              onComplete={(results) => setPreferences(results)}
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
            />
          </>
        ) : (
          <div className="recommendations-section">
            <Recommendations
              filters={preferences || DEFAULT_FILTERS}
              searchQuery={searchQuery}
              onResultsChange={setResultMetadata}
              inventory={inventory}
            />
          </div>
        )}
      </main>

      {/* Hidden video element for camera capture */}
      <video ref={videoRef} autoPlay playsInline muted
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Background ambient glows */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
        zIndex: -1, filter: 'blur(100px)', opacity: 0.3
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-5%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)',
        zIndex: -1, filter: 'blur(100px)', opacity: 0.2
      }} />

      <TrendBundleDrawer 
        trend={selectedTrendBundle}
        isOpen={!!selectedTrendBundle}
        onClose={() => setSelectedTrendBundle(null)}
        inventory={inventory}
        onAddToCart={(items) => setCartItems(prev => [...prev, ...items])}
      />

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={(productName) => setCartItems(prev => prev.filter(item => item.name !== productName))}
        onClearCart={() => setCartItems([])}
      />
    </div>
  )
}

export default App
