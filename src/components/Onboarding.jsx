import React, { useState } from 'react';
import { ChevronRight, Sparkles, GlassWater, PartyPopper, Gift, Beer, Scale, Flame, Wind, Zap, Waves, Search } from 'lucide-react';

const getFlavorOptions = (category) => {
    switch (category) {
        case 'Beer, Cider & Seltzers':
            return [
                { label: "Crisp & Refreshing", value: "Crisp & Refreshing", icon: <Zap size={20} />, bg: "/images/ui/bg_beer_crisp_1771960670741.png" },
                { label: "Hoppy & Bitter", value: "Hoppy & Bitter", icon: <Flame size={20} />, bg: "/images/ui/bg_beer_hoppy_1771960684644.png" },
                { label: "Light & Fruity", value: "Light & Fruity", icon: <Waves size={20} />, bg: "/images/ui/bg_beer_fruity_1771960700595.png" },
                { label: "Dark & Roasty", value: "Dark & Roasty", icon: <Wind size={20} />, bg: "/images/ui/bg_beer_dark_1771960713944.png" }
            ];
        case 'Wine,Champagne':
            return [
                { label: "Bold & Structured", value: "Bold & Structured", icon: <Flame size={20} />, bg: "/images/ui/bg_wine_bold_1771960755774.png" },
                { label: "Full-Bodied", value: "Full-Bodied", icon: <Scale size={20} />, bg: "/images/ui/bg_wine_full_1771960846904.png" },
                { label: "Crisp & Vibrant", value: "Crisp & Vibrant", icon: <Zap size={20} />, bg: "/images/ui/bg_wine_crisp_1771960788749.png" },
                { label: "Rich & Creamy", value: "Rich & Creamy", icon: <Waves size={20} />, bg: "/images/ui/bg_wine_rich_1771960803065.png" },
                { label: "Sweet & Floral", value: "Sweet & Floral", icon: <Sparkles size={20} />, bg: "/images/ui/bg_wine_sweet_1771960815796.png" }
            ];
        case 'Spirits':
            return [
                { label: "Clean & Smooth", value: "Clean & Smooth", icon: <Zap size={20} />, bg: "/images/ui/bg_flavor_smooth.png" },
                { label: "Rich & Warming", value: "Rich & Warming", icon: <Flame size={20} />, bg: "/images/ui/bg_flavor_warming.png" },
                { label: "Sweet & Tropical", value: "Sweet & Tropical", icon: <Waves size={20} />, bg: "/images/ui/bg_flavor_tropical.png" },
                { label: "Sweet & Oaky", value: "Sweet & Oaky", icon: <Scale size={20} />, bg: "/images/ui/bg_flavor_oaky.jpg" },
                { label: "Smoky & Peaty", value: "Smoky & Peaty", icon: <Wind size={20} />, bg: "/images/ui/bg_flavor_peaty.jpg" }
            ];
        case 'Liqueurs & Cordials':
            return [
                { label: "Sweet & Flavorful", value: "Sweet & Flavorful", icon: <Waves size={20} />, bg: "/images/ui/bg_liq_sweet_1771960861753.png" },
                { label: "Fruity", value: "Fruity", icon: <Sparkles size={20} />, bg: "/images/ui/bg_liq_fruity_1771960875075.png" },
                { label: "Balanced", value: "Balanced", icon: <Scale size={20} />, bg: "/images/ui/bg_liq_balanced_1771960888156.png" },
                { label: "Bold", value: "Bold", icon: <Flame size={20} />, bg: "/images/ui/bg_liq_bold_1771960901528.png" }
            ];
        default:
            return [
                { label: "Clean & Smooth", value: "Clean & Smooth", icon: <Zap size={20} />, bg: "/images/ui/bg_flavor_smooth.png" },
                { label: "Bold & Structured", value: "Bold & Structured", icon: <Flame size={20} />, bg: "/images/ui/bg_wine_bold_1771960755774.png" },
                { label: "Crisp & Refreshing", value: "Crisp & Refreshing", icon: <Wind size={20} />, bg: "/images/ui/bg_beer_crisp_1771960670741.png" }
            ];
    }
};

