import { chromium } from 'playwright';

export async function scrapeLiveUrl(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    
    const title = await page.title();
    
    // Get visible text, inputs, buttons, etc.
    const pageData = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h1, h2, h3, p, a, button'))
                         .map(el => el.innerText.trim())
                         .filter(t => t.length > 0);
                         
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
                          .map(el => ({
                            type: el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase(),
                            name: el.name || '',
                            placeholder: el.placeholder || ''
                          }));
                          
      return {
        visibleText: Array.from(new Set(texts)).slice(0, 100), // First 100 visible distinct texts
        inputs
      };
    });
    
    return {
      title,
      ...pageData
    };
  } catch (error) {
    return {
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
