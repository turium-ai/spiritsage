export const NON_ALC_KEYWORDS = [
    'juice', 'wedge', 'slice', 'syrup', 'soda', 'water', 'salt', 'pepper', 'peppers', 'sugar', 'bitters', 
    'ice', 'club', 'tonic', 'cola', 'coke', 'sprite', 'ginger ale', 'ginger beer', 'grenadine', 
    'sweet and sour', 'sour mix', 'puree', 'purée', 'nectar', 'agave', 'honey', 'milk', 'cream', 
    'tea', 'egg', 'white', 'yolk', 'cheese', 'parmesan', 'parm', 'garnish',
    'mint', 'basil', 'lemon', 'lime', 'orange', 'fruit', 'fruit', 'herb', 'herbs', 'bitter',
    'olive', 'olives', 'brine', 'pickle', 'pickles', 'onion', 'onions',
    'jalapeno', 'jalapeño', 'jalapenos', 'jalapeños', 'chili', 'chilis', 'chilli', 'chillies', 'habanero', 'habaneros',
    'cucumber', 'cucumbers', 'berry', 'berries', 'strawberry', 'strawberries', 'raspberry', 'raspberries', 'blueberry', 'blueberries',
    'grapefruit', 'pineapple', 'mango', 'peach', 'apple', 'watermelon'
];

export const getPlaceholderImage = (item) => {
    if (!item) return '/images/placeholder.png';

    // Fallback based on category or liquorType
    const category = (item.category || '').toLowerCase();
    const liquorType = (item.liquorType || '').toLowerCase();
    const lookup = `${category} ${liquorType}`;

    if (lookup.includes('beer') || lookup.includes('ale') || lookup.includes('lager') || lookup.includes('stout') || lookup.includes('cider') || lookup.includes('seltzer')) {
        return '/images/placeholder_beer.png';
    }
    if (lookup.includes('wine')) {
        return '/images/placeholder_wine.png';
    }
    if (lookup.includes('bubbles') || lookup.includes('champagne') || lookup.includes('sparkling') || lookup.includes('prosecco')) {
        return '/images/placeholder_champagne.png';
    }
    if (lookup.includes('spirit') || lookup.includes('liquor') || lookup.includes('whiskey') || lookup.includes('tequila') || lookup.includes('vodka') || lookup.includes('rum') || lookup.includes('gin') || lookup.includes('brandy') || lookup.includes('cognac')) {
        return '/images/placeholder_spirit.png';
    }

    // Generic fallback
    return '/images/placeholder.png';
};

export const getProductImage = (item) => {
    if (item && item.image && item.image.trim() !== '') {
        return item.image;
    }
    return getPlaceholderImage(item);
};
