const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const execPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = 'C:\\Users\\Amandine\\nout\\videos-nout';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
  const browser = await chromium.launch({ executablePath: execPath, headless: true });

  // ── ÉTAPE 1 : Screenshot de nout.re ──
  console.log('📸 Capture de nout.re...');
  const snapPage = await browser.newPage();
  await snapPage.setViewportSize({ width: 1080, height: 700 });
  await snapPage.goto('https://nout.re', { waitUntil: 'networkidle', timeout: 30000 });
  await snapPage.waitForTimeout(2000);
  await snapPage.screenshot({ path: 'C:\\Users\\Amandine\\nout\\nout-screenshot.png', fullPage: false });
  await snapPage.close();
  console.log('✅ Screenshot sauvegardé');

  // ── ÉTAPE 2 : Lire l'image en base64 ──
  const imgBase64 = fs.readFileSync('C:\\Users\\Amandine\\nout\\nout-screenshot.png').toString('base64');
  const imgSrc = `data:image/png;base64,${imgBase64}`;

  // ── ÉTAPE 3 : Créer le HTML de l'animation ──
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;900&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:1080px; height:1920px; background:#0A0F2C; overflow:hidden; display:flex; align-items:center; justify-content:center; }
canvas { position:absolute; top:0; left:0; }

.content {
  display:flex; flex-direction:column; align-items:center;
  gap:48px; z-index:1; width:100%;
}

/* Logo */
.logo {
  display:flex; flex-direction:column; align-items:center; gap:14px;
  opacity:0; animation:fadeUp 0.8s ease forwards; animation-delay:0.3s;
}
.logo-word { font-family:'Montserrat',sans-serif; font-weight:900; font-size:100px; letter-spacing:0.2em; color:white; line-height:1; }
.logo-sub { display:flex; align-items:center; gap:12px; }
.dot { width:9px; height:9px; border-radius:50%; background:#00C4B4; }
.sub { font-family:'Montserrat',sans-serif; font-weight:600; font-size:15px; letter-spacing:0.32em; color:#00C4B4; text-transform:uppercase; }

/* Écran site réel */
.screen-wrap {
  opacity:0; transform:scale(0.85) translateY(30px);
  animation:scaleIn 1s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay:1.0s;
  padding:0 48px; width:100%;
}
.screen {
  border-radius:24px; overflow:hidden;
  box-shadow:0 50px 120px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.1);
}
.bar {
  background:#1A2340; padding:16px 22px;
  display:flex; align-items:center; gap:10px;
}
.b-dots { display:flex; gap:7px; }
.b-dot { width:13px; height:13px; border-radius:50%; }
.b-dot:nth-child(1){ background:#FF5F57; }
.b-dot:nth-child(2){ background:#FFBD2E; }
.b-dot:nth-child(3){ background:#28C840; }
.b-url { flex:1; background:#0D1630; border-radius:6px; padding:7px 14px; font-family:'Montserrat',sans-serif; font-size:14px; color:#00C4B4; letter-spacing:0.04em; }
.site-img { display:block; width:100%; }

/* Tagline bas */
.tagline {
  display:flex; align-items:center; gap:14px;
  opacity:0; animation:fadeIn 0.7s ease forwards; animation-delay:2.5s;
}
.tagline-txt { font-family:'Montserrat',sans-serif; font-weight:600; font-size:18px; letter-spacing:0.14em; color:rgba(255,255,255,0.4); }
.tagline-txt span { color:#00C4B4; }

@keyframes fadeUp  { to { opacity:1; } }
@keyframes scaleIn { to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes fadeIn  { to { opacity:1; } }
</style>
</head>
<body>
<canvas id="c" width="1080" height="1920"></canvas>
<div class="content">
  <div class="logo">
    <div class="logo-word">NOUT</div>
    <div class="logo-sub"><div class="dot"></div><span class="sub">La Réunion 974</span><div class="dot"></div></div>
  </div>
  <div class="screen-wrap">
    <div class="screen">
      <div class="bar">
        <div class="b-dots"><div class="b-dot"></div><div class="b-dot"></div><div class="b-dot"></div></div>
        <div class="b-url">nout.re</div>
      </div>
      <img class="site-img" src="${imgSrc}">
    </div>
  </div>
  <div class="tagline">
    <div class="dot"></div>
    <span class="tagline-txt">Découvre <span>nout.re</span></span>
    <div class="dot"></div>
  </div>
</div>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
const stars=Array.from({length:100},()=>({x:Math.random()*1080,y:Math.random()*1920,r:Math.random()*1.8+0.3,o:Math.random(),s:Math.random()*0.006+0.002}));
(function draw(){ ctx.clearRect(0,0,1080,1920); stars.forEach(s=>{ s.o+=s.s; if(s.o>1||s.o<0)s.s*=-1; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=\`rgba(255,255,255,\${s.o*0.5})\`; ctx.fill(); }); requestAnimationFrame(draw); })();
</script>
</body>
</html>`;

  const htmlPath = 'C:\\Users\\Amandine\\nout\\anim-site-reel.html';
  fs.writeFileSync(htmlPath, html);
  console.log('✅ HTML animation créé');

  // ── ÉTAPE 4 : Enregistrer la vidéo story ──
  console.log('🎬 Enregistrement story-site-reel...');
  const ctx1 = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } }
  });
  const p1 = await ctx1.newPage();
  await p1.goto(`file:///${htmlPath}`, { waitUntil: 'networkidle' });
  await p1.waitForTimeout(800);
  await p1.waitForTimeout(5000);
  const v1 = await p1.video().path();
  await ctx1.close();
  const dest1 = path.join(outDir, 'story-site-reel.webm');
  if (fs.existsSync(dest1)) fs.unlinkSync(dest1);
  fs.renameSync(v1, dest1);
  console.log('✅ story-site-reel.webm');

  // ── ÉTAPE 5 : Version post 1080x1080 ──
  const htmlPost = html
    .replace('width:1080px; height:1920px;', 'width:1080px; height:1080px;')
    .replace('width="1080" height="1920"', 'width="1080" height="1080"')
    .replace(/1920/g, '1080')
    .replace('.logo-word { font-family:\'Montserrat\',sans-serif; font-weight:900; font-size:100px;', '.logo-word { font-family:\'Montserrat\',sans-serif; font-weight:900; font-size:80px;');

  const htmlPostPath = 'C:\\Users\\Amandine\\nout\\post-site-reel.html';
  fs.writeFileSync(htmlPostPath, htmlPost);

  console.log('🎬 Enregistrement post-site-reel...');
  const ctx2 = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1080, height: 1080 } }
  });
  const p2 = await ctx2.newPage();
  await p2.goto(`file:///${htmlPostPath}`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(800);
  await p2.waitForTimeout(5000);
  const v2 = await p2.video().path();
  await ctx2.close();
  const dest2 = path.join(outDir, 'post-site-reel.webm');
  if (fs.existsSync(dest2)) fs.unlinkSync(dest2);
  fs.renameSync(v2, dest2);
  console.log('✅ post-site-reel.webm');

  await browser.close();
  console.log('\n🎬 Vidéos prêtes dans C:\\Users\\Amandine\\nout\\videos-nout\\');
})();
