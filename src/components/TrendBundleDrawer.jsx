import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import { semanticEngine } from '../utils/SemanticSearchEngine.js';
import { getProductImage, NON_ALC_KEYWORDS } from '../utils/imageUtils';

const TrendBundleDrawer = ({ trend, isOpen, onClose, inventory, onAddToCart }) => {
    const [bundleItems, setBundleItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sageBlurbs, setSageBlurbs] = useState({});
    const [isAdded, setIsAdded] = useState(false);
    const [missingIngredients, setMissingIngredients] = useState([]);

    useEffect(() => {
        if (!isOpen || !trend) return;
        
        let isMounted = true;
        const buildBundle = async () => {
            setIsLoading(true);
            try {
                // 1. Map TikTok ingredients to specific in-stock inventory items
                const initialMatches = [];
                const missingIngredients = [];

                for (const ingredient of trend.keyIngredients) {
                    const lowerIng = ingredient.toLowerCase();
                    
                    // Skip non-alc/grocery, UNLESS it looks like a spirit (e.g., "Orange Liqueur")
                    const isSpiritKeyword = lowerIng.match(/\bliqueur|spirit|vodka|tequila|rum|gin|whiskey|whisky|bourbon|scotch|brandy|cognac|wine|champagne|prosecco|vermouth|bitters|liqueur\b/);
                    const isNonAlc = NON_ALC_KEYWORDS.some(kw => {
                        // Use a looser check for grocery items to handle plurals/characters better
                        return lowerIng === kw || lowerIng.includes(`${kw} `) || lowerIng.includes(` ${kw}`) || lowerIng.endsWith(` ${kw}`) || lowerIng.startsWith(`${kw} `);
                    });

                    if (!isSpiritKeyword && isNonAlc) {
                        missingIngredients.push(ingredient);
                        continue;
                    }

                    const results = await semanticEngine.search(ingredient, inventory, false);
                    
                    // Categorize matches: Good (0.5+), Alternative (0.35 - 0.5), Missing (<0.35)
                    // We also perform a strict brand check if the ingredient name contains a known brand.
                    const BRANDS = ['bols', 'tanqueray', 'hendricks', 'bacardi', 'titos', 'smirnoff', 'casamigos', 'patron', 'grey goose', 'jameson', 'maker', 'bulleit', 'jack daniels', 'johnnie walker', 'blue run', 'soho'];
                    const detectedBrand = BRANDS.find(brand => lowerIng.includes(brand));

                    // Updated: We now allow matching OOS items so the user sees the "correct" recommendation.
                    const bestMatch = results.find(item => {
                        if (item.similarityScore < 0.5) return false;
                        if (detectedBrand && !item.name.toLowerCase().includes(detectedBrand)) return false;
                        return true;
                    });

                    const alternativeMatch = !bestMatch ? results.find(item => {
                        if (item.similarityScore < 0.35) return false;
                        // Avoid cross-brand "alternatives" for specific branded requests
                        if (detectedBrand && !item.name.toLowerCase().includes(detectedBrand)) return false;
                        return true;
                    }) : null;
                    
                    if (bestMatch) {
                        initialMatches.push({
                            ingredient,
                            product: bestMatch,
                            isAlternative: false
                        });
                    } else if (alternativeMatch) {
                        initialMatches.push({
                            ingredient,
                            product: alternativeMatch,
                            isAlternative: true
                        });
                    } else {
                        missingIngredients.push(ingredient);
                    }
                }

                if (!isMounted) return;

                // 2. Deduplicate: If one bottle satisfies multiple ingredients, or is redundant
                const productToIngredients = new Map();
                initialMatches.forEach(m => {
                    const existing = productToIngredients.get(m.product.id) || { product: m.product, ingredients: [], isAlternative: m.isAlternative };
                    existing.ingredients.push(m.ingredient);
                    if (!m.isAlternative) existing.isAlternative = false;
                    productToIngredients.set(m.product.id, existing);
                });

                const consolidated = Array.from(productToIngredients.values());
                
                const filtered = consolidated.filter((item, index, self) => {
                    const ingredientsList = item.ingredients.map(i => i.toLowerCase());
                    const genericSpirits = ['vodka', 'gin', 'rum', 'tequila', 'whiskey', 'whisky', 'bourbon', 'scotch'];
                    const isGeneric = ingredientsList.length === 1 && genericSpirits.includes(ingredientsList[0]);
                    
                    if (isGeneric) {
                        const baseSpirit = ingredientsList[0];
                        // Find a specific product in the SAME bundle that is also this spirit
                        const specificMatch = self.find(other => 
                            other.product.id !== item.product.id && 
                            (other.product.name.toLowerCase().includes(baseSpirit) || 
                             (other.product.liquorType || '').toLowerCase().includes(baseSpirit))
                        );

                        if (specificMatch) {
                            // Merge the generic ingredient into the specific bottle's list
                            if (!specificMatch.ingredients.includes(item.ingredients[0])) {
                                specificMatch.ingredients.push(item.ingredients[0]);
                            }
                            return false; // Drop the generic bottle
                        }
                    }
                    return true;
                });

                if (!isMounted) return;

                setBundleItems(filtered.map(f => ({
                    ingredient: f.ingredients.join(', '),
                    product: f.product,
                    isAlternative: f.isAlternative
                })));

                setMissingIngredients(missingIngredients);

                // 3. Fetch the "Sage Highlights"
                if (filtered.length > 0) {
                    const response = await fetch('/api/generate-sage-blurbs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            items: filtered.map(f => ({ 
                                ingredient: f.ingredients.join(', '), 
                                product: { name: f.product.name } 
                            })),
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
            // Only add in-stock items to the cart
            const inStockItems = bundleItems
                .filter(item => item.product.stock > 0)
                .map(item => item.product);
            
            if (inStockItems.length > 0) {
                onAddToCart(inStockItems);
            }
        }
        // Simulate a cart addition delay, then close the drawer
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    if (!trend) return null;

    // Only sum price for in-stock items
    const inStockBundle = bundleItems.filter(item => item.product.stock > 0);
    const finalPrice = inStockBundle.reduce((acc, item) => acc + item.product.price, 0);
    const allOOS = bundleItems.length > 0 && bundleItems.every(item => item.product.stock <= 0);

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
                            TRENDING ON SPIRITSAGE
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
                            {bundleItems.map((item, idx) => {
                                const isOOS = item.product.stock <= 0;
                                return (
                                    <div key={idx} className={`drawer-item ${isOOS ? 'oos' : ''}`}>
                                        <div className="drawer-item-img-wrap">
                                            <img src={getProductImage(item.product)} 
                                                 alt={item.product.name} 
                                                 className="drawer-item-img" />
                                            {isOOS && <div className="oos-overlay">SOLD OUT</div>}
                                        </div>
                                        <div className="drawer-item-info">
                                            <div className="drawer-item-header">
                                                <h4 className="drawer-item-name">{item.product.name}</h4>
                                                <span className="drawer-item-price">
                                                    {isOOS ? <span className="oos-text">Unavailable</span> : `$${item.product.price.toFixed(2)}`}
                                                </span>
                                            </div>
                                            <div className="drawer-item-match">
                                                Matched for: <span>{item.ingredient}</span>
                                                {item.isAlternative && <span className="alt-tag"> (Alternative Suggestion)</span>}
                                            </div>
                                            
                                            {/* Sage Suggestion Blurb */}
                                            <div className="drawer-item-blurb">
                                                <div className="blurb-icon">✧</div>
                                                <div>{sageBlurbs[item.product.name] || 'Excellent choice for this bundle.'}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Alert if we couldn't match everything */}
                            {(bundleItems.length < trend.keyIngredients.length || missingIngredients.length > 0 || bundleItems.some(i => i.product.stock <= 0)) && (
                                <div className="drawer-alert">
                                    <AlertCircle size={18} />
                                    <div>
                                        {missingIngredients.length > 0 && (
                                            <p className="mb-1"><strong>Not found in inventory:</strong> {missingIngredients.join(', ')}</p>
                                        )}
                                        {bundleItems.some(i => i.product.stock <= 0) && (
                                            <p className="mb-1 text-yellow-500"><strong>Note:</strong> Some recommended bottles are currently out of stock.</p>
                                        )}
                                        <p>Some specialty items (like fresh garnishes) are not carried in our liquor inventory. You may need to grab them locally!</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                {!isLoading && (bundleItems.length > 0 || missingIngredients.length > 0) && (
                    <div className="drawer-footer">
                        {bundleItems.length > 0 && !allOOS && (
                            <div className="drawer-footer-line text-gray mb-4">
                                <span>Total Price (In-Stock Only)</span>
                                <span className="text-white">${finalPrice.toFixed(2)}</span>
                            </div>
                        )}
                        
                        <button 
                            className="drawer-checkout-btn" 
                            onClick={handleAddToCart}
                            disabled={isAdded || allOOS || bundleItems.length === 0}
                            style={{
                                ...(isAdded ? { backgroundColor: '#22c55e', transform: 'scale(0.98)' } : {}),
                                ...(allOOS || bundleItems.length === 0 ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(1)' } : {})
                            }}
                        >
                            <span className="btn-left">
                                {isAdded ? <CheckCircle2 size={20} /> : <ShoppingCart size={20} />}
                                {isAdded ? 'Added to Cart!' : allOOS ? 'Bundle Out of Stock' : 'Add Available to Cart'}
                            </span>
                            {!isAdded && !allOOS && bundleItems.length > 0 && (
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
