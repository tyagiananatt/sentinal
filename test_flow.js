const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  await page.waitForTimeout(2000);
  
  await page.fill('input[name="url"]', 'https://insider-x-ivory.vercel.app/');
  await page.fill('input[name="github"]', 'https://github.com/tyagiananatt/insiderX');
  
  console.log("Clicking button...");
  await page.click('button[type="submit"]');
  
  console.log("Waiting for network idle...");
  await page.waitForTimeout(10000); // Analyze takes around 9 seconds!
  
  console.log("Current URL after 10s:", page.url());
  await page.screenshot({ path: 'screenshot.png' });
  
  await browser.close();
})();
