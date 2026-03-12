const fs = require('fs');

async function run() {
    const inventory = JSON.parse(fs.readFileSync('./src/data/inventory.json', 'utf8'));
    
    const macallan = inventory.find(i => i.name.toLowerCase().includes('macallan') && i.name.toLowerCase().includes('12'));
    if (!macallan) {
        console.log("No Macallan 12 found in inventory!");
        return;
    }
    console.log("Macallan Name:", macallan.name);
    console.log("Macallan Type:", macallan.liquorType);
    
    // How does the semantic age filter see it?
    const query = "12 year single malt";
    const queryLower = query.toLowerCase();
    const normalizedQuery = queryLower.replace(/\./g, '').replace(/(\d+)[-\s]*(year|years|yr|yrs|yo)/g, '$1yr');
    const ageMatch = normalizedQuery.match(/\b(\d+yr)\b/);
    console.log("Extracted Age from Query:", ageMatch ? ageMatch[1] : "None");
    
    if (ageMatch) {
         const enforcedAge = ageMatch[1];
         const itemNormalizedStr = `${macallan.liquorType || ''} ${macallan.name || ''}`.toLowerCase().replace(/\./g, '').replace(/(\d+)[-\s]*(year|years|yr|yrs|yo)/g, '$1yr');
         console.log("Macallan Normalized String:", itemNormalizedStr);
         console.log("Does it include enforced age?", itemNormalizedStr.includes(enforcedAge));
    }
}
run();
