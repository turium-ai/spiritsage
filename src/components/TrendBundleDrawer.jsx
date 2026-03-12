import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import { semanticEngine } from '../utils/SemanticSearchEngine';

const TrendBundleDrawer = ({ trend, isOpen, onClose, inventory, onAddToCart }) => {
    const [bundleItems, setBundleItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sageBlurbs, setSageBlurbs] = useState({});
    const [isAdded, setIsAdded] = useState(false);

    useEffect(() => {
        if (!isOpen || !trend) return;
        
        let isMounted = true;
        const buildBundle = async () => {
            setIsLoading(true);
            try {
                // 1. Map TikTok ingredients to specific in-stock inventory items
                const mappedItems = [];
                for (const ingredient of trend.keyIngredients) {
                    // Use bypassThreshold = true to forcefully match garnishes/mixers if possible
                    const results = await semanticEngine.search(ingredient, inventory, true);
                    const bestInStockMatch = results.find(item => item.stock > 0);
                    
                    if (bestInStockMatch) {
                        mappedItems.push({
                            ingredient,
                            product: bestInStockMatch
                        });
                    }
                }

                if (!isMounted) return;
                setBundleItems(mappedItems);

                // 2. Fetch the "Sage Highlights" to personalize the bundle based on actual inventory
                if (mappedItems.length > 0) {
                    const response = await fetch('/api/generate-sage-blurbs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            items: mappedItems.map(m => ({ ingredient: m.ingredient, product: { name: m.product.name } })),
                            trendName: trend.trendName
                        })
                    });
                    
                    if (response.ok) {
                        const blurbs = await response.json();
                        if (isMounted) setSageBlurbs(blurbs);
                    }
                }
            } catch (err) {
                console.error("Failed to build trend bundle:", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        buildBundle();

        return () => {
            isMounted = false;
        };
    }, [isOpen, trend, inventory]);

    // Reset added state when drawer opens
    useEffect(() => {
        if (isOpen) setIsAdded(false);
    }, [isOpen]);

    const handleAddToCart = () => {
        setIsAdded(true);
        if (onAddToCart) {
            onAddToCart(bundleItems.map(item => item.product));
        }
        // Simulate a cart addition delay, then close the drawer
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    if (!trend) return null;

    const basePrice = bundleItems.reduce((acc, item) => acc + item.product.price, 0);
    const discount = basePrice * 0.10; // 10% dynamic discount for bundles
    const finalPrice = basePrice - discount;

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
                    <div>
                        <div className="drawer-badge">
                            <CheckCircle2 size={12} />
                            Trending on SpiritSage
                        </div>
                        <h2 className="drawer-title">{trend.trendName}</h2>
                        <p className="drawer-desc">{trend.description}</p>
                    </div>
                    <button onClick={onClose} className="drawer-close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="drawer-content">
                    <h3 className="drawer-content-title">Curated Shopping List</h3>
                    
                    {isLoading ? (
                        <div className="drawer-loading">
                            <div className="spinner"></div>
                            <p>Spirit Sage is mapping ingredients to inventory...</p>
                        </div>
                    ) : (
                        <div className="drawer-items-list">
                            {bundleItems.map((item, idx) => (
                                <div key={idx} className="drawer-item">
                                    <div className="drawer-item-img-wrap">
                                        <img src={item.product.image || 'https://images.unsplash.com/photo-1569488859134-24b2d490f23f?w=400&auto=format&fit=crop&q=80'} 
                                             alt={item.product.name} 
                                             className="drawer-item-img" />
                                    </div>
                                    <div className="drawer-item-info">
                                        <div className="drawer-item-header">
                                            <h4 className="drawer-item-name">{item.product.name}</h4>
                                            <span className="drawer-item-price">${item.product.price.toFixed(2)}</span>
                                        </div>
                                        <div className="drawer-item-match">Matched for: <span>{item.ingredient}</span></div>
                                        
                                        {/* Sage Suggestion Blurb */}
                                        <div className="drawer-item-blurb">
                                            <div className="blurb-icon">✧</div>
                                            <div>{sageBlurbs[item.product.name] || 'Excellent choice for this bundle.'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Alert if we couldn't match everything */}
                            {bundleItems.length < trend.keyIngredients.length && (
                                <div className="drawer-alert">
                                    <AlertCircle size={18} />
                                    <p>Some items (like fresh garnishes or specialty juices) are not carried in our liquor inventory. You may need to grab them locally!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                {!isLoading && bundleItems.length > 0 && (
                    <div className="drawer-footer">
                        <div className="drawer-footer-line text-gray">
                            <span>Items ({bundleItems.length})</span>
                            <span className="text-white">${basePrice.toFixed(2)}</span>
                        </div>
                        <div className="drawer-footer-line text-green mb-4">
                            <span>Sage Bundle Discount (10%)</span>
                            <span>-${discount.toFixed(2)}</span>
                        </div>
                        
                        <button 
                            className="drawer-checkout-btn" 
                            onClick={handleAddToCart}
                            style={isAdded ? { backgroundColor: '#22c55e', transform: 'scale(0.98)' } : {}}
                        >
                            <span className="btn-left">
                                {isAdded ? <CheckCircle2 size={20} /> : <ShoppingCart size={20} />}
                                {isAdded ? 'Added to Cart!' : 'Add Trend Bundle'}
                            </span>
                            {!isAdded && (
                                <span className="drawer-checkout-price">
                                    ${finalPrice.toFixed(2)}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default TrendBundleDrawer;
