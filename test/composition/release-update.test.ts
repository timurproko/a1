import { afterEach, describe, expect, it, vi } from "vitest";
import { composeOwnedUi } from "../../src/composition/owned-ui.js";
import type { AvailableRelease, StartupReleaseCheckOptions } from "../../src/foundation/release/latest-release.js";

const observed = vi.hoisted(() => ({
  updateCheck: true as unknown,
  accentColor: "default",
  accentCalls: [] as string[],
  settingsListeners: [] as Array<() => void>,
  settingsUnsubscribed: 0,
  started: 0,
  sessionCalls: 0,
  sessionResult: null as null | Record<string, unknown>,
  references: null as null | {
    changelog(input?: { document?: string }): Promise<{ rows?: (width: number) => readonly string[] | null }>;
    session(): Promise<{
      preamble?: (width: number) => readonly string[] | null;
      sections?: (width: number) => readonly { readonly title: string; readonly rows: readonly string[] }[] | null;
    }>;
  },
}));
// Rationale: exercise the startup release-check wiring without a real engine, terminal, or registry.
vi.mock("../../src/integrations/pi/components/upstream/theme/theme.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/integrations/pi/components/upstream/theme/theme.js")>(),
  applyConfiguredPiTheme() {},
  getAvailablePiThemes: () => [],
  setPiAccentColor(color: string) { observed.accentCalls.push(color); },
}));
vi.mock("../../src/integrations/pi/engine/adapter.js", () => ({ createPiEngineAdapter: vi.fn() }));
vi.mock("../../src/integrations/pi/tui-runtime/presentation-adapter.js", () => ({ createPiTerminalBridge: vi.fn() }));
vi.mock("../../src/composition/settings-route-host.js", () => ({
  createOwnedRouteHost: (_settings: unknown, references: typeof observed.references) => {
    observed.references = references;
    return null;
  },
}));
vi.mock("../../src/ui/settings/manager.js", () => ({
  OwnedSettingsManager: class {
    value(key: string) { return key === "updateCheck" ? observed.updateCheck : key === "promptHistoryEnabled" ? false : key === "accentColor" ? observed.accentColor : undefined; }
    onChange(listener: (manager: this) => void) {
      const notify = () => listener(this);
      observed.settingsListeners.push(notify);
      return () => {
        const index = observed.settingsListeners.indexOf(notify);
        if (index >= 0) observed.settingsListeners.splice(index, 1);
        observed.settingsUnsubscribed += 1;
      };
    }
  },
}));
vi.mock("../../src/app/session-shell/session-shell.js", () => ({
  OwnedUiSessionShell: class {
    start() { observed.started += 1; }
    async dispose() {}
  },
}));

afterEach(() => {
  observed.updateCheck = true;
  observed.accentColor = "default";
  observed.accentCalls.length = 0;
  observed.settingsListeners.length = 0;
  observed.settingsUnsubscribed = 0;
  observed.started = 0;
  observed.sessionCalls = 0;
  observed.sessionResult = null;
  observed.references = null;
});

const STABLE: AvailableRelease = { channel: "stable", version: "0.3.1", command: "a1 update", changelogUrl: "https://github.com/timurproko/a1/releases/tag/v0.3.1" };

async function compose(options: {
  ownedSurfaces?: "off";
  profileId?: string;
  release?: AvailableRelease | null;
  releaseNotes?: { current: () => null; completeMarkdown: string };
}) {
  const announced: unknown[] = [];
  const checks: StartupReleaseCheckOptions[] = [];
  const composed = await composeOwnedUi({
    ...(options.ownedSurfaces === undefined ? {} : { ownedSurfaces: options.ownedSurfaces }),
    ...(options.profileId === undefined ? {} : { profileId: options.profileId }),
    packageVersion: "0.3.0",
    releaseNotes: (options.releaseNotes ?? { current: () => null, completeMarkdown: "" }) as never,
    checkForNewerRelease: async input => { checks.push(input); return options.release === undefined ? STABLE : options.release; },
    createPiAdapter: async () => ({
      cwd: process.cwd(), agentDir: "synthetic-agent", configuredTheme: () => "dark", disposed: false,
      announceReleaseUpdate: (release: unknown) => { announced.push(release); },
      executeWorkflow: async (request: { command: string }) => {
        if (request.command !== "session") throw new Error(`unexpected workflow: ${request.command}`);
        observed.sessionCalls += 1;
        if (observed.sessionResult !== null) return observed.sessionResult;
        const total = observed.sessionCalls;
        return {
          command: "session", outcome: "completed", message: "Session Info",
          presentation: {
            kind: "session-info", sessionName: "Composition fixture",
            stats: {
              sessionFile: "D:/sessions/composition.jsonl", sessionId: "composition-session",
              userMessages: total, assistantMessages: 1, toolCalls: 0, toolResults: 0, totalMessages: total + 1,
              tokens: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, total: 15 }, cost: 0,
            },
            cacheWaste: { missedTokens: 0, missedCost: 0, missCount: 0 },
            usageBreakdown: [], cacheWarming: { mode: "streaming" },
          },
        };
      },
    }) as never,
  });
  return { composed, announced, checks };
}

