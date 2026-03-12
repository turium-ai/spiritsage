# Recommendation Engine Documentation

This document explains the architecture and logic of the SpiritSage recommendation engine.

## 1. Logic Location

The core recommendation logic is split into two parts:

### Filtering Logic
- **File**: [`src/components/Recommendations.jsx`](file:///home/turium/.gemini/antigravity/scratch/liquor-rec-app/src/components/Recommendations.jsx)
- **Mechanism**: A strict `AND` filter applied to the inventory.
- **Criteria**:
    1. **Category**: (Beer, Wine, or Spirit). "Spirits" includes sub-categories like Whisky, Gin, Tequila, Vodka, and Spirit.
    2. **Style (Flavor Palette)**: Mapped from the user's quiz selection (e.g., "Bold", "Crisp", "Smoky", "Fruity").

### Data Storage
- **File**: [`src/data/liquors.js`](file:///home/turium/.gemini/antigravity/scratch/liquor-rec-app/src/data/liquors.js)
- **Structure**: An array of 82 liquor objects, each tagged with `category`, `style`, `flavorProfile`, and `occasion`.

---

## 2. Discovery Quiz Mapping

The quiz in [`Onboarding.jsx`](file:///home/turium/.gemini/antigravity/scratch/liquor-rec-app/src/components/Onboarding.jsx) uses dynamic labels to make the experience more intuitive, but they all map back to four stable internal styles:

| Category | UI Label | Internal style |
| :--- | :--- | :--- |
| **All** | Bold & Intense | `Bold` |
| **All** | Crisp & Refreshing | `Crisp` |
| **All** | Smoky & Peated | `Smoky` |
| **All** | Sweet & Fruity | `Fruity` |
| **Beer** | Hoppy & Robust | `Bold` |
| **Beer** | Light & Crisp | `Crisp` |
| **Beer** | Smoky & Toasted | `Smoky` |
| **Beer** | Tart & Fruity | `Fruity` |
| **Wine** | Full-bodied & Rich | `Bold` |
| **Wine** | Dry & Crisp | `Crisp` |
| **Wine** | Earthy & Mineral | `Smoky` |
| **Wine** | Sweet & Fruity | `Fruity` |
| **Spirit** | Aged & Oaky | `Bold` |
| **Spirit** | Clean & Neutral | `Crisp` |
| **Spirit** | Smoky & Peated | `Smoky` |
| **Spirit** | Sweet & Botanical | `Fruity` |

---

## 3. Inventory Tag Matrix

Below is the complete list of 82 inventory items and their associated recommendation tags.

| Name | Category | internal style | Flavor Profile | Price |
| :--- | :--- | :--- | :--- | :--- |
| Blue Moon Belgian White 12pk 12oz Btl 5.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $22.39 |
| Blue Moon Belgian White Ale 24pk 12oz Btl 5.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $35.39 |
| Bud Light 18pk 12oz Can 4.2% ABV | Beer | Crisp | Light, Refreshing, Crisp | $18.69 |
| Bud Light 24pk 12oz Btl 4.2% ABV | Beer | Crisp | Light, Refreshing, Crisp | $23.19 |
| Budweiser 12pk 12oz Btl 5.0% ABV | Beer | Crisp | Light, Refreshing, Crisp | $21.39 |
| Chimay Blue Trappist Ale | Beer | Bold | Spicy, Toffee, Dark Malt | $14.99 |
| Coors Light 12pk 12oz Btl 4.2% ABV | Beer | Crisp | Light, Refreshing, Crisp | $20.79 |
| Coors Light 24pk 12oz Btl 4.2% ABV | Beer | Crisp | Light, Refreshing, Crisp | $22.39 |
| Coors Light 30pk 12oz Can 4.2% ABV | Beer | Crisp | Light, Refreshing, Crisp | $23.99 |
| Corona Extra 12pk 12oz Btl 4.6% ABV | Beer | Crisp | Light, Refreshing, Crisp | $18.79 |
| Corona Extra 24pk 12oz Btl 4.6% ABV | Beer | Crisp | Light, Refreshing, Crisp | $32.89 |
| Firestone Walker 805 12pk 12oz Btl 4.7% ABV | Beer | Crisp | Light, Refreshing, Crisp | $21.59 |
| Guinness Draught 12pk 11.2oz Btl 4.2% ABV | Beer | Bold | Malty, Toffee, Dark | $18.69 |
| Heineken 12pk 12oz Btl 5.0% ABV | Beer | Crisp | Light, Refreshing, Crisp | $21.39 |
| Kona Big Wave Golden Ale 12pk 12oz Btl 4.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $18.69 |
| Lagunitas IPA 24pk 12oz Btl 6.2% ABV | Beer | Bold | Hoppy, Bitter, Citrus | $35.89 |
| Michelob Ultra 18pk 12oz Btl 4.2% ABV | Beer | Crisp | Light, Refreshing, Crisp | $18.69 |
| Modelo Especial 24pk 12oz Btl 4.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $35.89 |
| Modelo Especial 24pk 12oz Can 4.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $32.79 |
| Modelo Negra 12pk 12oz Btl 5.4% ABV | Beer | Bold | Malty, Toffee, Dark | $20.79 |
| Pacifico 12pk 12oz Btl 4.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $20.79 |
| Pacifico 24pk 12oz Btl 4.4% ABV | Beer | Crisp | Light, Refreshing, Crisp | $32.99 |
| Sierra Nevada Hazy Little Thing IPA 12pk 12oz Can 6.7% ABV | Beer | Bold | Hoppy, Bitter, Citrus | $25.39 |
| Sierra Nevada Pale Ale 24pk 12oz Btl 5.6% ABV | Beer | Bold | Malty, Toffee, Dark | $32.99 |
| Stella Artois 12pk 11.2oz Btl 5.0% ABV | Beer | Crisp | Light, Refreshing, Crisp | $23.09 |
| TRULY Hard Lemonade Variety 12pk 12oz Can 5.0% ABV | Beer | Fruity | Light, Refreshing, Crisp | $22.39 |
| Topo Chico Hard Seltzer Variety Pack 12pk 12oz Can 4.7% ABV | Beer | Crisp | Light, Refreshing, Crisp | $22.39 |
| Twisted Tea Party Pack 12pk 12oz Can 5.0% ABV | Beer | Fruity | Light, Refreshing, Crisp | $21.39 |
| White Claw Hard Seltzer Variety 24pk 12oz Can | Beer | Fruity | Light, Refreshing, Crisp | $46.69 |
| White Claw Seltzer Flavor No. 3 Variety 12pk 12oz Can 5.0% ABV | Beer | Fruity | Light, Refreshing, Crisp | $26.19 |
| White Claw Seltzer Variety #1 12pk 12oz Can 5.0% ABV | Beer | Fruity | Light, Refreshing, Crisp | $25.79 |
| Baileys Original Irish Cream Liqueur 750 mL (34 Proof) | Spirit | Fruity | Creamy, Chocolate, Vanilla | $19.99 |
| Bombay Sapphire Gin 1.75L (94 Proof) | Gin | Crisp | Botanical, Juniper, Herbal | $33.99 |
| Hendrick's Gin | Gin | Crisp | Floral, Cucumber, Refreshing | $40.49 |
| Tanqueray London Dry Gin, 1.75 L (94.6 Proof) | Gin | Bold | Botanical, Juniper, Herbal | $36.99 |
| Aperol Aperitivo Liqueur 750ml (22 Proof) | Spirit | Fruity | Balanced, Classic | $28.99 |
| Cointreau Orange Liqueur Triple Sec 750ml (80 Proof) | Spirit | Crisp | Balanced, Classic | $33.99 |
| Grey Goose Vodka | Spirit | Crisp | Clean, Smooth, almond | $39.49 |
| Hennessy VS Cognac 750ml (80 proof) | Spirit | Fruity | Balanced, Classic | $42.99 |
| Casamigos Blanco Tequila 750ml (80 Proof) | Tequila | Fruity | Agave, Citrus, Clean | $44.99 |
| Casamigos Reposado Tequila 750ml (80 Proof) | Tequila | Bold | Agave, Earthy, Pepper | $46.99 |
| Clase Azul Reposado Tequila 750ml (80 Proof) | Tequila | Bold | Agave, Earthy, Pepper | $159.99 |
| Don Julio 1942 Anejo | Tequila | Bold | Caramel, Vanilla, Oak | $174.99 |
| Don Julio 1942 Anejo Tequila 750ml (80 Proof) | Tequila | Bold | Agave, Earthy, Pepper | $179.99 |
| Don Julio 70 Cristalino Tequila 750ml (80 Proof) | Tequila | Bold | Agave, Earthy, Pepper | $84.99 |
| Don Julio Blanco Tequila 750ml (80 Proof) | Tequila | Fruity | Agave, Citrus, Clean | $42.99 |
| LALO Blanco Tequila 750ml (80 Proof) | Tequila | Crisp | Agave, Citrus, Clean | $42.99 |
| Patron Silver Tequila 750ml (80 Proof) | Tequila | Fruity | Agave, Citrus, Clean | $40.99 |
| Grey Goose Vodka 750ml (80 Proof) | Vodka | Crisp | Clean, Smooth, Neutral | $27.99 |
| Ketel One Vodka 1.75L (80 Proof) | Vodka | Crisp | Clean, Smooth, Neutral | $32.99 |
| Skyy Vodka 1.75L (80 Proof) | Vodka | Crisp | Clean, Smooth, Neutral | $20.99 |
| Tito's Handmade Vodka 1.75L (80 Proof) | Vodka | Crisp | Clean, Smooth, Neutral | $26.99 |
| Tito's Handmade Vodka 750ml (80 Proof) | Vodka | Crisp | Clean, Smooth, Neutral | $17.99 |
| Bulleit Bourbon Whiskey 1.75 L (90 Proof) | Whisky | Bold | Caramel, Spice, Oak | $51.99 |
| Bulleit Bourbon Whiskey 750ml (90 Proof) | Whisky | Bold | Caramel, Spice, Oak | $26.99 |
| Jack Daniel's Old No. 7 Tennessee Whiskey 1.75L (80 Proof) | Whisky | Fruity | Caramel, Spice, Oak | $36.99 |
| Jameson Irish Whiskey 1.75L (80 Proof) | Whisky | Fruity | Caramel, Spice, Oak | $42.99 |
| Jameson Irish Whiskey 750ml (80 proof) | Whisky | Fruity | Caramel, Spice, Oak | $22.99 |
| Lagavulin 16 Year Old | Whisky | Smoky | Smoky, Peat, Sea Salt | $112.99 |
| Macallan Double Cask 12 Yr | Whisky | Bold | Rich, Honey, Dried Fruit | $103.49 |
| Maker's Mark Bourbon 750ml (90 Proof) | Whisky | Fruity | Caramel, Spice, Oak | $24.99 |
| Cote des Roses Provence | Wine | Fruity | Summer Fruits, Floral, Dry | $18.29 |
| Cuvee 89 Brut 750ml | Wine | Fruity | Fruity, Floral, Sweet | $19.99 |
| Cuvee 89 Sparkling Rose 750ml | Wine | Fruity | Fruity, Floral, Sweet | $19.99 |
| Daou Vineyards Cabernet Sauvignon 750ml | Wine | Crisp | Crisp, Citrus, Mineral | $27.59 |
| Dolce Vita Italy Sparkling Prosecco 750ml | Wine | Fruity | Fruity, Floral, Sweet | $39.49 |
| Donovan-Parke Cabernet Sauvignon 750ml | Wine | Fruity | Fruity, Floral, Sweet | $18.49 |
| Donovan-Parke Chardonnay 750ml | Wine | Fruity | Fruity, Floral, Sweet | $18.49 |
| Donovan-Parke Pinot Noir 750ml | Wine | Crisp | Crisp, Citrus, Mineral | $17.49 |
| Encore Cabernet Sauvignon 750ml | Wine | Fruity | Fruity, Floral, Sweet | $19.49 |
| Encore Monterey Pinot Noir 750ml | Wine | Smoky | Crisp, Citrus, Mineral | $21.99 |
| Francis Coppola Director's Central Coast Chardonnay 750ml | Wine | Fruity | Fruity, Floral, Sweet | $17.99 |
| Josh Cellars Cabernet Sauvignon 750ml | Wine | Crisp | Crisp, Citrus, Mineral | $16.99 |
| Kendall Jackson Vintners Reserve Chardonnay 750ml | Wine | Fruity | Fruity, Floral, Sweet | $15.99 |
| Kim Crawford Sauvignon Blanc 750ml | Wine | Crisp | Crisp, Citrus, Mineral | $20.49 |
| La Marca Prosecco 750ml | Wine | Fruity | Fruity, Floral, Sweet | $19.49 |
| Navigator Napa Valley Cabernet Sauvignon 750ml | Wine | Fruity | Fruity, Floral, Sweet | $24.99 |
| Rombauer Chardonnay 750ml | Wine | Fruity | Fruity, Floral, Sweet | $45.29 |
| Tributus Paso Robles Cabernet Sauvignon 750ml | Wine | Fruity | Fruity, Floral, Sweet | $28.49 |
| Unruly Cabernet Sauvignon 750ml | Wine | Fruity | Fruity, Floral, Sweet | $11.99 |
| Unruly Chardonnay 750ml | Wine | Bold | Dark Fruit, Tannin, Rich | $11.99 |
| Unruly Dark Red 750ml | Wine | Fruity | Fruity, Floral, Sweet | $15.49 |
| Unruly Pinot Grigio 750ml | Wine | Fruity | Fruity, Floral, Sweet | $11.99 |
| Unruly Rampant Black Cabernet Sauvignon 750ml | Wine | Bold | Dark Fruit, Tannin, Rich | $19.95 |
| Unruly Red Blend 750ml | Wine | Fruity | Fruity, Floral, Sweet | $11.99 |
| Unruly Sauvignon Blanc 750ml | Wine | Fruity | Fruity, Floral, Sweet | $11.99 |
| Veuve Clicquot Yellow Label | Wine | Fruity | Fruity, Brioche, Elegant | $69.99 |
| Veuve Clicquot Yellow Label Brut Champagne 750ml | Wine | Crisp | Crisp, Citrus, Mineral | $72.29 |
