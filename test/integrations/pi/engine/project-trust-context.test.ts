import * as fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { ProjectTrustStore, SettingsManager, VERSION, type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/adapter.js";
import { piTheme } from "../../../../src/integrations/pi/components/theme.js";
import { TrustSelectorComponent } from "../../../../src/integrations/pi/components/upstream/components/trust-selector.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";

vi.mock("node:fs", async importOriginal => {
  const actual = await importOriginal<typeof fs>();
  return { ...actual, realpathSync: Object.assign(vi.fn(actual.realpathSync), { native: actual.realpathSync.native }) };
});
const homes: string[] = [];
const adapters: Awaited<ReturnType<typeof createPiEngineAdapter>>[] = [];
afterEach(async () => {
  vi.mocked(fs.realpathSync).mockReset().mockImplementation(originalRealpath);
  for (const adapter of adapters.splice(0)) await adapter.dispose();
  for (const home of homes.splice(0)) await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});
const originalRealpath = vi.mocked(fs.realpathSync).getMockImplementation()!;

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), "a1-trust-context-")); homes.push(home);
  const target = join(home, "real-parent", "project");
  const alias = join(home, "alias-parent", "project");
  await mkdir(target, { recursive: true });
  await mkdir(dirname(alias), { recursive: true });
  await symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
  const agentDir = join(home, "agent");
  const canonical = fs.realpathSync(target);
  const store = new ProjectTrustStore(agentDir);
  async function context(cwd = alias) {
    const settings = SettingsManager.inMemory({ lastChangelogVersion: VERSION }, { projectTrusted: false });
    const load = vi.fn(() => { throw new Error("Project resource loading forbidden"); });
    const runtime = {
      cwd, diagnostics: [], setRebindSession() {}, dispose: async () => {},
      services: { settingsManager: settings, diagnostics: [], modelRuntime: { getAvailableSnapshot: () => [] }, resourceLoader: { reload: load } },
      session: { sessionId: "trust-fixture", model: undefined, messages: [], thinkingLevel: "off", subscribe: () => () => {} },
    };
    const adapter = await createPiEngineAdapter({ cwd, agentDir, createRuntime: async () => runtime as unknown as AgentSessionRuntime });
    adapters.push(adapter);
    return { adapter, value: adapter.pinnedProjectTrustContext(), settings, load };
  }
  return { home, target, alias, agentDir, canonical, store, context };
}
function rows(selector: TrustSelectorComponent) { return selector.render(600).map(stripTerminalSequences); }

