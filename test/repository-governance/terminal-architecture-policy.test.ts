import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const policyPath = resolve("scripts/check-architecture.mjs");
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("terminal-core architecture policy", () => {
  it("passes the production tree", () => {
    const result = spawnSync(process.execPath, [policyPath], { encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("Architecture boundaries OK");
  });

  it.each([
    ["src/host-terminal/legacy.ts", "export const legacy = true;", "retired terminal module remains"],
    ["src/terminal/core.ts", "if (profile.executable.includes('pi')) route();", "executable or argument inspection"],
    ["src/terminal/core.ts", "if (profile.arguments.includes('--special')) route();", "executable or argument inspection"],
    ["src/terminal/core.ts", "if (output.includes('READY')) repaint();", "visible-content rendering branch"],
    ["src/terminal/core.ts", "const quiescenceTimer = 32;", "cadence-derived frame inference"],
    ["src/terminal/core.ts", "function parseTerminalQuery(bytes) { return bytes; }", "custom terminal mode/query parser"],
    ["src/terminal/core.ts", "function encodeKittyKey(key) { return key; }", "custom input encoder"],
  ])("rejects %s: %s", async (path, source, diagnostic) => {
    const root = await fixture({ [path]: source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it.each([
    ["import pty from 'node-pty';", "PTY or terminal emulator dependency"],
    ["process.stdin.on('data', bytes => relay(bytes));", "terminal input/output read or relay"],
    ["SetConsoleMode(handle, mode);", "terminal input or mode mediation"],
    ["render(framebuffer);", "terminal parsing or display reconstruction"],
  ])("rejects transparent interception: %s", async (source, diagnostic) => {
    const root = await fixture({ "src/foundation/transparent-terminal/forbidden.ts": source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("requires native transparent launchers to inherit handles without a shell", async () => {
    const root = await fixture({ "src/foundation/transparent-terminal/native-launcher.ts": "export function launch() { return spawn('tool'); }" });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must inherit physical standard handles");
    expect(result.stderr).toContain("must disable shell execution");
  });

  it.each([
    ["src/orphan.ts", "export {};", "production source has no declared owner"],
    ["src/utils/helper.ts", "export {};", "generic source dumping-ground directory"],
    ["src/foundation/release/cache/state.json", "{}", "generated or runtime state"],
    ["src/features/launch/package-lock.json", "{}", "nested package manifest or lockfile"],
    ["test/unknown/contract.test.ts", "export {};", "test has no declared owner"],
    ["docs/current.md", "Temporary during the redesign.", "stale redesign marker"],
  ])("rejects repository ownership violation in %s", async (path, source, diagnostic) => {
    const root = await fixture({ [path]: source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("rejects cross-owner private imports through the containing architecture gate", async () => {
    const root = await fixture({
      "src/cli/dispatch.ts": "import { value } from '../features/launch/private.js'; export { value };",
      "src/features/launch/private.ts": "export const value = true;",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must use src/features/launch/index.ts");
  });

  it("rejects obsolete retired-pipeline release gates", async () => {
    const root = await fixture({ "scripts/run-release-gates.mjs": "const suite = 'test/scenarios/packaged-real-pi.test.ts';" });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("obsolete retired-pipeline release gate");
  });

  it("rejects restoring the obsolete next publication freeze", async () => {
    const root = await fixture({ "scripts/publish-next.ts": "throw new Error('terminal preview publication is frozen until transparent capability certification completes');" });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("obsolete uncertified-preview publication freeze");
  });

  it("rejects next publication evidence that can imply stable eligibility", async () => {
    const root = await fixture({
      "scripts/publish-next.ts": "const certificationStatus = 'uncertified-development-preview'; const physicalHostCertification = 'deferred'; const stableReleaseEligible = true;",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("uncertified next evidence must prohibit stable release eligibility");
  });

  it("requires exact manual acceptance in the uncertified next workflow", async () => {
    const root = await fixture({
      "scripts/publish-next.ts": "createUncertifiedDevelopmentPreviewEvidence({ stableReleaseEligible: false }); if (value.stableReleaseEligible !== false) throw new Error();",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("uncertified next publication must require exact manual acceptance");
  });
});

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "addone-architecture-policy-"));
  roots.push(root);
  await writeFixtureFile(root, "package.json", JSON.stringify({ name: "fixture", scripts: {} }));
  await writeFixtureFile(root, "src/foundation/lifecycle/index.ts", "export {};\n");
  for (const [path, source] of Object.entries(files)) await writeFixtureFile(root, path, source);
  return root;
}

async function writeFixtureFile(root: string, path: string, source: string): Promise<void> {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source);
}

function runPolicy(root: string) {
  return spawnSync(process.execPath, [policyPath, "--root", root], { encoding: "utf8" });
}
