import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createPiEngineHost, type PiEngineHostOptions } from "../../../../src/integrations/pi/engine/host.js";
import type { PiEngineRuntimeFactoryInput } from "../../../../src/integrations/pi/engine/session-runtime.js";

class FakeSession {
  readonly listeners = new Set<(event: unknown) => void>();
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly messages: readonly unknown[] = [];
  readonly agent = { state: { systemPrompt: "You are a coding agent.", messages: [] as unknown[], tools: [] as unknown[] } };
  readonly sessionManager = { getSessionName: () => "host-test", getEntries: () => [], getBranch: () => [] };
  readonly extensionRunner = { getRegisteredCommands: () => [] };
  readonly sessionId: string;
  constructor(sessionId: string) { this.sessionId = sessionId; }
  getAvailableThinkingLevels(): string[] { return ["off", "low", "medium", "high"]; }
  subscribe(listener: (event: unknown) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async bindExtensions(): Promise<void> {}
  async abort(): Promise<void> {}
  dispose(): void {}
}

// Rationale: the settings bridge reads every pinned setting at construction; unknown getters answer undefined.
function fakeSettingsManager(state: { httpIdleTimeoutMs: number; lastChangelogVersion: string | undefined; written: string[] }) {
  const explicit: Record<string, unknown> = {
    getCompactionEnabled: () => true,
    getHttpIdleTimeoutMs: () => state.httpIdleTimeoutMs,
    setHttpIdleTimeoutMs: (value: number) => { state.httpIdleTimeoutMs = value; state.written.push(`httpIdleTimeoutMs:${value}`); },
    getLastChangelogVersion: () => state.lastChangelogVersion,
    setLastChangelogVersion: (version: string) => { state.lastChangelogVersion = version; },
    getCollapseChangelog: () => true,
    getThemeSetting: () => "light/dark",
    getWarnings: () => ({}),
    flush: async () => {},
  };
  return new Proxy(explicit, { get: (target, key) => key in target ? target[key as string] : () => undefined });
}

class FakeRuntime {
  readonly session: FakeSession;
  readonly cwd: string;
  readonly settingsState = { httpIdleTimeoutMs: 30_000, lastChangelogVersion: "0.0.1" as string | undefined, written: [] as string[] };
  readonly services: {
    resourceLoader: unknown;
    modelRuntime: unknown;
    settingsManager: unknown;
    diagnostics: readonly unknown[];
  };
  readonly diagnostics: readonly unknown[] = [];
  disposed = false;
  constructor(input: PiEngineRuntimeFactoryInput) {
    this.cwd = input.cwd;
    this.session = new FakeSession(`pi-${input.sessionId}`);
    this.services = {
      resourceLoader: { getPrompts: () => ({ prompts: [], diagnostics: [] }), getSkills: () => ({ skills: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }) },
      modelRuntime: { getModel: () => undefined, getAvailableSnapshot: () => [], isUsingSubscription: () => false },
      settingsManager: fakeSettingsManager(this.settingsState),
      diagnostics: [],
    };
  }
  setRebindSession(): void {}
  setBeforeSessionInvalidate(): void {}
  async dispose(): Promise<void> { this.disposed = true; }
}

function hostOptions(overrides: Partial<PiEngineHostOptions> = {}) {
  const theme: string[] = [];
  const installed: number[] = [];
  const phases: string[] = [];
  const runtimes: FakeRuntime[] = [];
  const probes = { count: 0 };
  const options: PiEngineHostOptions = {
    productMode: "bare",
    theme: {
      base: "dark",
      accentColor: "blue",
      packageBorderProjection: true,
      apply: {
        base: setting => { theme.push(`base:${setting}`); },
        accentColor: color => { theme.push(`accent:${color}`); },
        packageBorderProjection: enabled => { theme.push(`border:${enabled}`); },
      },
    },
    createRuntime: async input => {
      // Invariant: the default runtime factory traces these phases; the seam traces them the same way.
      await input.markStartupPhase("settings-loaded");
      await input.markStartupPhase("session-created");
      const runtime = new FakeRuntime(input);
      runtimes.push(runtime);
      return runtime as unknown as AgentSessionRuntime;
    },
    installHttpDispatcher: timeoutMs => { installed.push(timeoutMs); },
    markStartupPhase: async phase => { phases.push(phase); },
    checkPackageUpdates: async () => { probes.count += 1; return ["pi-mcp-adapter"]; },
    workflowHost: { copyText: async () => {}, runCommand: async () => ({ stdout: "", stderr: "" }), readChangelog: async () => "## New" },
    ...overrides,
  };
  return { options, theme, installed, phases, runtimes, probes };
}

describe("Pi engine host", () => {
  it("creates uniquely named sessions that share one dispatcher, one theme, one trace, and one announcement", async () => {
    const { options, theme, installed, phases, probes } = hostOptions();
    const host = createPiEngineHost(options);
    const first = await host.create({ cwd: "D:/work" });
    const second = await host.create({ cwd: "D:/other" });

    expect([first.sessionId, second.sessionId]).toEqual(["owned-session-1", "owned-session-2"]);
    expect(host.liveSessionIds()).toEqual(["owned-session-1", "owned-session-2"]);
    expect([first.cwd, second.cwd]).toEqual(["D:/work", "D:/other"]);
    expect(installed).toEqual([30_000]);
    expect(host.httpPolicy()).toEqual({ timeoutMs: 30_000, sessionId: "owned-session-1", origin: "startup" });
    expect(theme).toEqual(["border:true", "accent:blue", "base:dark"]);
    expect(phases).toEqual(["settings-loaded", "session-created"]);
    expect(first.view().diagnostics.map(diagnostic => diagnostic.code)).toContain("changelog-collapsed");
    expect(second.view().diagnostics.map(diagnostic => diagnostic.code)).not.toContain("changelog-collapsed");
    await vi.waitFor(() => {
      expect(first.view().diagnostics.some(diagnostic => diagnostic.code === "package-updates")).toBe(true);
    });
    expect(probes.count).toBe(1);
    expect(second.view().diagnostics.some(diagnostic => diagnostic.code === "package-updates")).toBe(false);

    host.setAccentColor("green");
    expect(theme.at(-1)).toBe("accent:green");
    await host.dispose();
    expect(host.signal.aborted).toBe(true);
    expect([first.disposed, second.disposed]).toEqual([true, true]);
    expect(host.liveSessionIds()).toEqual([]);
    await expect(host.create({ cwd: "D:/work" })).rejects.toThrow("disposed");
  });

  it("follows the first session's configured theme for comparison and withholds the changelog when told", async () => {
    const { options, theme } = hostOptions({
      productMode: "comparison",
      announceStartupChangelog: false,
      theme: {
        base: "engine-configured",
        accentColor: "purple",
        packageBorderProjection: false,
        apply: {
          base: setting => { theme.push(`base:${setting}`); },
          accentColor: color => { theme.push(`accent:${color}`); },
          packageBorderProjection: enabled => { theme.push(`border:${enabled}`); },
        },
      },
    });
    const host = createPiEngineHost(options);
    const session = await host.create({ cwd: "D:/work" });
    expect(theme).toEqual(["border:false", "accent:purple", "base:light/dark"]);
    expect(session.settingsProductMode).toBe("comparison");
    expect(session.view().diagnostics.map(diagnostic => diagnostic.code)).not.toContain("changelog-collapsed");
    await host.dispose();
  });

  it("rejects a session id that is live, accepts it again once that session is disposed, and never generates a taken id", async () => {
    const host = createPiEngineHost(hostOptions().options);
    const tab = await host.create({ cwd: "D:/work", sessionId: "tab-1" });
    await expect(host.create({ cwd: "D:/work", sessionId: "tab-1" })).rejects.toThrow("already live: tab-1");
    await expect(host.create({ cwd: "D:/work", sessionId: "" })).rejects.toThrow("required");
    await tab.dispose();
    const again = await host.create({ cwd: "D:/work", sessionId: "tab-1" });
    expect(again).not.toBe(tab);
    const taken = await host.create({ cwd: "D:/work", sessionId: "owned-session-1" });
    const generated = await host.create({ cwd: "D:/work" });
    expect(generated.sessionId).toBe("owned-session-2");
    expect(host.liveSessionIds()).toEqual(["tab-1", taken.sessionId, "owned-session-2"]);
    await host.dispose();
  });

  it("re-installs the dispatcher when any session writes the timeout and records which one did", async () => {
    const { options, installed } = hostOptions();
    const host = createPiEngineHost(options);
    await host.create({ cwd: "D:/work" });
    const second = await host.create({ cwd: "D:/work" });
    const port = second.settingsPort();
    expect(port).not.toBeNull();
    await expect(port!.writeSetting("httpIdleTimeoutMs", 0)).resolves.toMatchObject({ status: "applied" });
    expect(installed).toEqual([30_000, 0]);
    expect(host.httpPolicy()).toEqual({ timeoutMs: 0, sessionId: "owned-session-2", origin: "setting" });
    await host.dispose();
  });

  it("drops a session whose startup failed and keeps its id available", async () => {
    let fail = true;
    const { options } = hostOptions({
      createRuntime: async input => {
        if (fail) throw new Error("synthetic startup failure");
        return new FakeRuntime(input) as unknown as AgentSessionRuntime;
      },
    });
    const host = createPiEngineHost(options);
    await expect(host.create({ cwd: "D:/work", sessionId: "tab-1" })).rejects.toThrow("synthetic startup failure");
    expect(host.liveSessionIds()).toEqual([]);
    fail = false;
    const session = await host.create({ cwd: "D:/work", sessionId: "tab-1" });
    expect(session.sessionId).toBe("tab-1");
    await host.dispose();
  });
});