describe("canonical project trust context", () => {
  it("uses the target parent, not the alias parent, without rewriting the cwd heading", async () => {
    const f = await fixture();
    const { value } = await f.context();
    expect(value.cwd).toBe(resolve(f.alias));
    expect(value.savedDecision).toBeNull();
    expect(value.projectTrusted).toBe(false);
    expect(value.trustOptions).toEqual([
      { label: "Trust", trusted: true, updates: [{ path: f.canonical, decision: true }], savedPath: f.canonical },
      { label: `Trust parent folder (${dirname(f.canonical)})`, trusted: true, updates: [{ path: dirname(f.canonical), decision: true }, { path: f.canonical, decision: null }], savedPath: dirname(f.canonical) },
      { label: "Do not trust", trusted: false, updates: [{ path: f.canonical, decision: false }], savedPath: f.canonical },
    ]);
    expect(dirname(f.canonical)).not.toBe(fs.realpathSync(dirname(f.alias)));
  });

  it("preserves ordinary paths and excludes the parent at a root", async () => {
    const f = await fixture();
    expect((await f.context(f.target)).value.trustOptions[0]?.savedPath).toBe(f.canonical);
    const root = fs.realpathSync(parse(f.canonical).root);
    const { value } = await f.context(root);
    expect(value.trustOptions.map(option => option.label)).toEqual(["Trust", "Do not trust"]);
    expect(value.trustOptions.every(option => option.savedPath === root)).toBe(true);
  });

  it("falls back for missing paths and injected lookup failures without granting trust", async () => {
    const f = await fixture();
    const missing = join(f.home, "missing", "project");
    expect((await f.context(missing)).value.trustOptions[0]?.savedPath).toBe(resolve(missing));
    vi.mocked(fs.realpathSync).mockImplementation(() => { throw Object.assign(new Error("unresolvable"), { code: "EACCES" }); });
    const { value } = await f.context();
    expect(value.trustOptions[0]?.savedPath).toBe(resolve(f.alias));
    expect(value.trustOptions[1]?.savedPath).toBe(dirname(resolve(f.alias)));
    expect(value.projectTrusted).toBe(false);
    expect(value.savedDecision).toBeNull();
  });

  it("does not swallow a trust-store failure", async () => {
    const f = await fixture();
    await mkdir(f.agentDir, { recursive: true });
    await writeFile(join(f.agentDir, "trust.json"), "not json");
    await expect(f.context()).rejects.toThrow("Failed to read trust store");
  });

  it.each(["trusted", "denied", "parent", "ancestor"] as const)("matches saved %s selection and inherited presentation", async kind => {
    const f = await fixture();
    const savedPath = kind === "parent" ? dirname(f.canonical) : kind === "ancestor" ? dirname(dirname(f.canonical)) : f.canonical;
    f.store.set(savedPath, kind !== "denied");
    const { value } = await f.context();
    const selector = new TrustSelectorComponent({ ...value, onSelect() {}, onCancel() {} });
    const raw = selector.render(600);
    const rendered = raw.map(stripTerminalSequences);
    const decision = kind === "denied" ? "untrusted" : "trusted";
    const decisionValue = `${decision} (${kind === "parent" || kind === "ancestor" ? "inherited from " : ""}${savedPath})`;
    expect(rendered.join("\n")).toContain(`Saved decision: ${decisionValue}`);
    expect(raw.some(row => row.includes(`${piTheme().fg("muted", "Saved decision:")} ${piTheme().fg("text", decisionValue)}`))).toBe(true);
    expect(raw.some(row => row.includes(`${piTheme().fg("muted", "Current session:")} ${piTheme().fg("text", "untrusted")}`))).toBe(true);
    const selected = kind === "denied" ? "Do not trust" : kind === "parent" ? `Trust parent folder (${savedPath})` : "Trust";
    // Rationale: the saved option carries a checkmark; an inherited ancestor matches no option.
    expect(rendered.some(row => row.trim() === `→ ${kind === "ancestor" ? "" : "✓ "}${selected}`)).toBe(true);
    expect(rendered.some(row => row.trim() === resolve(f.alias))).toBe(true);
    const headingIndex = rendered.findIndex(row => row.includes("Project trust"));
    const heading = rendered[headingIndex]!;
    expect(raw[headingIndex]).toContain(piTheme().fg("accent", piTheme().bold("Project trust")));
    const activeIndex = rendered.findIndex(row => row.trim().startsWith("→ "));
    expect(raw[activeIndex]).toContain(piTheme().fg("accent", "→ "));
    expect(raw[activeIndex]).toContain(piTheme().fg("accent", selected));
    const rules = raw.filter(row => /^─+$/u.test(stripTerminalSequences(row)));
    expect(rules).toHaveLength(2);
    expect(rules.every(row => row === piTheme().fg("border", "─".repeat(600)))).toBe(true);
    const hintIndex = rendered.findIndex(row => row.includes("↑↓ navigate  Enter save  Escape/Ctrl+C cancel"));
    const hint = rendered[hintIndex]!;
    expect(firstVisibleTextColumn(hint)).toBe(firstVisibleTextColumn(heading));
    expect(rendered[hintIndex + 1]).toMatch(/^─+$/u);
  });

  it("styles a trusted current-session value as normal text", async () => {
    const f = await fixture();
    const { value } = await f.context();
    const selector = new TrustSelectorComponent({ ...value, projectTrusted: true, onSelect() {}, onCancel() {} });
    expect(selector.render(600).some(row => row.includes(
      `${piTheme().fg("muted", "Current session:")} ${piTheme().fg("text", "trusted")}`,
    ))).toBe(true);
  });

  it.each(["trust", "deny", "parent", "cancel"] as const)("keeps %s effects explicit, canonical and restart-only", async action => {
    const f = await fixture();
    const unrelated = join(f.home, "unrelated");
    f.store.set(unrelated, false);
    if (action === "parent") f.store.set(f.canonical, false);
    const before = await readFile(join(f.agentDir, "trust.json"), "utf8");
    const { adapter, value, settings, load } = await f.context();
    const persist = vi.fn((selection: { updates: readonly { path: string; decision: boolean | null }[] }) => adapter.persistProjectTrust(selection.updates));
    const cancel = vi.fn();
    const selector = new TrustSelectorComponent({ ...value, onSelect: persist, onCancel: cancel });
    // Rationale: start at the top regardless of which saved option is selected.
    selector.handleInput("k"); selector.handleInput("k");
    if (action === "parent" || action === "deny") selector.handleInput("j");
    if (action === "deny") selector.handleInput("j");
    selector.handleInput(action === "cancel" ? "\u001b" : "\r");
    if (action === "cancel") {
      expect(cancel).toHaveBeenCalledOnce();
      expect(persist).not.toHaveBeenCalled();
      expect(await readFile(join(f.agentDir, "trust.json"), "utf8")).toBe(before);
    } else {
      expect(persist).toHaveBeenCalledOnce();
      const saved = JSON.parse(await readFile(join(f.agentDir, "trust.json"), "utf8"));
      expect(saved).toEqual({ [resolve(unrelated)]: false, [action === "parent" ? dirname(f.canonical) : f.canonical]: action !== "deny" });
      expect(f.store.get(dirname(f.alias))).toBeNull();
    }
    expect(settings.isProjectTrusted()).toBe(false);
    expect(adapter.pinnedProjectTrustContext().projectTrusted).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });
});
