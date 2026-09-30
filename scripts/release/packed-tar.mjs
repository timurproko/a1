import { createHash } from "node:crypto";

// Invariant: shared ustar walking and in-place header rewriting for npm-packed tarballs. Callers
// gunzip first, rewrite the uncompressed archive, then prove the change stayed local.
const HEADER = 512;
const SIZE_FIELD = [124, 136];
const CHECKSUM_FIELD = [148, 156];
const REGULAR_FILE_TYPES = new Set([0, 0x30]);

/** Lists every package entry of an uncompressed archive, verifying each header checksum. */
export function walkTarEntries(archive) {
  const entries = [];
  for (let offset = 0; offset + HEADER <= archive.length;) {
    const header = archive.subarray(offset, offset + HEADER);
    if (header.every(byte => byte === 0)) break;
    verifyHeaderChecksum(header, offset);
    const name = readTarString(header.subarray(0, 100));
    const prefix = readTarString(header.subarray(345, 500));
    const path = prefix ? `${prefix}/${name}` : name;
    if (!path.startsWith("package/") || path.includes("../") || path.includes("\\")) throw new Error(`tarball has unsafe entry path: ${path}`);
    const mode = Number.parseInt(readTarString(header.subarray(100, 108)).trim() || "0", 8);
    const size = Number.parseInt(readTarString(header.subarray(...SIZE_FIELD)).trim() || "0", 8);
    if (!Number.isSafeInteger(mode) || mode < 0 || !Number.isSafeInteger(size) || size < 0) throw new Error(`tarball entry header is invalid: ${path}`);
    const contentStart = offset + HEADER;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length) throw new Error(`tarball entry is truncated: ${path}`);
    entries.push({ path, mode, size, type: header[156], headerOffset: offset, content: archive.subarray(contentStart, contentEnd) });
    offset = contentStart + Math.ceil(size / HEADER) * HEADER;
  }
  return entries;
}

export function writeHeaderMode(archive, headerOffset, mode) {
  archive.write(`${mode.toString(8).padStart(7, "0")}\0`, headerOffset + 100, "ascii");
  writeHeaderChecksum(archive, headerOffset);
}

/**
 * Returns a new archive whose one regular-file entry carries `content`. Only that entry's
 * size field, checksum, data, and padding change; every other byte is copied unchanged.
 */
export function replaceTarEntryContent(archive, entry, content) {
  if (!REGULAR_FILE_TYPES.has(entry.type)) throw new Error(`tarball entry is not a regular file: ${entry.path}`);
  if (content.length > 0o77777777777) throw new Error(`tarball entry content is too large: ${entry.path}`);
  const header = Buffer.from(archive.subarray(entry.headerOffset, entry.headerOffset + HEADER));
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, SIZE_FIELD[0], "ascii");
  writeHeaderChecksum(header, 0);
  const contentStart = entry.headerOffset + HEADER;
  const next = contentStart + Math.ceil(entry.size / HEADER) * HEADER;
  const padding = Buffer.alloc(Math.ceil(content.length / HEADER) * HEADER - content.length);
  return Buffer.concat([archive.subarray(0, entry.headerOffset), header, content, padding, archive.subarray(next)]);
}

export function entryFingerprint(entry) {
  return { path: entry.path, size: entry.size, sha256: createHash("sha256").update(entry.content).digest("hex") };
}

/**
 * Extends the content fingerprint with every header byte except the size and checksum fields,
 * so a changed name, mode, mtime, ownership, or type is visible too.
 */
export function entryHeaderFingerprint(entry, archive) {
  const header = Buffer.from(archive.subarray(entry.headerOffset, entry.headerOffset + HEADER));
  header.fill(0, SIZE_FIELD[0], SIZE_FIELD[1]);
  header.fill(0, CHECKSUM_FIELD[0], CHECKSUM_FIELD[1]);
  return { ...entryFingerprint(entry), header: createHash("sha256").update(header).digest("hex") };
}

function writeHeaderChecksum(archive, headerOffset) {
  archive.fill(0x20, headerOffset + CHECKSUM_FIELD[0], headerOffset + CHECKSUM_FIELD[1]);
  let sum = 0;
  for (let index = 0; index < HEADER; index += 1) sum += archive[headerOffset + index];
  archive.write(`${sum.toString(8).padStart(6, "0")}\0 `, headerOffset + CHECKSUM_FIELD[0], "ascii");
}

function verifyHeaderChecksum(header, offset) {
  const recorded = Number.parseInt(readTarString(header.subarray(...CHECKSUM_FIELD)).trim() || "0", 8);
  let sum = 0;
  for (let index = 0; index < HEADER; index += 1) sum += index >= CHECKSUM_FIELD[0] && index < CHECKSUM_FIELD[1] ? 0x20 : header[index];
  if (sum !== recorded) throw new Error(`tarball header checksum is invalid at offset ${offset}`);
}

function readTarString(buffer) {
  const end = buffer.indexOf(0);
  return buffer.subarray(0, end < 0 ? buffer.length : end).toString("utf8");
}
