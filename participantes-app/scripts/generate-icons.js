import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#064e3b" stop-opacity="0.5" />
      <stop offset="55%" stop-color="#09090B" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#09090B" stop-opacity="1" />
    </radialGradient>
    <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" fill="url(#bgGlow)" />
  
  <!-- Subtle Outer Border -->
  <rect width="508" height="508" x="2" y="2" fill="none" stroke="#10b981" stroke-opacity="0.25" stroke-width="2" rx="100" />

  <!-- Ambient Glow -->
  <circle cx="256" cy="210" r="130" fill="#10b981" opacity="0.18" />

  <!-- Center Card Emblem -->
  <rect x="136" y="90" width="240" height="240" rx="48" fill="url(#boxGrad)" stroke="#10b981" stroke-opacity="0.3" stroke-width="2.5" />

  <!-- Sparkles Logo Icon -->
  <g transform="translate(181, 135) scale(3.125)" filter="url(#glow)">
    <!-- Main Star -->
    <path
      d="M24 3L27.2 18.2L42.4 21.4L27.2 24.6L24 39.8L20.8 24.6L5.6 21.4L20.8 18.2L24 3Z"
      fill="url(#emblemGrad)"
    />
    <!-- Top-Right Star -->
    <path
      d="M38.5 7L39.8 12.3L45.1 13.6L39.8 14.9L38.5 20.2L37.2 14.9L31.9 13.6L37.2 12.3L38.5 7Z"
      fill="#6ee7b7"
    />
    <!-- Bottom-Left Star -->
    <path
      d="M9.5 28L10.6 33.3L15.9 34.4L10.6 35.5L9.5 40.8L8.4 35.5L3.1 34.4L8.4 33.3L9.5 28Z"
      fill="#6ee7b7"
      opacity="0.9"
    />
  </g>

  <!-- App Typography: VyM-DB -->
  <text
    x="256"
    y="392"
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    font-weight="800"
    font-size="52"
    letter-spacing="2"
    fill="#F4F4F5"
  >
    VyM<tspan fill="#10b981">-DB</tspan>
  </text>

  <text
    x="256"
    y="432"
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    font-weight="600"
    font-size="20"
    letter-spacing="3.5"
    fill="#71717A"
  >
    PARTICIPANTES
  </text>
</svg>`

async function generateIcons() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // 1. Write favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent)
  console.log('✓ favicon.svg saved')

  const svgBuffer = Buffer.from(svgContent)

  // 2. Generate PNG sizes
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'))
  console.log('✓ pwa-192x192.png generated')

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'))
  console.log('✓ pwa-512x512.png generated')

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png generated')

  // 3. Maskable icon (solid background with safe zone padding)
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#09090B" />
    <g transform="translate(64, 64) scale(0.75)">
      ${svgContent.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">', '').replace('</svg>', '')}
    </g>
  </svg>`

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'))
  console.log('✓ pwa-maskable-512x512.png generated')

  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-192x192.png'))
  console.log('✓ pwa-maskable-192x192.png generated')
}

generateIcons().catch(console.error)
