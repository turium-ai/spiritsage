import React from 'react';
import { X, Trash2, Package } from 'lucide-react';

const DigitalCellar = ({ items, isOpen, onClose, onRemove }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: isOpen ? 0 : '-100%',
            width: '100%',
            maxWidth: '400px',
            height: '100%',
            background: 'var(--color-bg)',
            borderLeft: '1px solid var(--glass-border)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            zIndex: 1100,
            transition: '0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                padding: '30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--glass-border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package color="var(--color-primary)" />
                    <h2 style={{ fontSize: '24px' }}>Digital Cellar</h2>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-muted)' }}>
                        <p>Your cellar is empty.</p>
                        <p style={{ fontSize: '14px', marginTop: '10px' }}>Save your favorite recommendations here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {items.map(item => (
                            <div key={item.id} className="glass" style={{
                                padding: '15px',
                                display: 'flex',
                                gap: '15px',
                                alignItems: 'center'
                            }}>
                                <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-primary)', textTransform: 'uppercase' }}>{item.category}</div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {item.price ? `$${item.price}` : 'Price on request'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemove(item.id)}
                                    style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '10px' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ padding: '30px', borderTop: '1px solid var(--glass-border)' }}>
                <button className="btn-primary" style={{ width: '100%' }}>Inquire Selection</button>
            </div>
        </div>
    );
};

export default DigitalCellar;
