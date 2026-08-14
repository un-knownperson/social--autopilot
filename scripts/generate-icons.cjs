const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createSolidPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 at start of each scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw gradient with rounded squircle
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient color interpolation between #4338ca (67, 56, 202) and #7c3aed (124, 58, 237)
      const gradRatio = (x + y) / (width + height);
      const curR = Math.round(67 + (124 - 67) * gradRatio);
      const curG = Math.round(56 + (58 - 56) * gradRatio);
      const curB = Math.round(202 + (237 - 202) * gradRatio);

      // Rounded mask
      const isInside = (Math.abs(dx) ** 4 + Math.abs(dy) ** 4) < 0.85;

      if (isInside) {
        // Inner symbol highlight
        const isCenter = Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4;
        if (isCenter && (Math.abs(dy - 0.1 * Math.sin(dx * 4)) < 0.08 || Math.abs(dx) < 0.05)) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = curR;
          rawData[pxOffset + 1] = curG;
          rawData[pxOffset + 2] = curB;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        rawData[pxOffset] = 9;
        rawData[pxOffset + 1] = 9;
        rawData[pxOffset + 2] = 11;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 table & calculator
let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(buf) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createSolidPNG(192, 192, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createSolidPNG(512, 512, 79, 70, 229));
console.log('PNG icons created successfully!');
