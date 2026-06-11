import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')

// --- SVG icône carrée (N + point turquoise) ---
function makeIconSvg(size) {
  const s  = size
  const rx = Math.round(s * 0.18)   // arrondi coins
  const lx = Math.round(s * 0.17)   // barre gauche x
  const bw = Math.round(s * 0.165)  // largeur barre
  const rx2= Math.round(s * 0.665)  // barre droite x
  const ty = Math.round(s * 0.14)   // top y
  const by = Math.round(s * 0.86)   // bottom y
  const bh = by - ty
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${rx}" fill="#0D0D0D"/>
  <rect x="${lx}" y="${ty}" width="${bw}" height="${bh}" fill="white"/>
  <rect x="${rx2}" y="${ty}" width="${bw}" height="${bh}" fill="white"/>
  <polygon points="${lx},${ty} ${lx+bw},${ty} ${rx2+bw},${by} ${rx2},${by}" fill="white"/>
</svg>`
}

// --- SVG og-image 1200×630 ---
function makeOgSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <!-- Fond noir -->
  <rect width="1200" height="630" fill="#0D0D0D"/>

  <!-- Lueur turquoise gauche -->
  <radialGradient id="gl" cx="25%" cy="50%" r="40%">
    <stop offset="0%" stop-color="#48CAE4" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#48CAE4" stop-opacity="0"/>
  </radialGradient>
  <rect width="1200" height="630" fill="url(#gl)"/>

  <!-- Icône N (280×280, centré verticalement à gauche) -->
  <g transform="translate(160,175)">
    <rect width="280" height="280" rx="50" fill="#161616"/>
    <!-- barre gauche -->
    <rect x="48" y="39" width="46" height="202" fill="white"/>
    <!-- barre droite -->
    <rect x="186" y="39" width="46" height="202" fill="white"/>
    <!-- diagonale -->
    <polygon points="48,39 94,39 232,241 186,241" fill="white"/>
    <!-- dot -->
    <circle cx="224" cy="224" r="32" fill="#48CAE4"/>
  </g>

  <!-- Texte NOUT -->
  <text x="600" y="295"
        font-family="'Arial Black',Arial,sans-serif"
        font-size="160"
        font-weight="900"
        text-anchor="middle"
        letter-spacing="-4"
        fill="white">NOUT</text>

  <!-- Sous-titre -->
  <text x="600" y="380"
        font-family="Arial,Helvetica,sans-serif"
        font-size="40"
        font-weight="600"
        text-anchor="middle"
        fill="#48CAE4"
        letter-spacing="6">974</text>

  <!-- Tagline -->
  <text x="600" y="455"
        font-family="Arial,Helvetica,sans-serif"
        font-size="28"
        font-weight="400"
        text-anchor="middle"
        fill="#888888">Le marketplace 100 % réunionnais de seconde main</text>

  <!-- Ligne décorative bas -->
  <rect x="480" y="500" width="240" height="3" rx="2" fill="#48CAE4" opacity="0.4"/>
</svg>`
}

// --- Encodeur ICO minimal (emballe des PNG) ---
function buildIco(pngBuffers) {
  const count      = pngBuffers.length
  const headerSize = 6
  const entrySize  = 16
  const dataOffset = headerSize + count * entrySize
  const totalSize  = dataOffset + pngBuffers.reduce((s, b) => s + b.length, 0)
  const buf        = Buffer.alloc(totalSize)

  buf.writeUInt16LE(0, 0)      // reserved
  buf.writeUInt16LE(1, 2)      // type: 1 = ICO
  buf.writeUInt16LE(count, 4)  // nb images

  let dataPos = dataOffset
  pngBuffers.forEach((png, i) => {
    const w = png.readUInt32BE(16)
    const h = png.readUInt32BE(20)
    const off = headerSize + i * entrySize
    buf.writeUInt8(w >= 256 ? 0 : w, off)
    buf.writeUInt8(h >= 256 ? 0 : h, off + 1)
    buf.writeUInt8(0,  off + 2)
    buf.writeUInt8(0,  off + 3)
    buf.writeUInt16LE(1,  off + 4)
    buf.writeUInt16LE(32, off + 6)
    buf.writeUInt32LE(png.length, off + 8)
    buf.writeUInt32LE(dataPos,    off + 12)
    png.copy(buf, dataPos)
    dataPos += png.length
  })
  return buf
}

// --- Génération ---
async function generate() {
  const sizes = [
    { size: 16,  name: 'favicon-16x16.png' },
    { size: 32,  name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'nout-icon-192.png' },
    { size: 512, name: 'nout-icon-512.png' },
  ]

  for (const { size, name } of sizes) {
    await sharp(Buffer.from(makeIconSvg(size))).png().toFile(join(PUBLIC, name))
    console.log(`✅ ${name}`)
  }

  // OG image
  await sharp(Buffer.from(makeOgSvg())).png().toFile(join(PUBLIC, 'og-image.png'))
  console.log('✅ og-image.png')

  // favicon.ico (16 + 32)
  const [p16, p32] = await Promise.all([
    sharp(Buffer.from(makeIconSvg(16))).png().toBuffer(),
    sharp(Buffer.from(makeIconSvg(32))).png().toBuffer(),
  ])
  writeFileSync(join(PUBLIC, 'favicon.ico'), buildIco([p16, p32]))
  console.log('✅ favicon.ico')

  console.log('\n🎉 Tous les fichiers générés dans public/')
}

generate().catch(err => { console.error(err); process.exit(1) })
