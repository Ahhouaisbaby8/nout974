const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const execPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = 'C:\\Users\\Amandine\\nout\\videos-nout';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const animations = [
  { file: 'anim-a-logo-reveal.html', name: 'story-A-logo',  w: 1080, h: 1920, dur: 4500 },
  { file: 'anim-b-teaser-site.html', name: 'story-B-site',  w: 1080, h: 1920, dur: 5000 },
  { file: 'anim-c-texte.html',       name: 'story-C-texte', w: 1080, h: 1920, dur: 5500 },
  { file: 'post-a-logo-reveal.html', name: 'post-A-logo',   w: 1080, h: 1080, dur: 4500 },
  { file: 'post-b-teaser-site.html', name: 'post-B-site',   w: 1080, h: 1080, dur: 5000 },
  { file: 'post-c-texte.html',       name: 'post-C-texte',  w: 1080, h: 1080, dur: 5500 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: execPath, headless: true });

  for (const anim of animations) {
    console.log(`⏳ Enregistrement ${anim.name}...`);
    const context = await browser.newContext({
      viewport: { width: anim.w, height: anim.h },
      recordVideo: { dir: outDir, size: { width: anim.w, height: anim.h } }
    });
    const page = await context.newPage();
    await page.goto(`file:///C:/Users/Amandine/nout/${anim.file}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800); // attendre chargement police
    await page.waitForTimeout(anim.dur);
    const videoPath = await page.video().path();
    await context.close();
    const dest = path.join(outDir, `${anim.name}.webm`);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(videoPath, dest);
    console.log(`✅ ${anim.name}.webm`);
  }

  await browser.close();
  console.log(`\n🎬 6 vidéos prêtes dans :\n   ${outDir}`);
})();
