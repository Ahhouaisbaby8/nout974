const { chromium } = require('playwright-core');
(async () => {
  const execPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({ executablePath: execPath, headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await page.goto('file:///C:/Users/Amandine/nout/preview-corrections.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-preview-corrections.png', fullPage: false });
  await browser.close();
  console.log('done');
})();
