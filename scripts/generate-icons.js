import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Ensure public directory exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Background with rounded squircle -->
  <rect width="512" height="512" rx="108" fill="url(#grad)" />
  
  <!-- Subtle Grid lines -->
  <g stroke="rgba(255,255,255,0.15)" stroke-width="2">
    <line x1="96" y1="96" x2="416" y2="416" />
    <line x1="416" y1="96" x2="96" y2="416" />
    <line x1="256" y1="64" x2="256" y2="448" />
    <line x1="64" y1="256" x2="448" y2="256" />
    <!-- Concentric rings -->
    <circle cx="256" cy="256" r="60" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
    <circle cx="256" cy="256" r="130" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
    <circle cx="256" cy="256" r="190" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
  </g>

  <!-- Central SGS Spider / Tech Core Icon -->
  <g transform="translate(256, 256)" filter="url(#glow)">
    <!-- Central Hex Core -->
    <polygon points="0,-45 39,-22 39,22 0,45 -39,22 -39,-22" fill="#ffffff" />
    <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#1e3a8a" />
    <circle cx="0" cy="0" r="14" fill="#38bdf8" />

    <!-- Spider Legs / Circuit Grid Links -->
    <!-- Top Left -->
    <path d="M -28,-16 L -75,-60 L -120,-45" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="-120" cy="-45" r="8" fill="#38bdf8" />
    <!-- Top Right -->
    <path d="M 28,-16 L 75,-60 L 120,-45" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="120" cy="-45" r="8" fill="#38bdf8" />
    <!-- Mid-High Left -->
    <path d="M -39,0 L -95,-10 L -140,20" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="-140" cy="20" r="8" fill="#38bdf8" />
    <!-- Mid-High Right -->
    <path d="M 39,0 L 95,-10 L 140,20" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="140" cy="20" r="8" fill="#38bdf8" />
    <!-- Mid-Low Left -->
    <path d="M -39,15 L -90,55 L -125,100" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="-125" cy="100" r="8" fill="#38bdf8" />
    <!-- Mid-Low Right -->
    <path d="M 39,15 L 90,55 L 125,100" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="125" cy="100" r="8" fill="#38bdf8" />
    <!-- Bottom Left -->
    <path d="M -20,38 L -55,95 L -80,145" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="-80" cy="145" r="8" fill="#38bdf8" />
    <!-- Bottom Right -->
    <path d="M 20,38 L 55,95 L 80,145" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="80" cy="145" r="8" fill="#38bdf8" />
  </g>

  <!-- Brand Text SGS -->
  <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="4">SPIDER GRID</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), svgContent);

// Function to generate raw PNG with PNG signature, IHDR, IDAT (deflated), IEND
function generatePng(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  // Create an RGBA buffer
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.44;
  const rInner = width * 0.18;

  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside central circle or legs or border
      let r = bgR, g = bgG, b = bgB, a = 255;
      
      // Rounded corner check for app icon
      const cornerRadius = size * 0.2;
      const rx = Math.abs(x - cx) - (cx - cornerRadius);
      const ry = Math.abs(y - cy) - (cy - cornerRadius);
      if (rx > 0 && ry > 0 && (rx * rx + ry * ry > cornerRadius * cornerRadius)) {
        // Outside squircle
        a = 0;
      }

      if (a > 0) {
        // Spider grid pattern in center
        if (dist <= rInner) {
          // Central white hub
          r = fgR; g = fgG; b = fgB;
        } else if (Math.abs(dist - width * 0.28) < Math.max(2, size * 0.015)) {
          // Grid ring 1
          r = 56; g = 189; b = 248; // Cyan
        } else if (Math.abs(dist - width * 0.38) < Math.max(2, size * 0.015)) {
          // Grid ring 2
          r = 56; g = 189; b = 248;
        } else if (Math.abs(dx) < Math.max(1.5, size * 0.01) || Math.abs(dy) < Math.max(1.5, size * 0.01)) {
          // Cross axes
          r = 147; g = 197; b = 253;
        } else if (Math.abs(dx - dy) < Math.max(2, size * 0.012) && dist < rOuter) {
          // Diagonal 1
          r = 255; g = 255; b = 255;
        } else if (Math.abs(dx + dy) < Math.max(2, size * 0.012) && dist < rOuter) {
          // Diagonal 2
          r = 255; g = 255; b = 255;
        }
      }

      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  // Compress raw data with zlib deflate
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c ^= buf[n];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcBuf = buf.subarray(4, 8 + len);
    buf.writeUInt32BE(crc32(crcBuf), 8 + len);
    return buf;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate required PWA icons
// SGS Blue: #1e3a8a -> (30, 58, 138), White: (255, 255, 255)
const icon192 = generatePng(192, 30, 58, 138, 255, 255, 255);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = generatePng(512, 30, 58, 138, 255, 255, 255);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

// Maskable icon with safe zone
const iconMaskable = generatePng(512, 30, 58, 138, 255, 255, 255);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);

const appleTouchIcon = generatePng(180, 30, 58, 138, 255, 255, 255);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

console.log('PWA icons generated successfully in public/');
