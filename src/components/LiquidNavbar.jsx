import React, { useState, useEffect, useRef } from 'react';
import { Wine, Sparkles, Search, Mic, MicOff, Video, VideoOff, Play, Square, Send, RefreshCw, ShoppingCart } from 'lucide-react';

const LiquidNavbar = ({ showControls, onSearch, searchQuery, onReset, sommelier, onRefresh, isRefreshing, cartItems = [], onToggleCart }) => {
    const [localQuery, setLocalQuery] = useState(searchQuery || '');
    const searchInputRef = useRef(null);
    const [showSommelierPanel, setShowSommelierPanel] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        if (showControls && searchInputRef.current) {
            setTimeout(() => { searchInputRef.current.focus(); }, 100);
        }
    }, [showControls]);

    useEffect(() => { setLocalQuery(searchQuery || ''); }, [searchQuery]);

    // Close panel on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setShowSommelierPanel(false);
            }
        };
        if (showSommelierPanel) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showSommelierPanel]);

    return (
        <nav className="nav-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 5%',
            height: '80px',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            zIndex: 1000
        }}>
            {/* Left Column */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <Wine size={32} color="var(--color-primary)" />
                    <span style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        letterSpacing: '-1px',
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                    }} onClick={() => window.location.reload()}>SpiritSage</span>
                </div>

                <div style={{
                    flex: '0 1 600px',
                    position: 'relative',
                    opacity: showControls ? 1 : 0,
                    pointerEvents: showControls ? 'auto' : 'none',
                    transition: 'opacity 0.3s ease',
                    minWidth: 0
                }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '20px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search the cellar for any brand, bottle, or style..."
                        value={localQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalQuery(val);
                            onSearch(val);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { onSearch(localQuery.trim()); }
                        }}
                        style={{
                            width: '100%',
                            minWidth: 0,
                            padding: '12px 20px 12px 50px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid',
                            borderColor: sommelier?.isThinking ? 'var(--color-primary)' : 'rgba(212, 175, 55, 0.4)',
                            borderRadius: '30px',
                            color: 'var(--text-main)',
                            boxShadow: sommelier?.isThinking
                                ? '0 0 20px rgba(212, 175, 55, 0.3), 0 0 5px rgba(212, 175, 55, 0.2)'
                                : '0 8px 32px rgba(0,0,0,0.3)',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            animation: sommelier?.isThinking ? 'geminiGlow 2s infinite ease-in-out' : 'none'
                        }}
                        onFocus={(e) => { if (!sommelier?.isThinking) e.target.style.borderColor = 'var(--color-primary)' }}
                        onBlur={(e) => { if (!sommelier?.isThinking) e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)' }}
                    />
                </div>
            </div>

            {/* Right Column: Gemini + Back + Cart */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexShrink: 0
            }}>
                {/* Virtual Sommelier */}
                <div style={{ pointerEvents: 'auto' }}>
                    {sommelier && !sommelier.connected && (
                        <button
                            onClick={sommelier.onToggle}
                            style={{
                                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                                border: '1px solid rgba(212,175,55,0.3)',
                                color: '#d4af37',
                                padding: '10px 18px',
                                borderRadius: '30px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '13px',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))' }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))' }}
                        >
                            <Sparkles size={16} /> <span className="hide-on-tablet">Connect to Gemini</span>
                        </button>
                    )}

                    {sommelier && sommelier.connected && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.05))',
                            border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: '30px',
                            padding: '6px 14px',
                            whiteSpace: 'nowrap'
                        }}>
                            <Sparkles size={14} color="#22c55e" />
                            <span className="hide-on-tablet" style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>Live</span>
                            <span className="hide-on-tablet" style={{ color: '#555', fontSize: '12px' }}>·</span>
                            <span className="hide-on-mobile" style={{ color: sommelier.playing ? '#ef4444' : '#86efac', fontSize: '12px', fontWeight: 500 }}>
                                {sommelier.playing ? 'Speaking' : 'Listening'}
                            </span>
                            {sommelier.playing && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{
                                            display: 'inline-block', width: '3px', borderRadius: '1px',
                                            backgroundColor: '#ef4444',
                                            animation: `navBarBounce 0.5s ${i * 0.12}s ease-in-out infinite alternate`
                                        }} />
                                    ))}
                                </span>
                            )}
                            <span className="hide-on-mobile" style={{ color: '#555', fontSize: '12px' }}>·</span>
                            <button onClick={sommelier.onToggleMic} title={sommelier.micEnabled ? 'Mute Mic' : 'Unmute Mic'}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                    color: sommelier.micEnabled ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center'
                                }}>
                                {sommelier.micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                            </button>
                            <button onClick={sommelier.onToggleCamera} title={sommelier.cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                    color: sommelier.cameraEnabled ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center'
                                }}>
                                {sommelier.cameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                            </button>
                            <span style={{ color: '#555', fontSize: '12px' }}>·</span>
                            <button onClick={sommelier.onToggle}
                                style={{
                                    background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer',
                                    padding: '3px 8px', borderRadius: '6px', color: '#ef4444', fontSize: '11px', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: '3px'
                                }}>
                                <Square size={9} /> End
                            </button>
                        </div>
                    )}
                </div>

                <div style={{
                    opacity: showControls ? 1 : 0,
                    pointerEvents: showControls ? 'auto' : 'none',
                    transition: 'opacity 0.3s ease'
                }}>
                    <button onClick={onReset}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            padding: '10px 20px',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'var(--transition-smooth)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'rgba(212,175,55,0.05)' }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'transparent' }}
                    >
                        &larr; <span className="hide-on-tablet" style={{ marginLeft: '4px' }}>Back to Homepage</span>
                    </button>
                </div>

                {/* Shopping Cart — Now at the Far Right */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}
                onClick={onToggleCart}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
                >
                    <div style={{ position: 'relative' }}>
                        <ShoppingCart size={20} color={cartItems.length > 0 ? 'var(--color-accent)' : '#888'} />
                        {cartItems.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '10px',
                                border: '2px solid #111',
                                animation: 'bounce 0.5s ease-out'
                            }}>
                                {cartItems.length}
                            </span>
                        )}
                    </div>
                    <div className="hide-on-tablet" style={{ 
                        flexDirection: 'column', 
                        alignItems: 'flex-start',
                        lineHeight: 1.1
                    }}>
                        <span style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Cart</span>
                        <span style={{ fontSize: '14px', color: 'white', fontWeight: 700 }}>
                            ${cartItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes navBarBounce {
                    from { height: 6px; } to { height: 14px; }
                }
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
                }
                @keyframes geminiGlow {
                    0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2), 0 8px 32px rgba(0,0,0,0.3); }
                    50% { box-shadow: 0 0 25px rgba(212, 175, 55, 0.5), 0 8px 32px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.2), 0 8px 32px rgba(0,0,0,0.3); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </nav>
    );
};

export default LiquidNavbar;
