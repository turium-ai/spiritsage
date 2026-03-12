const getFallbackImage = (item) => {
    // Check type and name first since "Category" is sometimes broadly tagged as "Wine & Spirits"
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

console.log(getFallbackImage({
  name: "The Glenrothes Sherry Cask Single Malt",
  category: "Spirits",
  liquorType: "Whiskey",
  style: "Rich & Warming"
}));

