import crossSpawn from "cross-spawn";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardianAddonReference, terminalHostAddonReference } from "../../../scripts/governance/candidate-evidence.mjs";
import { RELEASE_NATIVE_TARGETS } from "../../../scripts/release/verify-native-artifacts.mjs";
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
      "bin/automatic-update.js",
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
      "dist/foundation/launch-guardian/exit-watcher.js",
      `dist/native/${process.platform}-${process.arch}/process-guardian.node`,
    ]));
    expect(paths.some(path => /addone/i.test(path))).toBe(false);
    expect(paths.some(path => path.startsWith("scripts/") || path.endsWith(".map"))).toBe(false);
    expect(paths).toEqual(expect.arrayContaining([
      "dist/integrations/pi/engine/changelog.js",
      "dist/integrations/pi/engine/resources/changelog.json",
      "dist/features/owned-ui/resources/release-notes.json",
      "dist/integrations/pi/components/upstream/assets/earendil-image.json",
    ]));
  });

  it("packages the deterministic A1 release-note resource", async () => {
    const resource = JSON.parse(await readFile(resolve(extracted.packageRoot, "dist", "features", "owned-ui", "resources", "release-notes.json"), "utf8")) as {
      schema?: unknown; releases?: unknown;
    };
    expect(resource.schema).toBe("a1-release-notes-v1");
    expect(Array.isArray(resource.releases)).toBe(true);
  });

  it("records every packed native process guardian as a loadable addon", () => {
    const manifests = candidate.entries.filter(entry => /^package\/dist\/native\/[^/]+\/manifest\.json$/.test(entry.path));
    expect(manifests.length).toBeGreaterThan(0);
    for (const manifestEntry of manifests) {
      const reference = guardianAddonReference(manifestEntry.path, manifestEntry.content);
      if (!reference) throw new Error(`packed guardian manifest is foreign: ${manifestEntry.path}`);
      const addon = candidate.entries.find(entry => entry.path === reference.addonPath);
      if (!addon) throw new Error(`packed guardian addon is missing: ${reference.addonPath}`);
      expect(reference.addonPath).toMatch(/process-guardian\.node$/u);
    }
    const localPath = `package/dist/native/${process.platform}-${process.arch}/manifest.json`;
    const localManifest = manifests.find(entry => entry.path === localPath);
    if (!localManifest) throw new Error(`packed local guardian manifest is missing: ${localPath}`);
    const local = guardianAddonReference(localManifest.path, localManifest.content);
    if (!local) throw new Error(`packed local guardian manifest is foreign: ${localPath}`);
    expect(readAddonVersion(resolve(extracted.packageRoot, local.addonPath.slice("package/".length)))).toMatchObject({ protocolVersion: 2 });
  });

  // Platform: only the publication package job assembles every platform; a lane that packs its own
  // candidate carries one guardian and no terminal host, so the full set is required only there.
  it("carries a verified terminal-host addon for every platform in a full release candidate", () => {
    const guardians = candidate.entries.filter(entry => /^package\/dist\/native\/[^/]+\/manifest\.json$/.test(entry.path));
    if (guardians.length < RELEASE_NATIVE_TARGETS.length) return;
    for (const { platform, architecture } of RELEASE_NATIVE_TARGETS) {
      const manifestPath = `package/dist/native/${platform}-${architecture}/terminal-host.manifest.json`;
      const manifestEntry = candidate.entries.find(entry => entry.path === manifestPath);
      if (!manifestEntry) throw new Error(`packed terminal host manifest is missing: ${manifestPath}`);
      const reference = terminalHostAddonReference(manifestEntry.path, manifestEntry.content);
      if (!reference) throw new Error(`packed terminal host manifest is foreign: ${manifestPath}`);
      if (!candidate.entries.some(entry => entry.path === reference.addonPath)) throw new Error(`packed terminal host addon is missing: ${reference.addonPath}`);
      const manifest = JSON.parse(manifestEntry.content.toString("utf8")) as { entry: { filename: string }; notices: { filename: string } };
      expect(candidate.entries.some(entry => entry.path === `package/dist/native/${platform}-${architecture}/${manifest.notices.filename}`), manifest.notices.filename).toBe(true);
      expect(candidate.entries.some(entry => entry.path === `package/${manifest.entry.filename}`), manifest.entry.filename).toBe(true);
    }
    const local = RELEASE_NATIVE_TARGETS.find(target => target.platform === process.platform && target.architecture === process.arch);
    if (!local) return;
    const localManifestPath = `package/dist/native/${local.platform}-${local.architecture}/terminal-host.manifest.json`;
    const localManifest = candidate.entries.find(entry => entry.path === localManifestPath);
    if (!localManifest) throw new Error(`packed terminal host manifest is missing: ${localManifestPath}`);
    const localReference = terminalHostAddonReference(localManifest.path, localManifest.content);
    if (!localReference) throw new Error(`packed terminal host manifest is foreign: ${localManifestPath}`);
    const report = readAddonVersion(resolve(extracted.packageRoot, localReference.addonPath.slice("package/".length))) as { generation?: number; features?: { faultInjection?: boolean; residentFixtures?: boolean } };
    expect(report.generation).toBe(1);
    expect(report.features).toEqual({ faultInjection: false, residentFixtures: false });
  });

  it("resolves Pi's lazily loaded OAuth and bedrock modules from the packed startup artifact", async () => {
    const artifact = await readFile(resolve(extracted.packageRoot, "dist", "integrations", "pi", "startup-public.js"), "utf8");
    expect(artifact).not.toMatch(/\bimportOAuthModule\("|\bimportNodeOnlyApi\("/);
    for (const flow of ["anthropic", "openai", "openai-codex", "github-copilot", "openrouter", "kimi-coding", "meta", "xai", "radius"]) {
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
    expect(Object.keys(oauth).sort()).toEqual(["anthropic", "github-copilot", "kimi-coding", "meta", "openai", "openai-codex", "openrouter", "radius", "xai"]);
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

function readAddonVersion(path: string): unknown {
  const probe = crossSpawn.sync(process.execPath, [
    "-e",
    "process.stdout.write(JSON.stringify(require(process.argv[1]).version()));",
    path,
  ], { encoding: "utf8", env: process.env, windowsHide: true });
  if (probe.status !== 0) throw new Error(`packed addon version probe failed: ${probe.stderr}`);
  return JSON.parse(probe.stdout);
}
