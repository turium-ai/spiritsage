import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  // Search for rye
  await page.waitForSelector('input[type="text"]');
  await page.type('input[type="text"]', 'rye');
  await page.waitForTimeout(2000);
  
  const extractCounts = await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Luxury'));
     return btns.map(b => b.textContent);
  });
  console.log("Before click:", extractCounts);
  
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Luxury'));
     if(btns[0]) btns[0].click();
  });
  
  await page.waitForTimeout(1000);
  
  const extractCountsAfter = await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Luxury'));
     return btns.map(b => b.textContent);
  });
  console.log("After click:", extractCountsAfter);
  
  await browser.close();
})();
