const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));

  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:3000/project/cmt45k4lc0008kznkhxv0xb0b');
  
  await page.waitForTimeout(5000);
  
  console.log("Taking screenshot of dashboard...");
  await page.screenshot({ path: 'dashboard.png' });
  
  await browser.close();
})();
