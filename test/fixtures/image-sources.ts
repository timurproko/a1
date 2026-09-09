import { deflateSync } from "node:zlib";

// Security: deterministic synthetic pixels exercise large screenshots without storing clipboard content.
export function screenshotPng(width = 2560, height = 1440, noisy = true): Buffer {
  const rows = Buffer.alloc((width * 4 + 1) * height);
  let seed = 0x12345678;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const noise = noisy && y < height * 0.8;
      const line = y % 48 < 3 || (x % 24 < 3 && y % 48 < 30);
      rows[offset] = noise ? seed & 255 : line ? 20 : 255;
      rows[offset + 1] = noise ? (seed >>> 8) & 255 : line ? 20 : 255;
      rows[offset + 2] = noise ? (seed >>> 16) & 255 : line ? 20 : 255;
      rows[offset + 3] = 255;
      // Rationale: a readable digit strip and thin rules give physical review a stable quality reference.
      const glyphY = Math.floor((y - height * 0.85) / 4);
      const glyphX = Math.floor((x % 160) / 4);
      if (glyphY >= 0 && glyphY < 5 && glyphX < 39) {
        const digits = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
        const digit = digits[Math.floor(glyphX / 4)];
        const dark = glyphX % 4 < 3 && digit?.[glyphY * 3 + glyphX % 4] === "1";
        rows[offset] = rows[offset + 1] = rows[offset + 2] = dark ? 0 : 255;
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

export function withPngOrientation(png: Buffer, orientation: number): Buffer {
  const exif = Buffer.alloc(26);
  exif.write("II"); exif.writeUInt16LE(42, 2); exif.writeUInt32LE(8, 4);
  exif.writeUInt16LE(1, 8); exif.writeUInt16LE(274, 10); exif.writeUInt16LE(3, 12);
  exif.writeUInt32LE(1, 14); exif.writeUInt16LE(orientation, 18);
  return Buffer.concat([png.subarray(0, 33), chunk("eXIf", exif), png.subarray(33)]);
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([name, data])) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0, output.length - 4);
  return output;
}
