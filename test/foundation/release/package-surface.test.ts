import crossSpawn from "cross-spawn";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractValidationCandidate, loadValidationCandidate } from "./package-candidate-fixture.js";

let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;
let extracted: Awaited<ReturnType<typeof extractValidationCandidate>>;

beforeAll(async () => {
  candidate = await loadValidationCandidate();
  extracted = await extractValidationCandidate(candidate.bytes);
});

afterAll(async () => {
  if (extracted?.root) await rm(extracted.root, { recursive: true, force: true });
});

describe("exact packed npm command surface", () => {
  it("contains only the authoritative package and public command surface", () => {
    expect(candidate.manifest).toMatchObject({
      name: "@timurproko/a1",
      bin: { "a1": "bin/cli.js" },
      repository: { type: "git", url: "https://github.com/timurproko/a1" },
    });
    expect(Object.keys(candidate.manifest.bin)).toEqual(["a1"]);
    const paths = candidate.entries.map(entry => entry.path.slice("package/".length));
    expect(paths).toEqual(expect.arrayContaining([
      "package.json",
      "bin/cli.js",
      "bin/guardian.js",
      "bin/ui.js",
      "bin/supervisor.js", "bin/warmup.js", "dist/runtime-payload-inventory.json",
      "dist/product-identity.js",
      "dist/product-identity.json",
      "dist/product-identity.d.ts",
      "dist/integrations/pi/engine/public-main-entry.js",
      `dist/native/${process.platform}-${process.arch}/manifest.json`,
      `dist/native/${process.platform}-${process.arch}/${process.platform === "win32" ? "process-guardian.exe" : "process-guardian"}`,
    ]));
    expect(paths.some(path => /addone/i.test(path))).toBe(false);
    expect(paths.some(path => path.startsWith("scripts/") || path.endsWith(".map"))).toBe(false);
  });

  it("launches the exact packed public entry and a1 shim with repository dependencies", () => {
    const publicEntry = resolve(extracted.packageRoot, "dist", "integrations", "pi", "engine", "public-main-entry.js");
    const oracle = crossSpawn.sync(process.execPath, [publicEntry, "--version"], { cwd: extracted.root, encoding: "utf8", env: process.env, windowsHide: true });
    expect(oracle.status, oracle.stderr).toBe(0);
    expect(oracle.stdout.trim()).toBe(candidate.manifest.dependencies?.["@earendil-works/pi-coding-agent"]);

    const command = crossSpawn.sync(process.execPath, [resolve(extracted.packageRoot, "bin", "cli.js"), "agent"], {
      cwd: extracted.root, encoding: "utf8", env: process.env, windowsHide: true,
    });
    expect(command.status).toBe(0);
    expect(command.stdout).toBe("");
    expect(command.stderr).toBe("");
  });
});
