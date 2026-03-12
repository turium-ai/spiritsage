import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, GlassWater, Zap, Droplets, Utensils, Martini, Plus, Check } from 'lucide-react';

const ProductModal = ({ item, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('tasting');

    if (!isOpen || !item) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
        }} onClick={onClose}>
            <div className="glass animate-fade-in responsive-modal-grid" style={{
                maxWidth: '1000px',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                maxHeight: '90vh'
            }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    zIndex: 10,
                    cursor: 'pointer'
                }}>
                    <X size={24} />
                </button>

                <div style={{ height: '100%', minHeight: '500px', background: 'linear-gradient(135deg, rgba(20,20,30,0.95), rgba(30,30,45,0.95))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                    <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }} />
                </div>

                <div style={{ padding: '50px', display: 'flex', flexDirection: 'column', gap: '30px', overflowY: 'auto' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px', fontWeight: 700 }}>
                                {item.liquorType || item.category} • {item.style}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: item.inventoryCount < 5 ? '#ff4444' : '#44ff44',
                                    boxShadow: `0 0 10px ${item.inventoryCount < 5 ? '#ff4444' : '#44ff44'}`
                                }} />
                                {item.stock < 5 ? 'Limited Stock' : 'In Stock'}
                            </div>
                        </div>
                        <h2 style={{ fontSize: '42px', marginTop: '10px' }}>{item.name}</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '30px', borderBottom: '1px solid var(--glass-border)' }}>
                        {['tasting', 'details'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
                                    padding: '10px 0',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1 }}>
                        {activeTab === 'tasting' && (
                            <div className="animate-fade-in">
                                <p style={{ fontSize: '18px', lineHeight: 1.8, color: 'var(--text-muted)', marginBottom: '30px', fontStyle: 'italic' }}>
                                    "{item.description || item.tastingNotes}"
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                    <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                        <GlassWater size={20} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Style</div>
                                        <div style={{ fontWeight: 600 }}>{item.style}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                        <Zap size={20} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Price</div>
                                        <div style={{ fontWeight: 600 }}>${item.price}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                        <Droplets size={20} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Size</div>
                                        <div style={{ fontWeight: 600 }}>{item.size}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                                    <Utensils size={20} color="var(--color-primary)" /> Inventory Details
                                </h3>
                                <div className="glass" style={{ padding: '20px', fontSize: '14px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div><strong>Category:</strong> {item.category}</div>
                                    <div><strong>Name:</strong> {item.name}</div>
                                    <div><strong>Format:</strong> {item.size}</div>
                                    <div><strong>Stock Available:</strong> {item.stock} units</div>
                                    <div><strong>Pricing:</strong> Premium Tier</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '20px' }}>
                        <button className="btn-secondary" style={{ flex: 1 }}>Check Localization</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProductModal;
