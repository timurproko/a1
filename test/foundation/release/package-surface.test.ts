import crossSpawn from "cross-spawn";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardianBinaryReference } from "../../../scripts/governance/candidate-evidence.mjs";
import { extractValidationCandidate, loadValidationCandidate } from "./package-candidate-fixture.js";

let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;
let extracted: Awaited<ReturnType<typeof extractValidationCandidate>>;

// Performance: extracting the ~1,900-file candidate on a GitHub Windows runner has taken between 3 s
// and over 10 s; the bound matches the per-test timeout CI already grants rather than the 10 s hook default.
beforeAll(async () => {
  candidate = await loadValidationCandidate();
  extracted = await extractValidationCandidate(candidate.bytes);
}, 30_000);

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
      "bin/activate.js",
      "bin/cli.js",
      "bin/release-cleanup.js",
      "bin/guardian.js",
      "bin/ui.js",
      "bin/supervisor.js", "bin/update-recovery.js", "bin/warmup.js", "bin/sync-pi-tui-proxy.js", "dist/runtime-payload-inventory.json",
      "dist/product-identity.js",
      "dist/product-identity.json",
      "dist/product-identity.d.ts",
      "dist/integrations/pi/engine/public-main-entry.js",
      "dist/integrations/pi/startup-public.js",
      "dist/integrations/pi/startup-public.manifest.json",
      "dist/foundation/startup/startup-descriptor.js",
      `dist/native/${process.platform}-${process.arch}/manifest.json`,
      `dist/native/${process.platform}-${process.arch}/${process.platform === "win32" ? "process-guardian.exe" : "process-guardian"}`,
    ]));
    expect(paths.some(path => /addone/i.test(path))).toBe(false);
    expect(paths.some(path => path.startsWith("scripts/") || path.endsWith(".map"))).toBe(false);
    expect(paths).toEqual(expect.arrayContaining([
      "dist/integrations/pi/engine/changelog.js",
      "dist/integrations/pi/engine/resources/changelog.json",
      "dist/integrations/pi/components/upstream/assets/earendil-image.json",
    ]));
  });

  it("records every packed native process guardian as executable", () => {
    const manifests = candidate.entries.filter(entry => /^package\/dist\/native\/[^/]+\/manifest\.json$/.test(entry.path));
    expect(manifests.length).toBeGreaterThan(0);
    for (const manifestEntry of manifests) {
      const reference = guardianBinaryReference(manifestEntry.path, manifestEntry.content);
      if (!reference) throw new Error(`packed guardian manifest is foreign: ${manifestEntry.path}`);
      const binary = candidate.entries.find(entry => entry.path === reference.binaryPath);
      if (!binary) throw new Error(`packed guardian binary is missing: ${reference.binaryPath}`);
      expect(binary.mode & 0o111, `${reference.binaryPath} packed with mode ${binary.mode.toString(8)}`).not.toBe(0);
    }
  });

  it("resolves Pi's lazily loaded OAuth and bedrock modules from the packed startup artifact", async () => {
    const artifact = await readFile(resolve(extracted.packageRoot, "dist", "integrations", "pi", "startup-public.js"), "utf8");
    expect(artifact).not.toMatch(/\bimportOAuthModule\("|\bimportNodeOnlyApi\("/);
    for (const flow of ["anthropic", "openai-codex", "github-copilot", "openrouter", "kimi-coding", "meta", "xai", "radius"]) {
      expect(artifact, flow).not.toContain(`"./${flow}.ts"`);
    }
    expect(artifact).toContain('__piResolve("@earendil-works/pi-ai/api/bedrock-converse-stream")');
  });

  it("derives OAuth auth and loads the bedrock API through the packed startup artifact", () => {
    const probe = crossSpawn.sync(process.execPath, [resolve(import.meta.dirname, "startup-artifact-lazy-probe.mjs"), extracted.packageRoot], {
      cwd: extracted.root, encoding: "utf8", env: process.env, windowsHide: true,
    });
    expect(probe.status, probe.stderr).toBe(0);
    const { oauth, bedrock } = JSON.parse(probe.stdout) as {
      oauth: Record<string, { source?: string; derived?: boolean; error?: string }>;
      bedrock: { api?: string; events: string[]; error?: string };
    };
    expect(Object.keys(oauth).sort()).toEqual(["anthropic", "github-copilot", "kimi-coding", "meta", "openai-codex", "openrouter", "radius", "xai"]);
    for (const [providerId, result] of Object.entries(oauth)) {
      expect(result, providerId).toEqual({ source: "OAuth", derived: true });
    }
    expect(bedrock.api).toBe("bedrock-converse-stream");
    expect(bedrock.events).toEqual(["error"]);
    expect(bedrock.error).not.toMatch(/Cannot find module/);
    expect(bedrock.error).toMatch(/abort/i);
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
