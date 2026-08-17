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

  it.each([
    ["import pty from 'node-pty';", "terminal PTY ownership"],
    ["const terminalBytes = Buffer.alloc(0);", "terminal text or screen interpretation"],
    ["render(framebuffer);", "terminal text or screen interpretation"],
  ])("rejects structured-runtime terminal inference: %s", async (source, diagnostic) => {
    const root = await fixture({ "src/foundation/structured-agent-runtime/forbidden.ts": source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it.each([
    ["src/features/owned-ui/root.ts", "import { createAgentSessionRuntime } from '@earendil-works/pi-coding-agent'; export { createAgentSessionRuntime };", "outside the owned Pi adapter boundary"],
    ["src/features/owned-ui/root.ts", "InteractiveMode.prototype.render = patched;", "stock Pi interactive prototype mutation"],
    ["src/foundation/pi-engine-adapter/private-state.ts", "const previousLines = readPrivateState();", "private Pi renderer-state inspection"],
    ["src/foundation/pi-tui-runtime-adapter/private-state.ts", "const previousViewportTop = readPrivateState();", "private Pi renderer-state inspection"],
    ["src/foundation/pi-engine-adapter/profile.ts", "const distributionHash = verifyDistribution();", "distribution-hash gating"],
    ["src/features/owned-ui/root.ts", "import { Editor } from '@oh-my-pi/pi-tui'; export { Editor };", "oh-my-pi fork package import"],
    ["src/features/owned-ui/root.ts", "import { sleep } from 'bun'; export { sleep };", "Bun-only dependency"],
    ["src/features/owned-ui/root.ts", "import { InteractiveMode } from '@earendil-works/pi-coding-agent/dist/modes/index.js'; export { InteractiveMode };", "private Pi distribution import"],
    ["src/features/owned-ui/root.ts", "const api: ExtensionUIContext = host;", "stock Pi extension UI context"],
    ["src/features/owned-ui/root.ts", "import { nativeHostCommandResult } from '../../foundation/native-host-protocol/index.js'; export { nativeHostCommandResult };", "terminal-host coupling"],
  ])("rejects owned-UI boundary violation in %s: %s", async (path, source, diagnostic) => {
    const root = await fixture({ [path]: source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("allows public Pi SDK and UI imports only inside their adapters", async () => {
    const root = await fixture({
      "src/foundation/pi-engine-adapter/sdk.ts": "import { createAgentSessionRuntime } from '@earendil-works/pi-coding-agent'; export { createAgentSessionRuntime };",
      "src/foundation/pi-component-adapter/component.ts": "import { CustomEditor } from '@earendil-works/pi-coding-agent'; import { Component } from '@earendil-works/pi-tui'; export { CustomEditor, Component };",
      "src/foundation/pi-tui-runtime-adapter/runtime.ts": "import { TuiAltScreen } from '@earendil-works/pi-tui'; export { TuiAltScreen };",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Architecture boundaries OK");
  });

  it("rejects public Pi TUI imports outside the runtime and component adapters", async () => {
    const root = await fixture({
      "src/features/owned-ui/forbidden.ts": "import { TuiAltScreen } from '@earendil-works/pi-tui'; export { TuiAltScreen };",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("outside the runtime or component adapter boundary");
  });

  it.each([
    ["const ptyBytes = Buffer.alloc(0);", "terminal byte, input, or rendered-cell transport"],
    ["send(renderedCells);", "terminal byte, input, or rendered-cell transport"],
    ["import { spawn } from 'node:child_process';", "native host process ownership"],
    ["import pty from 'node-pty';", "terminal byte, input, or rendered-cell transport"],
  ])("rejects native-host hot-path transport: %s", async (source, diagnostic) => {
    const root = await fixture({ "src/foundation/native-host-protocol/forbidden.ts": source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("rejects composed and owned-UI infrastructure from explicit launch profiles", async () => {
    const root = await fixture({
      "src/features/launch/forbidden.ts": "import { runOwnedUiDevelopmentMode } from '../owned-ui/index.js'; export { runOwnedUiDevelopmentMode };",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("launch may not import owned-ui");
  });

  it("rejects a replacement lightweight terminal parser or renderer in native sources", async () => {
    const root = await fixture({ "native/windows/parser.ts": "class LightweightTerminalParser {}" });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("new lightweight terminal parser or renderer");
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

  it("rejects owned-shell responsibility modules that import siblings", async () => {
    const root = await fixture(shellModuleFixture({
      "shell-editor-autocomplete.ts": "import './shell-selectors-dialogs.js';\nexport {};\n",
    }));
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("responsibility modules may depend only on shell-shared-facade");
  });

  it("rejects reintroduced owned-shell monoliths", async () => {
    const root = await fixture(shellModuleFixture({
      "shell-presenters-transcript.ts": `${"export {};\n".repeat(551)}`,
    }));
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exceeds 550 lines");
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

function shellModuleFixture(overrides: Readonly<Record<string, string>> = {}): Record<string, string> {
  const prefix = "src/foundation/pi-component-adapter/";
  const modules = [
    "shell-shared-facade.ts",
    "shell-editor-autocomplete.ts",
    "shell-selectors-dialogs.ts",
    "shell-presenters-transcript.ts",
    "shell-footer-status.ts",
    "shell-extension-ui.ts",
  ];
  return Object.fromEntries([
    [`${prefix}shell-components.ts`, modules.map(module => `export * from \"./${module.replace(/\.ts$/, ".js")}\";`).join("\n")],
    ...modules.map(module => [`${prefix}${module}`, overrides[module] ?? "export {};\n"]),
  ]);
}

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
