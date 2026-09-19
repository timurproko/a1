import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectPiPublicApi, diffPublicApi, PUBLIC_API_SCHEMA, publicApiReviewItems, summarizeCompileOutput } from "../../scripts/pi/pi-public-api.mjs";

type Surface = { schema: string; packages: { name: string; version: string; entry: string; exports: { name: string; kind: string; hash: string; consumers: string[] }[] }[] };

async function baseline(): Promise<Surface> {
  return JSON.parse(await readFile("config/baselines/pinned-pi-public-api.json", "utf8")) as Surface;
}

describe("pinned Pi public API baseline", () => {
  it("records the package-root export surface of both pinned packages with kinds, hashes, and consumers", async () => {
    const value = await baseline();
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { dependencies: Record<string, string> };
    expect(value.schema).toBe(PUBLIC_API_SCHEMA);
    expect(value.packages.map(pkg => pkg.name)).toEqual(["@earendil-works/pi-coding-agent", "@earendil-works/pi-tui"]);
    for (const pkg of value.packages) {
      expect(pkg.version).toBe(manifest.dependencies[pkg.name]);
      expect(pkg.exports.length).toBeGreaterThan(50);
      for (const record of pkg.exports) {
        expect(record.hash).toMatch(/^[0-9a-f]{64}$/);
        expect(["class", "function", "interface", "type", "const", "enum", "namespace"]).toContain(record.kind);
        for (const consumer of record.consumers) expect(consumer).toMatch(/^src\//);
      }
    }
    const coding = value.packages[0]!.exports;
    expect(coding.find(record => record.name === "SettingsManager")).toMatchObject({ kind: "class" });
    expect(coding.find(record => record.name === "SettingsConfig")?.consumers.length).toBeGreaterThan(0);
    expect(value.packages[1]!.exports.find(record => record.name === "Box")?.consumers).toContain("src/integrations/pi/components/upstream/components/tool-execution.ts");
  });

  it("is what the installed packages and the source tree produce (`--check`)", () => {
    const result = spawnSync(process.execPath, ["scripts/pi/update-pinned-pi-public-api.mjs", "--check"], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Pinned Pi public API is current");
  }, 30_000);

  it("collects the same surface again from the declaration entries", async () => {
    const value = await baseline();
    const collected = await collectPiPublicApi({ packagesRoot: resolve("node_modules"), sourceRoot: resolve("src") }) as Surface;
    expect(diffPublicApi(value, collected)).toEqual({ added: [], removed: [], changed: [] });
  }, 30_000);
});

describe("Pi public API delta", () => {
  const surface = (exports: Record<string, [string, string, string[]?]>): Surface => ({
    schema: PUBLIC_API_SCHEMA,
    packages: [{ name: "@earendil-works/pi-coding-agent", version: "0.85.1", entry: "dist/index.d.ts", exports: Object.entries(exports).map(([name, [kind, hash, consumers]]) => ({ name, kind, hash, consumers: consumers ?? [] })) }],
  });

  it("lists added, removed, and changed exports with the consumers of each removed or changed one", () => {
    const previous = surface({ SettingsConfig: ["interface", "a", ["src/integrations/pi/engine/settings-port.ts"]], ModelSelectorComponent: ["class", "b", ["src/x.ts"]], Unused: ["type", "c"], Same: ["function", "d"] });
    const next = surface({ ModelSelectorComponent: ["class", "b2", ["src/x.ts", "src/y.ts"]], Unused: ["type", "c2"], Same: ["function", "d"], Fresh: ["const", "e"] });
    const delta = diffPublicApi(previous, next);
    expect(delta).toEqual({
      added: [{ package: "@earendil-works/pi-coding-agent", name: "Fresh", kind: "const", consumers: [] }],
      removed: [{ package: "@earendil-works/pi-coding-agent", name: "SettingsConfig", kind: "interface", consumers: ["src/integrations/pi/engine/settings-port.ts"] }],
      changed: [
        { package: "@earendil-works/pi-coding-agent", name: "ModelSelectorComponent", kind: "class", consumers: ["src/x.ts", "src/y.ts"] },
        { package: "@earendil-works/pi-coding-agent", name: "Unused", kind: "type", consumers: [] },
      ],
    });
    expect(publicApiReviewItems(delta)).toEqual([
      "public API @earendil-works/pi-coding-agent removed interface SettingsConfig; adopt in src/integrations/pi/engine/settings-port.ts",
      "public API @earendil-works/pi-coding-agent changed class ModelSelectorComponent; adopt in src/x.ts, src/y.ts",
    ]);
  });

  it("summarizes tsc output per file with counts and codes, most errors first", () => {
    const output = [
      "src/app/session-shell/session-shell.ts(12,5): error TS2339: Property 'ThemeBg' does not exist on type 'Theme'.",
      "src\\app\\session-shell\\session-shell.ts(40,9): error TS2339: Property 'ThemeBg' does not exist on type 'Theme'.",
      "src/app/session-shell/session-shell.ts(41,9): error TS2554: Expected 2 arguments, but got 1.",
      "src/integrations/pi/engine/settings-port.ts(3,10): error TS2305: Module has no exported member 'SettingsConfig'.",
      "Found 4 errors in 2 files.",
    ].join("\n");
    expect(summarizeCompileOutput(output)).toEqual([
      { path: "src/app/session-shell/session-shell.ts", errors: 3, codes: ["TS2339", "TS2554"], first: "Property 'ThemeBg' does not exist on type 'Theme'." },
      { path: "src/integrations/pi/engine/settings-port.ts", errors: 1, codes: ["TS2305"], first: "Module has no exported member 'SettingsConfig'." },
    ]);
    expect(summarizeCompileOutput("")).toEqual([]);
  });
});
