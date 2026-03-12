import React from 'react';
import { X, ShoppingBag, Trash2, ChevronRight, AlertCircle, ShoppingCart } from 'lucide-react';

const CartDrawer = ({ isOpen, onClose, cartItems, onRemoveItem, onClearCart }) => {
    const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />
            
            {/* Sliding Drawer */}
            <div className={`drawer-container ${isOpen ? 'open' : ''}`}>
                
                {/* Header */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            background: 'var(--color-primary)', 
                            padding: '8px', 
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 15px var(--color-primary-glow)'
                        }}>
                            <ShoppingBag size={20} color="white" />
                        </div>
                        <div>
                            <h2 className="drawer-title" style={{ marginBottom: '2px' }}>Your Cellar Cart</h2>
                            <p className="drawer-desc" style={{ fontSize: '12px' }}>{cartItems.length} curated items ready for checkout</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="drawer-close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="drawer-content">
                    {cartItems.length === 0 ? (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '60%',
                            textAlign: 'center',
                            gap: '20px',
                            opacity: 0.6
                        }}>
                            <div style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                padding: '40px', 
                                borderRadius: '50%',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <ShoppingCart size={48} strokeWidth={1} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }}>Your cart is empty</h3>
                                <p style={{ fontSize: '14px', maxWidth: '240px' }}>Discover new trends or explore the cellar to add items to your collection.</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="btn-secondary"
                                style={{ padding: '10px 24px', fontSize: '14px' }}
                            >
                                Start Discovering
                            </button>
                        </div>
                    ) : (
                        <div className="drawer-items-list" style={{ padding: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 5px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</span>
                                <button 
                                    onClick={onClearCart}
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: '#ef4444', 
                                        fontSize: '12px', 
                                        fontWeight: 600, 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Trash2 size={12} /> Clear All
                                </button>
                            </div>

                            {cartItems.map((item, idx) => (
                                <div key={`${item.name}-${idx}`} className="drawer-item" style={{ marginBottom: '16px' }}>
                                    <div className="drawer-item-img-wrap" style={{ width: '60px', height: '60px' }}>
                                        <img src={item.image || 'https://images.unsplash.com/photo-1569488859134-24b2d490f23f?w=100&auto=format&fit=crop&q=80'} 
                                             alt={item.name} 
                                             className="drawer-item-img" />
                                    </div>
                                    <div className="drawer-item-info">
                                        <div className="drawer-item-header">
                                            <h4 className="drawer-item-name" style={{ fontSize: '15px' }}>{item.name}</h4>
                                            <span className="drawer-item-price" style={{ fontSize: '14px' }}>${item.price.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.brand || 'Premium Selection'}</span>
                                            <button 
                                                onClick={() => onRemoveItem(item.name)}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    color: '#666', 
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    transition: 'color 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                                onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="drawer-footer">
                        <div className="drawer-footer-line">
                            <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>${total.toFixed(2)}</span>
                        </div>
                        <div className="drawer-footer-line" style={{ marginTop: '4px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Shipping & Taxes</span>
                            <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>Calculated at checkout</span>
                        </div>
                        
                        <div style={{ 
                            padding: '20px', 
                            background: 'rgba(212,175,55,0.05)', 
                            borderRadius: '16px', 
                            border: '1px dashed rgba(212,175,55,0.2)',
                            margin: '20px 0',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <AlertCircle size={20} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: '12px', lineHeight: 1.4, color: 'rgba(255,255,255,0.8)' }}>
                                <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Sage Note:</span> Your selection includes premium bottles matched for high-trending recipes. Enjoy responsibly.
                            </p>
                        </div>
                        
                        <button className="drawer-checkout-btn" onClick={() => alert('Checkout flow simulated! Reality check coming soon...')}>
                            <span className="btn-left">
                                Proceed to Checkout
                                <ChevronRight size={18} />
                            </span>
                            <span className="drawer-checkout-price">
                                Total: ${total.toFixed(2)}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
