export interface PackedTarEntry {
  path: string;
  mode: number;
  size: number;
  type: number;
  headerOffset: number;
  content: Buffer;
}
export function walkTarEntries(archive: Buffer): PackedTarEntry[];
export function writeHeaderMode(archive: Buffer, headerOffset: number, mode: number): void;
export function replaceTarEntryContent(archive: Buffer, entry: PackedTarEntry, content: Buffer): Buffer;
export function entryFingerprint(entry: PackedTarEntry): { path: string; size: number; sha256: string };
export function entryHeaderFingerprint(entry: PackedTarEntry, archive: Buffer): { path: string; size: number; sha256: string; header: string };
