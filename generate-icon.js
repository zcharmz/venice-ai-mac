// Generates Venice AI icon PNG from scratch using Node.js built-ins only
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;

// CRC32 table for PNG chunks
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const body = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(body));
  return Buffer.concat([lenBuf, body, crcBuf]);
}

function createPNG(size, getPixel) {
  const rowBytes = 1 + size * 3; // filter byte + RGB
  const raw = Buffer.alloc(rowBytes * size, 0);

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y, size);
      const off = y * rowBytes + 1 + x * 3;
      raw[off] = r; raw[off+1] = g; raw[off+2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

// Distance from point to line segment (in normalized -1..1 space)
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function getPixel(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const dist = Math.hypot(x - cx, y - cy);
  const radius = size / 2 - size * 0.02;

  // Outer background: very dark navy
  if (dist > radius) return [8, 8, 16];

  const t = dist / radius; // 0=center, 1=edge

  // Base: purple gradient (center bright → edge deep)
  let r = Math.round(130 * (1 - t) + 28 * t);
  let g = Math.round(40  * (1 - t) + 10 * t);
  let b = Math.round(210 * (1 - t) + 75 * t);

  // Subtle inner glow ring near center
  const glow = Math.max(0, 1 - t / 0.35) * 0.25;
  r = Math.min(255, Math.round(r + 90 * glow));
  g = Math.min(255, Math.round(g + 20 * glow));
  b = Math.min(255, Math.round(b + 40 * glow));

  // Render "V" letterform — two strokes in normalized coords
  const vx = (x / size - 0.5) * 2;
  const vy = (y / size - 0.5) * 2;

  const sw = 0.095; // stroke half-width
  const dl = distToSeg(vx, vy, -0.42, -0.40,  0.0, 0.42);
  const dr = distToSeg(vx, vy,  0.42, -0.40,  0.0, 0.42);
  const md = Math.min(dl, dr);

  if (md < sw + 0.01) {
    // Soft anti-aliased edge
    const alpha = Math.max(0, Math.min(1, (sw - md) / 0.01 + 1));
    r = Math.round(r * (1 - alpha) + 245 * alpha);
    g = Math.round(g * (1 - alpha) + 228 * alpha);
    b = Math.round(b * (1 - alpha) + 255 * alpha);
  }

  return [r, g, b];
}

// Build iconset
const iconset = '/tmp/Venice AI.iconset';
if (!fs.existsSync(iconset)) fs.mkdirSync(iconset, { recursive: true });

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const tasks = [];

for (const s of sizes) {
  tasks.push(new Promise((resolve) => {
    const png = createPNG(s, getPixel);
    const name = s === 1024 ? 'icon_512x512@2x.png' : `icon_${s}x${s}.png`;
    fs.writeFile(path.join(iconset, name), png, (err) => {
      if (err) console.error(`Error writing ${name}:`, err);
      else console.log(`  wrote ${name}`);
      resolve();
    });
  }));
  // Also write @2x variants for common sizes
  if ([16, 32, 128, 256].includes(s)) {
    const s2 = s * 2;
    tasks.push(new Promise((resolve) => {
      const png = createPNG(s2, getPixel);
      const name = `icon_${s}x${s}@2x.png`;
      fs.writeFile(path.join(iconset, name), png, (err) => {
        if (err) console.error(`Error writing ${name}:`, err);
        else console.log(`  wrote ${name}`);
        resolve();
      });
    }));
  }
}

Promise.all(tasks).then(() => {
  console.log('All icon sizes generated. Run iconutil to create .icns');
});
