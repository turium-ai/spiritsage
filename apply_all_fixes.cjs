const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const inventoryPath = path.join(__dirname, 'src', 'data', 'inventory.json');
const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

let agaveFixed = 0;
let spiritFixed = 0;
let cognacsFixed = 0;
let tobaccoFixed = 0;
let malibuSpirits = 0;
let malibuRTDs = 0;
let accessoriesFixed = 0;
let fortifiedFixed = 0;
let wineFixed = 0;
let naFixed = 0;
let fingerprintsGenerated = 0;

// Mapping for generic Spirit items
const BRAND_MAP = [
    { re: /DON JULIO|PATRON|JOSE CUERVO|CUERVO|1800 TEQUILA|HERRADURA|EL JIMADOR|CAZADORES|ESPOLON|OLMECA|SAUZA|MILAGRO|HORNITOS|AVION|CASAMIGOS|CLASE AZUL|CODIGO|TEREMANA|LUNAZUL|CENOTE|TEQUILA/i, cat: 'Spirits', type: 'Tequila' },
    { re: /BACARDI|CAPTAIN MORGAN|MOUNT GAY|RON RICO|RON DIAZ|CRUZAN|MYERS RUM|APPLETON|KRAKEN|SAILOR JERRY|BUMBU|PLANTATION RUM|ANGOSTURA|MONTEGO BAY|FLOR DE CANA|GOSLINGS/i, cat: 'Spirits', type: 'Rum' },
    { re: /JOHNNIE WALKER|CHIVAS|DEWARS|GLENFIDDICH|GLENLIVET|MACALLAN|HIGHLAND PARK|BALVENIE|LAPHROAIG|OBAN|DALMORE|SINGLETON|MONKEY SHOULDER|FAMOUS GROUSE|GRANT'S|WHYTE|HW KIRSCHWASSER|KIRSCHWASSER|GLENMORANGIE|GLENDRONACH|GLENFARCLAS/i, cat: 'Spirits', type: 'Scotch Whisky' },
    { re: /JAMESON|BUSHMILLS|TULLAMORE|JAMESONS|POWERS GOLD|REDBREAST|GREEN SPOT|TEELING/i, cat: 'Spirits', type: 'Irish Whiskey' },
    { re: /JACK DANIEL|GEORGE DICKEL/i, cat: 'Spirits', type: 'Tennessee Whiskey' },
    { re: /MAKER'S MARK|MAKERS MARK|JIM BEAM|WILD TURKEY|KNOB CREEK|BUFFALO TRACE|FOUR ROSES|WOODFORD|BULLEIT|ANGEL'S ENVY|ANGELS ENVY|BASIL HAYDEN|EVAN WILLIAMS|ELIJAH CRAIG|PAPPY VAN WINKLE|OLD FORESTER|HENRY MCKENNA|LARCENY|W\.L\. WELLER|WELLER|BAKERS BOURBON/i, cat: 'Spirits', type: 'Bourbon' },
    { re: /SEAGRAM'S|SEAGRAMS|CROWN ROYAL|CANADIAN CLUB|BLACK VELVET|SOUTHERN COMFORT|FIREBALL/i, cat: 'Spirits', type: 'Whiskey' },
    { re: /RYE WHISKEY|RYE WHISKE|\bRYE\b.*WHISKEY|SAZERAC RYE|HIGH PLAINS RYE|STELLUM RYE|HEMINGWAY RYE|E\.H\. TAYLOR|EH TAYLOR|WHISTLEPIG|PIGGY BACK|YUKON JACK/i, cat: 'Spirits', type: 'Rye Whiskey' },
    { re: /GREY GOOSE|ABSOLUT|SMIRNOFF|KETEL ONE|TITO'S|TITOS|BELVEDERE|CIROC|STOLICHNAYA|STOLI|SKYY|PINNACLE|BURNETT|POPOV|BARTON|SVEDKA|FINLANDIA|BRAND VODKA|LUKSUSOWA|CHOPIN|BORU VODKA|PUTINKA|ZELIKOV|SOBIESKI|HANGAR 1|ULTRAMARINO/i, cat: 'Spirits', type: 'Vodka' },
    { re: /HENDRICKS|TANQUERAY|BOMBAY SAPPHIRE|BEEFEATER|GORDON'S|GORDONS GIN|AVIATION GIN|BOTANIST|ROKU GIN|NOLETS|JUNIPERO|HAYMAN|CITADELLE/i, cat: 'Spirits', type: 'Gin' },
    { re: /HENNESSY|REMY MARTIN|COURVOISIER|MARTELL|CAMUS COGNAC|DELAMAIN|HINE COGNAC|DUSSE|DUSS[EÉ]|SOLIGNAC|CONJURE|RASTIGNAC|NAUD|NYAK/i, cat: 'Spirits', type: 'Cognac' },
    { re: /KORBEL BRANDY|E\. & J\.|E&J BRANDY|CHRISTIAN BROTHERS|PAUL MASSON BRANDY|TORRES BRANDY|METAXA|ASBACH|STOCK BRANDY/i, cat: 'Spirits', type: 'Brandy' },
    { re: /RUMPLEMINZE|RUMPLE MINZE|DEKUYPER|PEPPERMINT SCHNAPPS|PEACH SCHNAPPS|BUTTERSCOTCH|GOLDSCHLAGER|JAGERMEISTER|JAGER|KAMORA|TIA MARIA|AMARETTO|DI AMORE|DISARONNO|BAILEYS|BAILIES|IRISH CREAM|KAHLUA|FRANGELICO|LIMONCELLO|MIDORI|ST GERMAIN|CHAMBORD|COINTREAU|GRAND MARNIER|TRIPLE SEC|SCHNAPPS|KAPALI|COFFEE LIQUEUR|LUXARDO|MARASCHINO/i, cat: 'Liqueurs & Cordials', type: 'Liqueur' },
];

inv.forEach(item => {
    const name = (item.name || '').toUpperCase();
    const size = (item.size || '').toUpperCase();

    // --- DIGITAL FINGERPRINT GENERATION ---
    // Generate a unique digital ID based on ID and Name
    const rawString = `${item.id}|${item.name}`;
    item.fingerprint = crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 16).toUpperCase();
    fingerprintsGenerated++;

    // 0. Non-Alcoholic Isolation (High priority)
    const isExplicitNA = name.includes('NON ALCOHOL') || name.includes('NON ALC') || name.includes('0.0') || name.includes('ZERO ALCOHOL');
    const isSoftDrink = /\bSODA\b|\bWATER\b|\bTONIC\b|\bCLUB SODA\b|\bFOXON\b|\bFEVER TREE\b|\bPOLAND SPRING\b|\bAQUAFINA\b|\bGINGER BEER\b/i.test(name);
    const hasSpiritKeyword = /VODKA|GIN|RUM|WHISKEY|BOURBON|SCOTCH|TEQUILA|LIQUEUR/i.test(name);

    if (isExplicitNA || (isSoftDrink && !name.includes('HARD') && !name.includes('ALC ') && !hasSpiritKeyword)) {
        item.category = 'Non-Alcoholic';
        if (name.includes('BEER') || name.includes('HEINEKEN') || name.includes('IPA') || name.includes('LAGER')) {
            item.liquorType = 'Non-Alcoholic Beer';
        } else if (name.includes('CABERNET') || name.includes('CHARDONNAY') || name.includes('WINE') || name.includes('MERLOT')) {
            item.liquorType = 'Non-Alcoholic Wine';
        } else if (name.includes('SPIRIT') || name.includes('SODA') || name.includes('WATER') || name.includes('TONIC') || name.includes('GINGER BEER')) {
            item.liquorType = 'Non-Alcoholic Beverage';
        } else {
            item.liquorType = 'Non-Alcoholic Beverage';
        }

        // Extract varietals for NA Wine if possible
        if (item.liquorType === 'Non-Alcoholic Wine') {
            if (/CABERNET/i.test(name)) item.subType = 'Cabernet Sauvignon';
            else if (/CHARDONNAY/i.test(name)) item.subType = 'Chardonnay';
            else if (/MERLOT/i.test(name)) item.subType = 'Merlot';
        }

        naFixed++;
        return; // Exit early for NA items
    }

    // 1. Agave → Tequila
    if (item.liquorType === 'Agave Spirits') {
        item.liquorType = 'Tequila';
        agaveFixed++;
    }

    // 2. Brandy/subtype Cognac → Cognac
    if ((item.liquorType === 'Brandy' && item.subType === 'Cognac') ||
        (item.liquorType === 'Brandy' && /COGNAC/i.test(name))) {
        item.liquorType = 'Cognac';
        delete item.subType;
        cognacsFixed++;
    }

    // 3. Malibu Logic
    if (name.includes('MALIBU')) {
        if (/COCKTAIL|SPLASH|MIX|MOJITO|COLADA|PUNCH|4PK|8PK|SELTZER/i.test(name)) {
            item.category = 'Beer, Cider & Seltzers';
            item.liquorType = 'Hard Seltzers / RTDs';
            malibuRTDs++;
        } else {
            item.category = 'Spirits';
            item.liquorType = 'Rum';
            malibuSpirits++;
        }
        return;
    }

    // 4. Spirit Resolution
    if (item.liquorType === 'Spirit') {
        let matched = false;
        for (const rule of BRAND_MAP) {
            if (rule.re.test(name)) {
                item.category = rule.cat;
                item.liquorType = rule.type;
                spiritFixed++;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const isBeerSize = /12\s*OZ|16\s*OZ|24\s*OZ|19\.2\s*OZ|7\s*OZ|5\s*OZ/i.test(size) || /4PK|6PK|8PK|12PK/i.test(name);
            const isRTDName = /MULE|COCKTAIL|GAZOLINA|GASOLINA|POUCHE|MARGARITA MIX|ORGANIC MIX|MIXER/i.test(name);
            const isBeerName = /HARVIESTOUN|FLYING DOG|ABOMINATION|ENGINE OIL|Bitch|IPA\b|LAGER|ALE\b|STOUT|PORTER/i.test(name);

            if (isBeerName) {
                item.category = 'Beer, Cider & Seltzers';
                item.liquorType = 'Beer';
            } else if (isRTDName || (isBeerSize && !/750\s*ML|1\s*L|1\.75\s*L|375\s*ML/i.test(size))) {
                item.category = 'Beer, Cider & Seltzers';
                item.liquorType = 'Hard Seltzers / RTDs';
            } else if (/HAN JAN/i.test(name)) {
                item.category = 'Beer, Cider & Seltzers';
                item.liquorType = 'Sake / Rice Wine';
            } else if (/CURACAO|TRIPLE SEC|COINTREAU|GRAND MARNIER|CHAMBORD|ST GERMAIN|LUXARDO/i.test(name)) {
                item.category = 'Liqueurs & Cordials';
                item.liquorType = 'Liqueur';
            } else if (/CONUNDRUM|RENE BARBIER|IRONSTONE|DOM DE DIONYSOS|BULLY HILL|VILLA JOLANDA/i.test(name)) {
                item.category = 'Wine';
                item.liquorType = 'Red Wine';
            } else if (/ABSENTE|ABSINTHE/i.test(name)) {
                item.category = 'Spirits';
                item.liquorType = 'Absinthe';
            } else if (/CRISPIN/i.test(name)) {
                item.category = 'Beer, Cider & Seltzers';
                item.liquorType = 'Cider';
            } else if (/SANGRIA|PRIMITIVO/i.test(name)) {
                item.category = 'Wine';
                item.liquorType = 'Red Wine';
            } else if (/ARIZONA|REED'S/i.test(name)) {
                item.category = 'Non-Alcoholic';
                item.liquorType = 'Non-Alcoholic Beverage';
            } else if (/ROCK RYE|CANTON GINGER|KIRSCHWASSER/i.test(name)) {
                item.category = 'Spirits';
                item.liquorType = 'Whiskey';
            } else {
                item.category = 'Spirits';
            }
            spiritFixed++;
        }
    }

    // 5. Fortified & Dessert Refinement
    if (item.liquorType === 'Fortified & Dessert' || (item.category === 'Wine' && /PORT|SHERRY|VERMOUTH|MARSALA|SAUTERNES|MADEIRA/i.test(name))) {
        if (item.category === 'Spirits' && /WHISKEY|BOURBON|SCOTCH|RYE/i.test(item.liquorType)) {
            // Leave whiskey as is
        } else {
            item.category = 'Wine';
            if (/PORT|TAWNY|RUBY/i.test(name)) item.liquorType = 'Port';
            else if (/SHERRY|AMONTILLADO|OLOROSO|FINO|HARVEYS/i.test(name)) item.liquorType = 'Sherry';
            else if (/VERMOUTH|MARTINI\s*&\s*ROSSI|M\s*&\s*R\b|ANTICA\s*FORMULA|STOCK\s*DRY|DUBONNET/i.test(name)) item.liquorType = 'Vermouth';
            else if (/MARSALA/i.test(name)) item.liquorType = 'Marsala';
            else if (/SAUTERNES/i.test(name)) item.liquorType = 'Sauternes';
            else if (/MADEIRA/i.test(name)) item.liquorType = 'Madeira';
            else item.liquorType = 'Fortified Wine';
            delete item.subType;
            fortifiedFixed++;
        }
    }

    // 6. Wine Varietal Refinement
    if (item.category === 'Wine' || item.category === 'Champagne') {
        const has = (regex) => regex.test(name);

        // Correct Liquor Type first
        if (has(/VINHO\s*VERDE|WHITE\s*ZINFANDEL|BLUSH/)) item.liquorType = 'White Wine';
        if (has(/CHARDONNAY|CHARD|SAU\s*BLANC|SAUVIGNON\s*BLANC|PINOT\s*GRIGIO|RIESLING|MOSCATO|VIOGNIER|CHENIN|GEWURZ|WHITE/)) {
            if (item.liquorType !== 'Rosé' && item.liquorType !== 'Fortified Wine' && item.liquorType !== 'Sparkling Wine' && !has(/RED/)) {
                item.liquorType = 'White Wine';
            }
        }
        if (has(/CABERNET|CAB\s*SAV|CAB\b|MERLOT|PINOT\s*NOIR|MALBEC|CHIANTI|ZINFANDEL|SHIRAZ|SYRAH|SANGIOVESE|MONTEPULCIANO|LAMBRUSCO|TEMPRANILLO|BORDEAUX|RED/)) {
            if (item.liquorType !== 'Rosé' && item.liquorType !== 'Fortified Wine' && item.liquorType !== 'Sparkling Wine' && !has(/WHITE/)) {
                item.liquorType = 'Red Wine';
            }
        }

        // Populate subType
        if (has(/CABERNET|CAB\s*SAV|CAB\b/)) item.subType = 'Cabernet Sauvignon';
        else if (has(/CHARDONNAY|CHARD\b/)) item.subType = 'Chardonnay';
        else if (has(/PINOT\s*GRIGIO|P\s*GRIGIO/)) item.subType = 'Pinot Grigio';
        else if (has(/PINOT\s*NOIR/)) item.subType = 'Pinot Noir';
        else if (has(/MERLOT/)) item.subType = 'Merlot';
        else if (has(/MALBEC/)) item.subType = 'Malbec';
        else if (has(/CHIANTI/)) item.subType = 'Chianti';
        else if (has(/WHITE\s*ZINFANDEL|ZINFANDEL/)) item.subType = 'Zinfandel';
        else if (has(/SAU\s*BLANC|SAUVIGNON\s*BLANC/)) item.subType = 'Sauvignon Blanc';
        else if (has(/RIESLING/)) item.subType = 'Riesling';
        else if (has(/MOSCATO/)) item.subType = 'Moscato';
        else if (has(/SHIRAZ|SYRAH/)) item.subType = 'Shiraz/Syrah';
        else if (has(/SANGIOVESE/)) item.subType = 'Sangiovese';
        else if (has(/MONTEPULCIANO/)) item.subType = 'Montepulciano';
        else if (has(/LAMBRUSCO/)) item.subType = 'Lambrusco';
        else if (has(/TEMPRANILLO/)) item.subType = 'Tempranillo';
        else if (has(/PROSECCO/)) item.subType = 'Prosecco';
        else if (has(/SAUTERNES/)) item.subType = 'Sauternes';
        else if (has(/BURGUNDY/)) item.subType = 'Burgundy';
        else if (has(/BORDEAUX/)) item.subType = 'Bordeaux';
        else if (has(/CHABLIS/)) item.subType = 'Chablis';
        else if (has(/ROSE|ROSÉ/)) item.subType = 'Rosé';

        wineFixed++;
    }

    // 7. Tobacco & Accessories
    if (size === 'KINGS' || name.includes('CIGARETTE') ||
        /^(MARLBORO|NEWPORT|WINSTON|SALEM|MERIT|SENECA|AMERICAN SPIRIT|KOOL|MISTY|PALL MALL|DOUBLE DIAMOND|CROWNS\s+CIG)/i.test(name)) {
        if (!/WINE|MALBEC|CABERNET|CAMELOT/i.test(name)) {
            item.category = 'Tobacco';
            item.liquorType = size === 'KINGS' ? 'Cigarettes (Kings)' : 'Cigarettes';
            delete item.subType;
            tobaccoFixed++;
        }
    }
    if (size === 'GIFTS' || size === 'MISC') {
        item.category = 'Accessories & Supplies';
        item.liquorType = size === 'GIFTS' ? 'Gift Items' : 'Supplies';
        delete item.subType;
        accessoriesFixed++;
    }
});

console.log('--- RECLASSIFICATION RESULTS ---');
console.log('Fingerprints Generated:', fingerprintsGenerated);
console.log('Agave -> Tequila:', agaveFixed);
console.log('Brandy -> Cognac:', cognacsFixed);
console.log('Malibu Spirits:', malibuSpirits);
console.log('Malibu RTDs:', malibuRTDs);
console.log('Generic Spirits Resolved:', spiritFixed);
console.log('Tobacco Fixed:', tobaccoFixed);
console.log('Accessories Fixed:', accessoriesFixed);
console.log('Fortified Wine Refined:', fortifiedFixed);
console.log('Wine Varietals Refined:', wineFixed);
console.log('Non-Alcoholic Isolated:', naFixed);

fs.writeFileSync(inventoryPath, JSON.stringify(inv, null, 2));
