import { RecommendationEngine } from './src/utils/RecommendationEngine.js';
import fs from 'fs';

const inv = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
const engine = new RecommendationEngine(inv);

// Log output of Engine components directly without monkeypatching mapped functions!
const searchStr = "12 year";
const normalizedSearch = searchStr.toLowerCase().replace(/(\d+)\s*(year|years|yr|yrs)/g, '$1yr');
console.log('Search:', searchStr, 'Normalized:', normalizedSearch);

const eligible = inv.filter(i => i.name.toUpperCase().includes('MACALLAN') && i.name.toUpperCase().includes('12YR'));
console.log('Eligible Macallans:', eligible.length);

const res = engine.recommend({ search: searchStr, category: 'All' });
const exactMatches = res.filter(i => i.matchType === 'exact');
console.log('Total exact matches in recommend():', exactMatches.length);

engine.recommend({ search: '12yr', category: 'All' });
