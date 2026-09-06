import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { guardianBinaryReference, readPackedEntries } from "../../scripts/governance/candidate-evidence.mjs";
import { repairNativeExecutableModes } from "../../scripts/release/repair-native-executable-modes.mjs";

const guardianContent = Buffer.from("guardian-binary-bytes");
const guardianDigest = createHash("sha256").update(guardianContent).digest("hex");
const guardianManifest = JSON.stringify({
  schema: "a1-process-guardian-artifact-v1",
  protocolVersion: 1,
  platform: "linux",
  architecture: "x64",
  capability: "supported",
  artifact: { filename: "process-guardian", sha256: guardianDigest, size: guardianContent.length },
});

describe("repairNativeExecutableModes", () => {
  it("restores guardian executability in a tarball packed without posix permissions", () => {
    const tarball = createTarball(0o644);
    const { bytes, repaired } = repairNativeExecutableModes(tarball);
    expect(repaired).toEqual(["package/dist/native/linux-x64/process-guardian"]);
    expect(bytes.equals(tarball)).toBe(false);

    const entries = readPackedEntries(bytes);
    const before = new Map(readPackedEntries(tarball).map(entry => [entry.path, entry] as const));
    expect(entries.map(entry => entry.path)).toEqual([...before.keys()]);
    for (const entry of entries) {
      const original = before.get(entry.path);
      if (!original) throw new Error(`repair introduced a new entry: ${entry.path}`);
      expect(entry.content.equals(original.content)).toBe(true);
      if (entry.path === "package/dist/native/linux-x64/process-guardian") continue;
      expect(entry.mode, entry.path).toBe(original.mode);
    }
    const guardian = entries.find(entry => entry.path === "package/dist/native/linux-x64/process-guardian");
    if (!guardian) throw new Error("repaired tarball lost the guardian entry");
    expect(guardian.mode).toBe(0o755);
  });

  it("returns an already-correct tarball untouched", () => {
    const tarball = createTarball(0o755);
    const { bytes, repaired } = repairNativeExecutableModes(tarball);
    expect(repaired).toEqual([]);
    expect(bytes).toBe(tarball);
  });

  it("refuses to mark bytes executable when they differ from the packed build manifest", () => {
    const manifest = JSON.parse(guardianManifest);
    manifest.artifact.sha256 = "0".repeat(64);
    const tarball = createTarball(0o644, JSON.stringify(manifest));
    expect(() => repairNativeExecutableModes(tarball)).toThrow("differs from its packed build manifest");
  });

  it("refuses a manifest whose binary is missing from the tarball", () => {
    const entries = fixtureEntries(0o644).filter(entry => !entry.path.endsWith("/process-guardian"));
    const tarball = gzipSync(Buffer.concat([...entries.map(entry => tarEntry(entry.path, entry.content, entry.mode)), Buffer.alloc(1024)]));
    expect(() => repairNativeExecutableModes(tarball)).toThrow("declares missing binary");
  });

  it("rejects a tarball with a corrupted header checksum", () => {
    const tarball = createTarball(0o644);
    const archive = Buffer.from(gunzipSync(tarball));
    archive[0] = 0x21;
    expect(() => repairNativeExecutableModes(gzipSync(archive))).toThrow("checksum");
  });

  it("ignores manifests outside the guardian artifact schema", () => {
    expect(guardianBinaryReference("package/dist/native/linux-x64/manifest.json", JSON.stringify({ schema: "foreign" }))).toBeNull();
    const tarball = createTarball(0o644, JSON.stringify({ schema: "foreign" }));
    const { bytes, repaired } = repairNativeExecutableModes(tarball);
    expect(repaired).toEqual([]);
    expect(bytes).toBe(tarball);
  });
});

function fixtureEntries(mode: number, manifest: string = guardianManifest) {
  return [
    { path: "package/package.json", content: Buffer.from(JSON.stringify({ name: "@timurproko/a1", version: "0.1.8-dev.1" })), mode: 0o644 },
    { path: "package/dist/native/linux-x64/manifest.json", content: Buffer.from(manifest), mode },
    { path: "package/dist/native/linux-x64/process-guardian", content: guardianContent, mode },
  ];
}

function createTarball(mode: number, manifest: string = guardianManifest): Buffer {
  return gzipSync(Buffer.concat([...fixtureEntries(mode, manifest).map(entry => tarEntry(entry.path, entry.content, entry.mode)), Buffer.alloc(1024)]));
}

function tarEntry(path: string, content: Buffer, mode: number): Buffer {
  if (path.length > 100) throw new Error("fixture path exceeds the ustar name field");
  const header = Buffer.alloc(512);
  header.write(path, 0, "utf8");
  header.write(`${mode.toString(8).padStart(7, "0")}\0`, 100, "ascii");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header[156] = "0".charCodeAt(0);
  header.write("ustar\0", 257, "ascii");
  header.fill(0x20, 148, 156);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  const padding = Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length);
  return Buffer.concat([header, content, padding]);
}
