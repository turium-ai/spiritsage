import React from 'react';
import { Info, Search } from 'lucide-react';
import { RecommendationEngine, extractPriceFilters } from '../utils/RecommendationEngine';
// import inventory from '../data/inventory.json'; // Removed static import
import ProductModal from './ProductModal';
import { semanticEngine } from '../utils/SemanticSearchEngine';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '50px', color: 'red', background: '#fff', zIndex: 9999, position: 'relative' }}>
                    <h1>Something went wrong.</h1>
                    <pre>{this.state.error.toString()}</pre>
                    <pre>{this.state.error.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const PRICE_BUCKETS = [
    { label: 'All Prices', min: undefined, max: undefined },
    { label: 'Value / Budget (<$15)', min: 0, max: 14.99 },
    { label: 'Popular Premium ($15–$30)', min: 15, max: 29.99 },
    { label: 'Ultra-Premium ($30–$50)', min: 30, max: 49.99 },
    { label: 'Luxury ($50–$150)', min: 50, max: 150 },
    { label: 'Icon / Collector ($150+)', min: 150.01, max: 10000 }
];

const getFallbackImage = (item) => {
    const lookupStr = `${item.liquorType || ''} ${item.name || ''} ${item.category || ''}`.toLowerCase();

    if (lookupStr.includes('whiskey') || lookupStr.includes('scotch') || lookupStr.includes('bourbon') || lookupStr.includes('rye') || lookupStr.includes('malt')) {
        return '/images/placeholder_spirit.png';
    }
    if (lookupStr.includes('tequila') || lookupStr.includes('mezcal') || lookupStr.includes('vodka') || lookupStr.includes('rum') || lookupStr.includes('gin') || lookupStr.includes('cognac') || lookupStr.includes('brandy') || lookupStr.includes('liqueur')) {
        return '/images/placeholder_spirit.png';
    }
    if (lookupStr.includes('beer') || lookupStr.includes('ale') || lookupStr.includes('lager') || lookupStr.includes('stout')) {
        return '/images/placeholder_beer.png';
    }
    if (lookupStr.includes('wine') || lookupStr.includes('champagne') || lookupStr.includes('prosecco')) {
        return '/images/placeholder_wine.png';
    }

    return '/images/placeholder_spirit.png'; // safe default
};

const getFormattedSize = (sizeStr) => {
    if (!sizeStr) return '';
    let formatted = sizeStr.toString().replace(/\b(\d+)\s*-?\s*(?:pk|pck|pack|packs|pks|pcs)\b/gi, '$1 Pack');
    formatted = formatted.replace(/\b(?:btl|bott|btls)\b/gi, 'Bottles');
    formatted = formatted.replace(/\bcan\b/gi, 'Cans');
    return formatted;
};

const Recommendations = ({ filters, searchQuery, onResultsChange, inventory }) => {
    const [selectedItem, setSelectedItem] = React.useState(null);
    const [priceFilter, setPriceFilter] = React.useState('All Prices');
    const [visibleCount, setVisibleCount] = React.useState(24);

    // Reset visible count when search or filters change
    React.useEffect(() => {
        setVisibleCount(24);
    }, [searchQuery, filters]);

    const searchContext = React.useMemo(() => {
        return extractPriceFilters(searchQuery);
    }, [searchQuery]);

    const engine = React.useMemo(() => {
        if (!inventory || inventory.length === 0) return null;
        return new RecommendationEngine(inventory);
    }, [inventory]);

    const rankedRecommendations = React.useMemo(() => {
        if (!engine) return [];
        return engine.recommend({
            category: filters.category === 'All' ? null : filters.category,
            style: filters.style,
            search: searchContext.cleanQuery,
            strictMinPrice: searchContext.min,
            strictMaxPrice: searchContext.max
        });
    }, [filters, searchContext, engine]);

    const [semanticResults, setSemanticResults] = React.useState([]);
    const [isSearchingSemantic, setIsSearchingSemantic] = React.useState(false);

    const semanticTimerRef = React.useRef(null);

    React.useEffect(() => {
        let isMounted = true;
        const currentSearchQuery = searchQuery;
        const exactMatches = rankedRecommendations.filter(i => i.matchType === 'exact');
        const exactMatchCount = exactMatches.length;

        if (semanticTimerRef.current) {
            clearTimeout(semanticTimerRef.current);
        }

        if (searchContext.cleanQuery) {
            // ALWAYS run the Semantic AI Model on text queries (Debounced to prevent Tab Out Of Memory crashes)
            setIsSearchingSemantic(true);
            semanticTimerRef.current = setTimeout(() => {
                semanticEngine.search(searchContext.cleanQuery, inventory).then(results => {
                    if (isMounted && currentSearchQuery === searchQuery) {
                        setSemanticResults(results);
                        setIsSearchingSemantic(false);
                    }
                }).catch(err => {
                    console.error("Semantic search failed:", err);
                    if (isMounted && currentSearchQuery === searchQuery) setIsSearchingSemantic(false);
                });
            }, 400); // Wait 400ms after the last stroke before loading the AI model
        } else {
            setSemanticResults([]);
            setIsSearchingSemantic(false);
        }

        return () => { isMounted = false; };
    }, [searchQuery, searchContext.cleanQuery, rankedRecommendations, inventory]);

    const baseResults = React.useMemo(() => {
        let base = rankedRecommendations;

        // Semantic First Pipeline
        // If we have AI semantic results, they go to the top. Any exact literal matches act as secondary fallbacks.
        if (semanticResults.length > 0) {
            const exactMatches = rankedRecommendations.filter(i => i.matchType === 'exact');
            const comparables = rankedRecommendations.filter(i => i.matchType === 'comparable');

            // Preserve explicit exact matches and comparables. Only add AI semantic results that are purely new discoveries.
            let pureSemantic = semanticResults.filter(s =>
                !exactMatches.some(e => e.id === s.id) &&
                !comparables.some(c => c.id === s.id)
            );

            // Apply strict text-extracted price filters to semantic results
            if (searchContext.min !== undefined) {
                pureSemantic = pureSemantic.filter(s => s.price >= searchContext.min);
            }
            if (searchContext.max !== undefined) {
                pureSemantic = pureSemantic.filter(s => s.price <= searchContext.max);
            }

            // Block AI hallucinations: if we found solid exact matches, don't let semantic matches bleed in from completely unrelated categories
            if (exactMatches.length > 0) {
                const dominantCategory = exactMatches[0].category;
                pureSemantic = pureSemantic.filter(s => s.category === dominantCategory);

                if (dominantCategory === 'Spirits') {
                    const dominantType = (exactMatches[0].liquorType || '').toLowerCase();
                    const baseSpirits = ['vodka', 'tequila', 'mezcal', 'rum', 'gin', 'whiskey', 'whisky', 'bourbon', 'scotch', 'cognac', 'brandy', 'liqueur'];
                    const foundBase = baseSpirits.find(b => dominantType.includes(b));

                    if (foundBase) {
                        // Lock the semantic matches to the same base spirit
                        pureSemantic = pureSemantic.filter(s => (s.liquorType || '').toLowerCase().includes(foundBase));
                    }
                }
            }

            const sortedSemantic = [...pureSemantic].sort((a, b) => a.price - b.price);
            base = [...sortedSemantic, ...exactMatches, ...comparables];
        } else if (searchQuery && isSearchingSemantic) {
            const exactMatches = rankedRecommendations.filter(i => i.matchType === 'exact');
            const comparables = rankedRecommendations.filter(i => i.matchType === 'comparable');
            base = [...exactMatches, ...comparables];
        }
        return base;
    }, [semanticResults, rankedRecommendations, searchQuery, isSearchingSemantic, searchContext]);

    const bucketCounts = React.useMemo(() => {
        const counts = {};
        PRICE_BUCKETS.forEach(b => counts[b.label] = 0);

        // Exclude 'comparable' items from the button counts so they strictly reflect primary search hits
        const countableResults = baseResults.filter(item => item.matchType !== 'comparable');

        countableResults.forEach(item => {
            counts['All Prices']++;
            PRICE_BUCKETS.forEach(bucket => {
                if (bucket.label !== 'All Prices') {
                    if ((bucket.min === undefined || item.price >= bucket.min) &&
                        (bucket.max === undefined || item.price <= bucket.max)) {
                        counts[bucket.label]++;
                    }
                }
            });
        });
        return counts;
    }, [baseResults]);

    const filtered = React.useMemo(() => {
        const bucket = PRICE_BUCKETS.find(b => b.label === priceFilter) || PRICE_BUCKETS[0];
        return baseResults.filter(item => {
            if (bucket.min !== undefined && item.price < bucket.min) return false;
            if (bucket.max !== undefined && item.price > bucket.max) return false;
            if (searchContext.min !== undefined && item.price < searchContext.min) return false;
            if (searchContext.max !== undefined && item.price > searchContext.max) return false;
            return true;
        });
    }, [baseResults, priceFilter, searchContext]);

    // Auto-select 'All Prices' if the current bucket becomes empty after a new search
    React.useEffect(() => {
        if (bucketCounts[priceFilter] === 0 && priceFilter !== 'All Prices') {
            setPriceFilter('All Prices');
        }
    }, [bucketCounts, priceFilter]);

    // Notify parent of result changes for Active Co-Pilot context
    React.useEffect(() => {
        if (onResultsChange) {
            onResultsChange({
                count: filtered.length,
                topItems: filtered.slice(0, 3).map(i => i.name),
                query: searchContext.cleanQuery || searchQuery
            });
        }
    }, [filtered, searchContext, searchQuery, onResultsChange]);

    const categoryLabel = searchQuery
        ? `Results for "${searchQuery}"`
        : (filters.category === 'All' ? 'Fine Selection' : `${filters.category} Collection`);

    const isSemanticSearch = filtered.some(i => i.matchType === 'semantic');

    // Remove the mutually exclusive !isSemanticSearch blocker, as the UI is now Semantic First!
    // We can safely show AI results in the main grid AND text-based Smart Alternatives in the sidebar simultaneously.
    const hasBadgedExacts = searchQuery && filtered.some(i => i.matchType === 'exact' && (i.isGreatUpgrade || i.isCheaperAlternative));

    const isSearchWithComparables = searchQuery && (filtered.some(i => i.matchType === 'comparable') || hasBadgedExacts);

    let exactMatches = (isSearchWithComparables || isSemanticSearch) ? filtered.filter(i => i.matchType === 'exact' || i.matchType === 'semantic') : [...filtered];
    let comparables = isSearchWithComparables ? filtered.filter(i => i.matchType === 'comparable') : [];

    // If we have no pure comparables but we have badged exact matches (e.g., searching a broad category like 'bourbon' or 'IPA'),
    // feature the badged items in the Smart Alternatives sidebar to provide a curated experience.
    if (comparables.length === 0 && hasBadgedExacts) {
        comparables = exactMatches.filter(i => i.isGreatUpgrade || i.isCheaperAlternative || i.isSplurge).slice(0, 4);
        // Only remove them from the main grid if there will still be enough items left to display!
    }

    const displayedMatches = exactMatches.slice(0, visibleCount);
    const hasMore = exactMatches.length > visibleCount;

    // Force strict price sorting on the final output grid so Semantic and Exact matches interleave visually by price
    exactMatches.sort((a, b) => a.price - b.price);

    const renderCard = (item) => (
        <div key={item.id} className="glass animate-fade-in" style={{
            overflow: 'hidden',
            transition: 'var(--transition-smooth)',
            cursor: 'pointer'
        }}
            onClick={() => setSelectedItem(item)}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{ position: 'relative', height: '200px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
                <img
                    src={item.image || getFallbackImage(item)}
                    alt={item.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getFallbackImage(item); }}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
                />
                {item.isGreatUpgrade && (
                    <div style={{
                        position: 'absolute',
                        top: '40px',
                        left: '12px',
                        background: '#f39c12',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>Great Upgrade</div>
                )}
                {item.isCheaperAlternative && (
                    <div style={{
                        position: 'absolute',
                        top: item.isGreatUpgrade ? '68px' : '40px',
                        left: '12px',
                        background: '#2ecc71',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>Great Value</div>
                )}
                {item.isSplurge && (
                    <div style={{
                        position: 'absolute',
                        top: (item.isGreatUpgrade || item.isCheaperAlternative) ? '68px' : '40px',
                        left: '12px',
                        background: '#e74c3c',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>Worth The Splurge</div>
                )}
                {(item.stock < 5 && item.stock > 0) && (
                    <div className="animate-pulse" style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(230, 80, 0, 0.95)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        color: '#fff',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 8px rgba(230, 80, 0, 0.4)'
                    }}>Low Stock</div>
                )}
            </div>

            <div style={{ padding: '16px' }}>
                <span style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    display: 'block',
                    marginBottom: '4px'
                }}>
                    {item.liquorType || item.category} • {getFormattedSize(item.size)}
                </span>
                <h3 style={{ margin: '8px 0 12px' }}>{getFormattedSize(item.name)}</h3>
                <p style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    marginBottom: '20px',
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {item.tastingNotes}
                </p>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--glass-border)'
                }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>${item.price.toFixed(2)}</span>
                    <button style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}>
                        Details <Info size={14} />
                    </button>
                </div>
            </div>
        </div>
    );

    const getHeaderImage = (category) => {
        if (category === 'Spirits') return '/images/ui/bg_spirits.png';
        if (category === 'Wine,Champagne') return '/images/ui/bg_wine.png';
        if (category === 'Beer, Cider & Seltzers') return '/images/ui/bg_beer.png';
        if (category === 'Liqueurs & Cordials') return '/images/ui/bg_liqueurs.png';
        return '/images/ui/bg_discover_all.png';
    };

    if (!inventory || inventory.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <div className="animate-pulse" style={{ color: 'var(--color-primary)', fontSize: '18px' }}>Loading inventory...</div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
            {/* Immersive Category Header */}
            <div style={{
                position: 'relative',
                height: '70px',
                minHeight: '70px',
                width: '100%',
                backgroundImage: `linear-gradient(to top, var(--color-bg) 0%, rgba(0,0,0,0.2) 100%), url(${getHeaderImage(filters.category)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '80px', /* Push down below fixed navbar */
                marginBottom: '20px'
            }}>
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.8)', margin: '0 0 2px 0' }}>
                        {categoryLabel}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', textShadow: '0 2px 8px rgba(0,0,0,0.8)', margin: 0 }}>
                        Tailored to your flavor palette.
                    </p>
                </div>
            </div>

            <div style={{
                maxWidth: '1650px',
                margin: '0 auto',
                padding: '0 20px'
            }}>
                <ErrorBoundary>


                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px', justifyContent: 'center' }}>
                        {PRICE_BUCKETS.map(bucket => {
                            const count = bucketCounts[bucket.label] || 0;
                            const isEmpty = count === 0;
                            const isSelected = priceFilter === bucket.label;

                            return (
                                <button
                                    key={bucket.label}
                                    onClick={() => !isEmpty && setPriceFilter(bucket.label)}
                                    disabled={isEmpty}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '20px',
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 600,
                                        cursor: isEmpty ? 'not-allowed' : 'pointer',
                                        background: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                        color: isSelected ? '#000' : (isEmpty ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)'),
                                        border: '1px solid',
                                        borderColor: isSelected ? 'var(--color-primary)' : (isEmpty ? 'transparent' : 'var(--glass-border)'),
                                        boxShadow: isSelected ? '0 0 15px rgba(212,175,55,0.4), 0 0 5px rgba(212,175,55,0.2)' : 'none',
                                        opacity: isEmpty ? 0.5 : 1,
                                        transition: 'var(--transition-smooth)'
                                    }}
                                    title={isEmpty ? "No items in this price range" : `${count} items`}
                                >
                                    {bucket.label} {count > 0 && `(${count})`}
                                </button>
                            );
                        })}
                    </div>

                    <div className="results-container">
                        <div className="main-results">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '16px' }}>
                                {displayedMatches.length > 0 ? displayedMatches.map(renderCard) : (
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        padding: '60px 20px',
                                        textAlign: 'center',
                                        background: 'var(--glass-bg)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--glass-border)'
                                    }}>
                                        <h3 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '12px' }}>No spirits found</h3>
                                        <p style={{ color: 'var(--text-muted)' }}>Try broadening your search or adjusting your price filter.</p>
                                    </div>
                                )}
                            </div>
                            
                            {hasMore && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                                    <button 
                                        onClick={() => setVisibleCount(prev => prev + 24)}
                                        className="btn-secondary"
                                        style={{ padding: '12px 40px', borderRadius: '30px' }}
                                    >
                                        Show More Spirits ({exactMatches.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Smart Alternatives Right Panel */}
                        {comparables.length > 0 && (
                            <div className="smart-alts-panel glass animate-fade-in">
                                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--color-primary)' }}>Smart Alternatives</h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>Comparable bottles tailored to your search.</p>

                                <div className="smart-alts-list">
                                    {comparables.map(item => (
                                        <div key={item.id} className="smart-alts-item" style={{
                                            display: 'flex', gap: '16px', padding: '16px', borderRadius: '12px', cursor: 'pointer',
                                            transition: 'var(--transition-smooth)', background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)'
                                        }}
                                            onClick={() => setSelectedItem(item)}
                                            onMouseOver={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                e.currentTarget.style.transform = 'translateX(4px)';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.transform = 'translateX(0)';
                                            }}
                                        >
                                            <div style={{
                                                width: '60px', height: '80px', flexShrink: 0,
                                                background: 'linear-gradient(135deg, rgba(20,20,30,0.9), rgba(30,30,45,0.9))',
                                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px'
                                            }}>
                                                <img
                                                    src={item.image || getFallbackImage(item)}
                                                    alt={item.name}
                                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getFallbackImage(item); }}
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                            </div>
                                            <div style={{ flex: '1', minWidth: '0' }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFormattedSize(item.name)}</h4>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.liquorType || item.category} • {getFormattedSize(item.size)}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>${item.price.toFixed(2)}</span>
                                                    {item.isGreatUpgrade && <span style={{ background: '#f39c12', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>Upgrade</span>}
                                                    {item.isCheaperAlternative && <span style={{ background: '#2ecc71', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>Value</span>}
                                                    {item.isSplurge && <span style={{ background: '#e74c3c', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>Splurge</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <ProductModal
                        item={selectedItem}
                        isOpen={!!selectedItem}
                        onClose={() => setSelectedItem(null)}
                    />
                </ErrorBoundary>
            </div>
        </div>
    );
};

export default Recommendations;
