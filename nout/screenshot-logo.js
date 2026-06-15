const { chromium } = require('playwright-core');
(async () => {
  const execPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({ executablePath: execPath, headless: true });
  const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
  await page.goto('file:///C:/Users/Amandine/nout/logo-n5-export.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const element = await page.$('#logo');
  await element.screenshot({ path: 'logo-nout-n5.png' });
  await browser.close();
  console.log('done');
})();
