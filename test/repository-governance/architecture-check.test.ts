import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const policyPath = resolve("scripts/governance/check-architecture.mjs");
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

// Rationale: these are fixture cases only; CI runs the gate against the real tree as its own step.
describe("architecture gate", () => {
  it("ignores detached agent worktrees and local build outputs", async () => {
    const root = await fixture({
      ".worktrees/task/package.json": "{}",
      ".builds/package/package-lock.json": "{}",
    });
    const result = runPolicy(root);
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  });

  it("allows only the declared installer package authority", async () => {
    const installerManifest = ["packages", "a1-install", "package.json"].join("/");
    const root = await fixture({ [installerManifest]: "{}" });
    const result = runPolicy(root);
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  });

  it.each([
    ["src/orphan.ts", "export {};", "production source has no declared owner"],
    ["src/utils/helper.ts", "export {};", "generic source dumping-ground directory"],
    ["src/foundation/release/cache/state.json", "{}", "generated or runtime state"],
    ["src/features/launch/package-lock.json", "{}", "nested package manifest or lockfile"],
    ["test/unknown/contract.test.ts", "export {};", "test has no declared owner"],
  ])("rejects repository ownership violation in %s", async (path, source, diagnostic) => {
    const root = await fixture({ [path]: source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it.each([
    ["src/features/owned-ui/root.ts", "import { createAgentSessionRuntime } from '@earendil-works/pi-coding-agent'; export { createAgentSessionRuntime };", "outside the owned Pi adapter boundary"],
    ["src/features/owned-ui/root.ts", "InteractiveMode.prototype.render = patched;", "stock Pi interactive prototype mutation"],
    ["src/integrations/pi/engine/private-state.ts", "const previousLines = readPrivateState();", "private Pi renderer-state inspection"],
    ["src/integrations/pi/tui-runtime/private-state.ts", "const previousViewportTop = readPrivateState();", "private Pi renderer-state inspection"],
    ["src/integrations/pi/engine/profile.ts", "const distributionHash = verifyDistribution();", "distribution-hash gating"],
    ["src/features/owned-ui/root.ts", "import { Editor } from '@oh-my-pi/pi-tui'; export { Editor };", "oh-my-pi fork package import"],
    ["src/features/owned-ui/root.ts", "import { sleep } from 'bun'; export { sleep };", "Bun-only dependency"],
    ["src/features/owned-ui/root.ts", "import { InteractiveMode } from '@earendil-works/pi-coding-agent/dist/modes/index.js'; export { InteractiveMode };", "private Pi distribution import"],
    ["src/features/owned-ui/root.ts", "const api: ExtensionUIContext = host;", "stock Pi extension UI context"],
  ])("rejects owned-UI boundary violation in %s: %s", async (path, source, diagnostic) => {
    const root = await fixture({ [path]: source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("allows public Pi SDK and UI imports only inside their adapters", async () => {
    const root = await fixture({
      "src/integrations/pi/engine/sdk.ts": "import { createAgentSessionRuntime } from '@earendil-works/pi-coding-agent'; export { createAgentSessionRuntime };",
      "src/integrations/pi/components/component.ts": "import { CustomEditor } from '@earendil-works/pi-coding-agent'; import { Component } from '@earendil-works/pi-tui'; export { CustomEditor, Component };",
      "src/integrations/pi/tui-runtime/runtime.ts": "import { TuiAltScreen } from '@earendil-works/pi-tui'; export { TuiAltScreen };",
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

  it("rejects composed and owned-UI infrastructure from explicit launch profiles", async () => {
    const root = await fixture({
      "src/features/launch/forbidden.ts": "import { runOwnedUiDevelopmentMode } from '../owned-ui/index.js'; export { runOwnedUiDevelopmentMode };",
    });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("launch may not import owned-ui");
  });

  it.each([
    ["import pty from 'node-pty';", "pseudoterminal or terminal emulator import 'node-pty'"],
    ["import pty from '@lydell/node-pty';", "pseudoterminal or terminal emulator import '@lydell/node-pty'"],
    ["import { Terminal } from '@xterm/headless';", "pseudoterminal or terminal emulator import '@xterm/headless'"],
    ["const { Terminal } = await import('@xterm/xterm');", "pseudoterminal or terminal emulator import '@xterm/xterm'"],
    ["import { Terminal } from 'xterm';", "pseudoterminal or terminal emulator import 'xterm'"],
    ["export const child = pty.spawn('pi', [], {});", "may not spawn a pseudoterminal"],
    ["export const call = 'CreatePseudoConsole';", "may not spawn a pseudoterminal"],
    ["export const call = 'forkpty';", "may not spawn a pseudoterminal"],
  ])("rejects a pseudoterminal or terminal emulator in any production module: %s", async (source, diagnostic) => {
    const root = await fixture({ "src/foundation/lifecycle/child.ts": source });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("leaves pseudoterminal and terminal emulator imports to tests", async () => {
    const root = await fixture({ "test/support/emulator.ts": "import pty from 'node-pty'; import { Terminal } from '@xterm/headless'; export { pty, Terminal };" });
    const result = runPolicy(root);
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
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

  it("keeps a terminal emulator out of the shipped dependencies", async () => {
    const root = await fixture({ "package.json": JSON.stringify({ name: "fixture", dependencies: { "@xterm/headless": "6.0.0" } }) });
    const result = runPolicy(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("terminal emulator dependency '@xterm/headless' must be development-only");
  });
});

function shellModuleFixture(overrides: Readonly<Record<string, string>> = {}): Record<string, string> {
  const prefix = "src/integrations/pi/components/";
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
  const root = await mkdtemp(resolve(tmpdir(), "a1-architecture-policy-"));
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
  return spawnSync(process.execPath, [policyPath, "--root", root, "--allow-partial-layout"], { encoding: "utf8" });
}
