const { chromium } = require('playwright-core');
const execPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const logoHTML = (bg, textColor, dotColor, subColor, fontSize, tagSize, dotSize, gap, accentGap) => `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;900&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; }
body { background:${bg}; display:flex; align-items:center; justify-content:center; }
.logo { display:flex; flex-direction:column; align-items:center; gap:${gap}px; }
.word { font-family:'Montserrat',sans-serif; font-weight:900; font-size:${fontSize}px; letter-spacing:0.22em; color:${textColor}; line-height:1; }
.accent { display:flex; align-items:center; gap:${accentGap}px; }
.dot { width:${dotSize}px; height:${dotSize}px; border-radius:50%; background:${dotColor}; }
.sub { font-family:'Montserrat',sans-serif; font-weight:600; font-size:${tagSize}px; letter-spacing:0.32em; color:${subColor}; text-transform:uppercase; }
</style></head>
<body><div class="logo">
  <span class="word">NOUT</span>
  <div class="accent"><div class="dot"></div><span class="sub">La Réunion 974</span><div class="dot"></div></div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: execPath, headless: true });

  // 1. Photo de profil — 400x400 carré fond nuit
  {
    const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
    await page.setContent(logoHTML('#0A0F2C', 'white', '#00C4B4', '#00C4B4', 72, 12, 6, 10, 8), { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'logo-nout-profil-400x400.png' });
    await page.close();
    console.log('✅ logo-nout-profil-400x400.png');
  }

  // 2. Post carré — 1080x1080
  {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
    await page.setContent(logoHTML('#0A0F2C', 'white', '#00C4B4', '#00C4B4', 200, 30, 16, 28, 22), { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'logo-nout-post-1080x1080.png' });
    await page.close();
    console.log('✅ logo-nout-post-1080x1080.png');
  }

  // 3. Fond transparent (texte blanc) — 600x300
  {
    const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
    await page.setContent(logoHTML('transparent', 'white', '#00C4B4', '#00C4B4', 100, 16, 8, 14, 12), { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'logo-nout-transparent.png', omitBackground: true });
    await page.close();
    console.log('✅ logo-nout-transparent.png');
  }

  await browser.close();
  console.log('\nTous les logos générés dans C:\\Users\\Amandine\\nout\\');
})();
