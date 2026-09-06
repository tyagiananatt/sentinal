const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000');
  
  console.log("Waiting a bit for hydration...");
  await page.waitForTimeout(1000);
  
  console.log("Filling form...");
  await page.fill('input[name="url"]', 'https://example.com');
  await page.fill('input[name="github"]', 'https://github.com/example/repo');
  
  console.log("Clicking button...");
  await page.click('button[type="submit"]');
  
  console.log("Waiting for network idle...");
  await page.waitForTimeout(5000);
  
  const errorBadge = await page.$('.badge-danger');
  if (errorBadge) {
    const text = await errorBadge.innerText();
    console.log("ERROR BADGE FOUND ON UI:", text);
  } else {
    console.log("No error badge found.");
    console.log("Current URL after 5s:", page.url());
  }
  
  await browser.close();
})();