const steps = [
    {
        title: "What are you looking to discover?",
        key: 'category',
        options: [
            { label: "Spirits", value: "Spirits", icon: <GlassWater size={28} />, desc: "Whiskey, Tequila, Vodka & More", bg: "/images/ui/bg_spirits.png" },
            { label: "Wine & Bubbles", value: "Wine,Champagne", icon: <Sparkles size={28} />, desc: "Reds, Whites & Champagnes", bg: "/images/ui/bg_wine.png" },
            { label: "Beer & More", value: "Beer, Cider & Seltzers", icon: <Beer size={28} />, desc: "Craft Brews, Ciders & Seltzers", bg: "/images/ui/bg_beer.png" },
            { label: "Liqueurs", value: "Liqueurs & Cordials", icon: <Gift size={28} />, desc: "Sweet & Flavorful Additions", bg: "/images/ui/bg_liqueurs.png" },
            { label: "Discover All", value: "All", icon: <PartyPopper size={28} />, desc: "Explore the Entire Cellar", bg: "/images/ui/bg_discover_all.png" }
        ]
    },
    {
        title: "Select your flavor palette",
        key: 'style',
        dynamicOptions: true
    }
];

const Onboarding = ({ onComplete, onSearch, searchQuery }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [localQuery, setLocalQuery] = useState(searchQuery || '');

    const handleSelect = (value) => {
        const stepKey = steps[currentStep].key;
        const newAnswers = { ...answers, [stepKey]: value };
        setAnswers(newAnswers);

        if (stepKey === 'category' && value === 'All') {
            // Immediate jump to recommendations and price filters
            onComplete(newAnswers);
        } else if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete(newAnswers);
        }
    };

    return (
        <div className="animate-fade-in p-responsive" style={{
            maxWidth: '1200px',
            textAlign: 'center',
            margin: '0 auto 40px auto',
            paddingTop: '60px'
        }}>
            {currentStep > 0 && currentStep !== 1 && (
                <>
                    <h2 style={{ fontSize: '46px', marginBottom: '24px', color: 'var(--text-main)', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        {steps[currentStep].title}
                    </h2>

                    <div style={{
                        width: '100%',
                        maxWidth: '300px',
                        height: '2px',
                        background: 'var(--color-accent)',
                        margin: '0 auto 40px auto',
                        boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
                    }} />
                </>
            )}

            {currentStep === 0 && (
                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto 20px auto' }}>
                    <Search size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search for a specific brand, bottle, or style..."
                        value={localQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalQuery(val);
                            // Note: We deliberately do NOT call onSearch(val) here
                            // to avoid ripping focus from the user. We wait for the Enter key.
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && localQuery.trim()) {
                                onSearch(localQuery.trim());
                            }
                        }}
                        style={{
                            width: '100%', padding: '16px 24px 16px 50px', background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '30px', color: 'var(--text-main)',
                            fontSize: '16px', outline: 'none', transition: 'var(--transition-smooth)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)'}
                    />
                </div>
            )}

            {currentStep > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                    <button
                        onClick={() => {
                            setCurrentStep(0);
                            setAnswers({});
                        }}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            padding: '10px 24px',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'var(--transition-smooth)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'rgba(212,175,55,0.05)' }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'transparent' }}
                    >
                        &larr; Back to Homepage
                    </button>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '20px',
                width: '100%'
            }}>
                {(steps[currentStep].dynamicOptions
                    ? getFlavorOptions(answers.category)
                    : steps[currentStep].options
                ).map((opt) => {
                    const isSelected = answers[steps[currentStep].key] === opt.value;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            style={{
                                flex: '1 1 200px',
                                maxWidth: '240px',
                                padding: '30px 24px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                textAlign: 'center',
                                gap: '16px',
                                minHeight: '380px',
                                textDecoration: 'none',
                                background: isSelected ? 'var(--color-primary-glow)' : 'var(--glass-bg)',
                                backgroundImage: opt.bg ? `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 100%), url(${opt.bg})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: isSelected ? '0 8px 25px rgba(212,175,55,0.2)' : '0 8px 20px rgba(0,0,0,0.2)'
                            }}
                            className={`glass animate-fade-in flavor-card ${isSelected ? 'selected' : ''}`}
                        >
                            <div style={{ zIndex: 2, marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {opt.icon && <div style={{ color: 'var(--color-accent)', marginBottom: '12px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{opt.icon}</div>}
                                <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#fff', marginBottom: '8px', textShadow: '0 4px 12px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.5)' }}>
                                    {opt.label}
                                </div>
                                {opt.desc && (
                                    <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.95)', fontWeight: 500, lineHeight: 1.5, textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 6px rgba(0,0,0,0.6)' }}>
                                        {opt.desc}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Onboarding;