describe("owned accent composition", () => {
  it("applies the profile accent live and releases its subscription", async () => {
    observed.accentColor = "blue";
    const { composed } = await compose({ profileId: "a1", release: null });
    expect(observed.accentCalls).toEqual(["blue"]);

    observed.accentColor = "green";
    for (const listener of [...observed.settingsListeners]) listener();
    expect(observed.accentCalls).toEqual(["blue", "green"]);

    const subscriptions = observed.settingsListeners.length;
    await composed.application.dispose();
    expect(observed.settingsUnsubscribed).toBe(subscriptions);
    expect(observed.settingsListeners).toHaveLength(0);
  });

  it("resets comparison composition to the unmodified default accent", async () => {
    observed.accentColor = "pink";
    const { composed } = await compose({ profileId: "a1", ownedSurfaces: "off", release: null });
    expect(observed.accentCalls).toEqual(["default"]);
    await composed.application.dispose();
  });
});

describe("owned changelog composition", () => {
  it("uses terminal-native link decoration for complete and supplied release notes", async () => {
    const target = "https://github.com/timurproko/a1/pull/614";
    await compose({
      profileId: "a1",
      release: null,
      releaseNotes: { current: () => null, completeMarkdown: `- Complete [change](${target})` },
    });

    const references = observed.references;
    expect(references).not.toBeNull();
    for (const [input, label] of [[undefined, "Complete"], [{ document: `- Startup [change](${target})` }, "Startup"]] as const) {
      const document = await references!.changelog(input);
      const rendered = document.rows?.(100) ?? [];
      const output = rendered.join("\n");
      expect(output).toContain(label);
      expect(output).toContain(`\u001b]8;;${target}\u001b\\`);
      expect(output).not.toContain("\u001b[4m");
    }
  });
});

describe("owned session reference composition", () => {
  it("runs the structured session workflow for every opening and returns grouped screen rows", async () => {
    await compose({ profileId: "a1", release: null });
    const references = observed.references;
    expect(references).not.toBeNull();

    const first = await references!.session();
    const firstPreamble = first.preamble?.(100) ?? [];
    const firstSections = first.sections?.(100) ?? [];
    expect(firstPreamble.join("\n")).toContain("Composition fixture");
    expect(firstSections.map(section => section.title)).toEqual(["Messages", "Tokens", "Cache Warming"]);
    expect(firstSections[0]?.rows.join("\n")).toContain("Total:");

    const second = await references!.session();
    const secondSections = second.sections?.(100) ?? [];
    expect(observed.sessionCalls).toBe(2);
    expect(secondSections[0]?.rows.join("\n")).toContain("3");
  });

  it("rejects failed and malformed session workflow snapshots", async () => {
    await compose({ profileId: "a1", release: null });
    const references = observed.references!;
    observed.sessionResult = { command: "session", outcome: "failed", message: "statistics unavailable" };
    await expect(references.session()).rejects.toThrow("statistics unavailable");
    observed.sessionResult = { command: "session", outcome: "completed", message: "Session Info" };
    await expect(references.session()).rejects.toThrow("no structured information");
  });
});

describe("startup release check composition", () => {
  it("starts the check after the shell starts and announces a newer release", async () => {
    const { composed, announced, checks } = await compose({ profileId: "a1" });
    expect(checks).toHaveLength(0);

    composed.application.start();

    expect(observed.started).toBe(1);
    await vi.waitFor(() => { expect(announced).toEqual([STABLE]); });
    expect(checks[0]).toMatchObject({ runningVersion: "0.3.0", settingEnabled: true });
    await composed.application.dispose();
  });

  it("passes a disabled bare-A1 setting to the check", async () => {
    observed.updateCheck = false;
    const { composed, checks } = await compose({ profileId: "a1", release: null });
    composed.application.start();
    await vi.waitFor(() => { expect(checks).toHaveLength(1); });
    expect(checks[0]!.settingEnabled).toBe(false);
    await composed.application.dispose();
  });

  it("applies only environment opt-outs to the comparison profile", async () => {
    observed.updateCheck = false;
    const { composed, announced, checks } = await compose({ profileId: "a1", ownedSurfaces: "off" });
    composed.application.start();
    await vi.waitFor(() => { expect(announced).toHaveLength(1); });
    expect(checks[0]).not.toHaveProperty("settingEnabled");
    await composed.application.dispose();
  });

  it("announces nothing when no newer release exists", async () => {
    const { composed, announced, checks } = await compose({ profileId: "a1", release: null });
    composed.application.start();
    await vi.waitFor(() => { expect(checks).toHaveLength(1); });
    await new Promise(resolve => setImmediate(resolve));
    expect(announced).toEqual([]);
    await composed.application.dispose();
  });
});
