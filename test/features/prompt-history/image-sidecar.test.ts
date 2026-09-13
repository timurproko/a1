import { mkdtemp, rm, writeFile, chmod, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectImageChipIdentifiers, PromptImageSidecar } from "../../../src/features/prompt-history/image-sidecar.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

async function makeDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "a1-image-sidecar-"));
  cleanup.push(dir);
  return path.join(dir, "images");
}

describe("PromptImageSidecar", () => {
  it("writes, reads, and unlinks a payload keyed by chip identifier", async () => {
    const dir = await makeDir();
    const sidecar = new PromptImageSidecar(dir);
    sidecar.write("ab12cd34ef", { tag: "[📷 screenshot-ab12cd34ef]", data: "aGVsbG8=", mimeType: "image/png", savedAt: "2026-01-01T00:00:00Z" });
    const record = sidecar.read("ab12cd34ef");
    expect(record).toEqual({ tag: "[📷 screenshot-ab12cd34ef]", data: "aGVsbG8=", mimeType: "image/png", savedAt: "2026-01-01T00:00:00Z" });
    expect(sidecar.list()).toEqual(["ab12cd34ef"]);
    sidecar.unlink("ab12cd34ef");
    expect(sidecar.read("ab12cd34ef")).toBeNull();
  });

  it("returns null for a corrupt or malformed payload without throwing", async () => {
    const dir = await makeDir();
    const sidecar = new PromptImageSidecar(dir);
    sidecar.write("aaaaaaaa", { tag: "[📷 screenshot-aaaaaaaa]", data: "aA==", mimeType: "image/png", savedAt: "2026-01-01T00:00:00Z" });
    await writeFile(path.join(dir, "aaaaaaaa.json"), "not-json", "utf8");
    expect(sidecar.read("aaaaaaaa")).toBeNull();
    // Invariant: missing required fields are also treated as unavailable so the recall path silently strips.
    await writeFile(path.join(dir, "bbbbbbbb.json"), JSON.stringify({ tag: "[📷 screenshot-bbbbbbbb]" }), "utf8");
    expect(sidecar.read("bbbbbbbb")).toBeNull();
  });

  it("rejects identifiers that are not lowercase hex bounded to 64 characters", async () => {
    const dir = await makeDir();
    const sidecar = new PromptImageSidecar(dir);
    sidecar.write("NOT-HEX", { tag: "x", data: "a", mimeType: "image/png", savedAt: "t" });
    sidecar.write("a".repeat(65), { tag: "x", data: "a", mimeType: "image/png", savedAt: "t" });
    expect(sidecar.list()).toEqual([]);
  });

  it("sweeps orphans by keeping only referenced identifiers", async () => {
    const dir = await makeDir();
    const sidecar = new PromptImageSidecar(dir);
    for (const id of ["aa", "bb", "cc"]) {
      sidecar.write(id, { tag: `[📷 screenshot-${id}]`, data: "aA==", mimeType: "image/png", savedAt: "t" });
    }
    sidecar.sweep(["aa", "cc"]);
    expect(sidecar.list().sort()).toEqual(["aa", "cc"]);
  });

  it("write / read / unlink tolerate a directory that is missing initially and are idempotent", async () => {
    const dir = await makeDir();
    const sidecar = new PromptImageSidecar(dir);
    expect(existsSync(dir)).toBe(false);
    sidecar.write("dd", { tag: "[📷 screenshot-dd]", data: "aA==", mimeType: "image/png", savedAt: "t" });
    expect(existsSync(dir)).toBe(true);
    // Invariant: second write is idempotent -- file exists and read still succeeds.
    sidecar.write("dd", { tag: "[📷 screenshot-dd]", data: "aA==", mimeType: "image/png", savedAt: "t" });
    expect(sidecar.read("dd")).not.toBeNull();
    sidecar.unlink("dd");
    sidecar.unlink("dd");
    expect(sidecar.read("dd")).toBeNull();
  });

  it("applies owner-restrictive directory permissions on Unix", async () => {
    if (process.platform === "win32") return;
    const dir = await makeDir();
    const sidecar = new PromptImageSidecar(dir);
    sidecar.write("ee", { tag: "[📷 screenshot-ee]", data: "aA==", mimeType: "image/png", savedAt: "t" });
    const dirStat = await stat(dir);
    expect(dirStat.mode & 0o777).toBe(0o700);
    const fileStat = await stat(path.join(dir, "ee.json"));
    expect(fileStat.mode & 0o777).toBe(0o600);
    // Rationale: restore write access so the temp cleanup can remove the tree.
    await chmod(dir, 0o700);
  });
});

describe("collectImageChipIdentifiers", () => {
  it("returns each identifier once in occurrence order", () => {
    expect(collectImageChipIdentifiers("look at [📷 screenshot-abc12] and [📷 screenshot-def34-resized] and [📷 screenshot-abc12]"))
      .toEqual(["abc12", "def34"]);
  });

  it("ignores literal placeholder-looking text that is not a real chip tag", () => {
    expect(collectImageChipIdentifiers("[📷 literal.png] and [📷 screenshot-not-hex]"))
      .toEqual([]);
  });

  it("handles empty input", () => {
    expect(collectImageChipIdentifiers("")).toEqual([]);
  });
});
