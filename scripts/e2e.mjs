import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
  const browser = await puppeteer.launch({
    headless: "new"
  });
  
  const page = await browser.newPage();
  const logs = [];
  let apiRequest = null;
  let apiResponse = null;

  page.on('request', request => {
    if (request.url().includes('calculator/team')) {
      apiRequest = JSON.parse(request.postData());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('calculator/team')) {
      apiResponse = await response.json();
    }
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/coleccion/nuevo', { waitUntil: 'networkidle0' });

  console.log('Filling form...');
  await page.type('input[name="speciesId"]', 'BULBASAUR');
  await page.type('input[name="nickname"]', 'Bulby Test');
  await page.click('input[name="level"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('input[name="level"]', '30');
  await page.type('input[name="natureId"]', 'Brave');

  console.log('Saving...');
  await page.click('button[type="submit"]');

  await page.waitForNavigation();
  console.log('On collection page.');

  console.log('Navigating back to collection to refresh...');
  await page.goto('http://localhost:5173/coleccion', { waitUntil: 'networkidle0' });

  // Click the pokemon link
  await page.click('a[href^="/coleccion/"]');
  
  console.log('On detail page. Waiting for button...');
  await page.waitForSelector('button:has-text("Calcular producción")', { timeout: 5000 }).catch(() => {});
  
  // Actually we need to click the button by text or class.
  // The button has text "Calcular producción". Let's evaluate.
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const calcBtn = btns.find(b => b.textContent?.includes('Calcular producción'));
    if (calcBtn) calcBtn.click();
  });

  console.log('Clicked calculate, waiting for network...');
  await page.waitForResponse(response => response.url().includes('calculator/team'), { timeout: 10000 });

  // Wait for UI to render
  await new Promise(resolve => setTimeout(resolve, 1000));

  const resultHTML = await page.evaluate(() => {
    const el = document.querySelector('.bg-orange-50')?.parentElement;
    return el ? el.innerText : 'Not found';
  });

  console.log('Done!');
  
  const report = {
    apiRequest,
    apiResponse: apiResponse?.members?.[0]?.produceTotal,
    skillProcs: apiResponse?.members?.[0]?.skillProcs,
    uiResult: resultHTML
  };

  fs.writeFileSync('e2e_report.json', JSON.stringify(report, null, 2));
  
  await browser.close();
}

run().catch(console.error);
