import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseNpmPackOutput } from "../../scripts/release/npm-pack-metadata.mjs";

// Provenance: run 35110280471 failed with `SyntaxError: Unexpected token 's', "[startup-pu"...`
// because a build step printed its summary to stdout while a caller parsed npm's JSON there.
describe("build script stdout discipline", () => {
  it("keeps every script in the build chain silent on stdout unless explicitly verbose", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    const chain = [...String(manifest.scripts.build).matchAll(/node (scripts\/[^\s&]+\.mjs)/gu)].map(match => match[1] ?? "");
    expect(chain).toEqual([
      "scripts/pi/build-startup-public.mjs",
      "scripts/development/build-process-guardian.mjs",
      "scripts/release/generate-runtime-payload-inventory.mjs",
    ]);
    const clean = String(manifest.scripts.clean).match(/node (scripts\/[^\s&]+\.mjs)/u)?.[1];
    expect(clean).toBe("scripts/clean.mjs");
    for (const path of [clean ?? "", ...chain]) {
      const source = await readFile(path, "utf8");
      const lines = source.split(/\r?\n/u);
      for (const [index, line] of lines.entries()) {
        expect(line, `${path}:${index + 1} logs to stdout`).not.toMatch(/console\.(?:log|info)\(/u);
        if (/process\.stdout\.write\(/u.test(line)) expect(line, `${path}:${index + 1} writes stdout without a verbose guard`).toMatch(/^\s*if \(verbose\) /u);
      }
    }
  });

  it("names the first non-JSON stdout line when npm pack output is polluted", () => {
    expect(() => parseNpmPackOutput('[startup-public] abc 11235604 bytes from 1898 normalized inputs\n[{"filename":"a.tgz"}]\n'))
      .toThrow(/npm pack stdout is not JSON .*first non-JSON line: \[startup-public\] abc 11235604 bytes/u);
    expect(() => parseNpmPackOutput("")).toThrow(/npm pack stdout is not JSON/u);
    expect(parseNpmPackOutput('[{"filename":"a.tgz"}]\n')).toEqual([{ filename: "a.tgz" }]);
  });
});
