import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { composeOwnedUi } from "../../src/composition/owned-ui.js";
import type { ClipboardDiagnosticCapture } from "../../src/integrations/pi/session-ui/clipboard-diagnostics.js";
import type { OwnedUiSessionShellOptions } from "../../src/integrations/pi/session-ui/index.js";

const observed = vi.hoisted(() => ({ options: undefined as OwnedUiSessionShellOptions | undefined,
  captures: [] as ClipboardDiagnosticCapture[], writes: [] as { file: string; data: string }[], failure: "" }));
// Rationale: exercise real diagnostic capture and launch wiring without provider, terminal, or user-file effects.
vi.mock("../../src/integrations/pi/components/upstream/theme/theme.js", () => ({ applyConfiguredPiTheme() {}, getAvailablePiThemes: () => [] }));
vi.mock("../../src/integrations/pi/engine/adapter.js", () => ({ createPiEngineAdapter: vi.fn() }));
vi.mock("../../src/integrations/pi/tui-runtime/presentation-adapter.js", () => ({ createPiTerminalBridge: vi.fn() }));
vi.mock("../../src/composition/settings-route-host.js", () => ({ createOwnedRouteHost: () => null }));
vi.mock("../../src/ui/settings/store.js", () => ({ OwnedUiSettingsStore: class {} }));
vi.mock("../../src/ui/settings/session.js", () => ({
  OwnedUiSettingsSession: class { value(key: string) { return key === "promptHistoryEnabled" ? false : undefined; } },
}));
vi.mock("../../src/integrations/pi/session-ui/clipboard-diagnostics.js", async importOriginal => {
  const { ClipboardDiagnosticCapture: Capture } = await importOriginal<typeof import("../../src/integrations/pi/session-ui/clipboard-diagnostics.js")>();
  return { ClipboardDiagnosticCapture: class extends Capture {
    constructor(file: string) { super(file, async (destination, data) => { observed.writes.push({ file: destination, data }); }); observed.captures.push(this); }
  } };
});
vi.mock("../../src/integrations/pi/session-ui/session-shell.js", () => ({
  OwnedUiSessionShell: class {
    constructor(options: OwnedUiSessionShellOptions) {
      observed.options = options;
      if (observed.failure === "construct") throw new Error("synthetic construction failure");
    }
    async dispose() { if (observed.failure === "dispose") throw new Error("synthetic disposal failure"); }
  },
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv(PRODUCT_IDENTITY.environment.clipboardDiagnostics, undefined);
  vi.stubEnv(PRODUCT_IDENTITY.environment.suggestionDiagnostics, undefined);
});
afterEach(() => {
  for (const capture of observed.captures) capture.dispose();
  observed.options = undefined; observed.captures = []; observed.writes = []; observed.failure = "";
  vi.useRealTimers(); vi.unstubAllEnvs();
});
async function compose(options: { ownedSurfaces?: "off"; profileId?: string; clipboardDiagnosticsPath?: string }) {
  return composeOwnedUi({ ...options, createPiAdapter: async () => ({ cwd: process.cwd(), agentDir: "synthetic-agent", configuredTheme: () => "dark" }) as never });
}

describe("clipboard diagnostic launch composition", () => {
  it.each(["environment", "explicit"])("wires all three event sources through %s opt-in and disposes the heartbeat", async route => {
    vi.stubEnv(PRODUCT_IDENTITY.environment.clipboardDiagnostics, "environment.json");
    const composed = await compose({ profileId: "a1", ...(route === "explicit" ? { clipboardDiagnosticsPath: "explicit.json" } : {}) });
    const options = observed.options!;
    options.diagnostics!.responseCopy!.onEvent!({ request: 1, phase: "capture", atMs: 0, elapsedMs: 0, pending: 1, sourceUnits: 10 });
    options.diagnostics!.paste!({ request: 2, phase: "admitted", atMs: 1, pending: 1, transport: "native" });
    options.presentation!.input!.onEvent!({ phase: "write-end", revision: 3, atMs: 2, pendingDepth: 0, pendingPresentationDepth: 0, appliedRevision: 3 });
    await vi.advanceTimersByTimeAsync(100);
    await observed.captures[0]!.flush();
    const { file, data } = observed.writes.at(-1)!;
    expect(file).toBe(`${route}.json`);
    expect(new Set(JSON.parse(data).records.map((row: { source: string }) => row.source))).toEqual(new Set(["copy", "paste", "runtime", "heartbeat"]));
    expect(data).not.toMatch(/environment.json|explicit.json|synthetic-agent/);
    await composed.application.dispose();
    expect(vi.getTimerCount()).toBe(0);
    const count = observed.writes.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(observed.writes).toHaveLength(count);
  });

  it.each(["unset", "blank", "comparison", "settings-free"])("withholds diagnostics in %s mode", async mode => {
    vi.stubEnv(PRODUCT_IDENTITY.environment.clipboardDiagnostics, mode === "unset" ? undefined : mode === "blank" ? " " : "unused.json");
    const composed = await compose({ ...(mode === "settings-free" ? {} : { profileId: "a1" }), ...(mode === "comparison" ? { ownedSurfaces: "off" as const } : {}) });
    expect(observed.captures).toHaveLength(0);
    expect(observed.options?.diagnostics).toBeUndefined();
    expect(observed.options?.presentation?.input).toBeUndefined();
    await composed.application.dispose();
  });

  it.each(["construct", "dispose"])("disposes diagnostic resources when shell %s fails", async phase => {
    observed.failure = phase;
    const create = compose({ profileId: "a1", clipboardDiagnosticsPath: "unused.json" });
    if (phase === "construct") await expect(create).rejects.toThrow("synthetic construction failure");
    else await expect((await create).application.dispose()).rejects.toThrow("synthetic disposal failure");
    expect(observed.captures).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
