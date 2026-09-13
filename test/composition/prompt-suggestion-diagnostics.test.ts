import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { composeOwnedUi } from "../../src/composition/owned-ui.js";
import { SuggestionDiagnosticCapture } from "../../src/features/prompt-suggestions/index.js";
import type { OwnedUiSessionShellOptions } from "../../src/integrations/pi/session-ui/index.js";

const observed = vi.hoisted(() => ({ options: undefined as OwnedUiSessionShellOptions | undefined }));
// Rationale: isolate launch composition from provider discovery and terminal ownership.
vi.mock("../../src/integrations/pi/components/index.js", () => ({ applyConfiguredPiTheme() {}, getAvailablePiThemes: () => [], loadHistoryEditor: vi.fn() }));
vi.mock("../../src/integrations/pi/engine/index.js", () => ({ createPiEngineAdapter: vi.fn() }));
vi.mock("../../src/integrations/pi/tui-runtime/index.js", () => ({ createPiTerminalBridge: vi.fn() }));
vi.mock("../../src/composition/settings-route-host.js", () => ({ createOwnedRouteHost: () => null }));
vi.mock("../../src/ui/settings/index.js", () => ({
  OwnedUiSettingsStore: class {},
  OwnedUiSettingsSession: class { value(key: string) { return key === "promptHistoryEnabled" ? false : undefined; } },
}));
vi.mock("../../src/integrations/pi/session-ui/index.js", () => ({
  OwnedUiSessionShell: class {
    constructor(options: OwnedUiSessionShellOptions) { observed.options = options; }
    async dispose() {}
  },
}));
afterEach(() => { observed.options = undefined; vi.unstubAllEnvs(); });

async function compose(options: { ownedSurfaces?: "off"; profileId?: string; suggestionDiagnosticsPath?: string }) {
  return composeOwnedUi({ ...options, createPiAdapter: async () => ({ cwd: process.cwd(), agentDir: "synthetic-agent", configuredTheme: () => "dark" }) as never });
}

describe("suggestion diagnostic launch composition", () => {
  it.each(["environment", "explicit"])("exports inspectable metadata through %s opt-in and disposes capture", async route => {
    const directory = await mkdtemp(join(tmpdir(), "suggestion-composition-"));
    try {
      const destination = join(directory, "snapshot.json");
      vi.stubEnv(PRODUCT_IDENTITY.environment.suggestionDiagnostics, route === "environment" ? destination : undefined);
      const composed = await compose({ profileId: "a1", ...(route === "explicit" ? { suggestionDiagnosticsPath: destination } : {}) });
      const capture = observed.options?.promptSuggestions?.diagnostics as SuggestionDiagnosticCapture;
      expect(capture).toBeInstanceOf(SuggestionDiagnosticCapture);
      capture.record({ event: "skipped", reason: "disabled", session: 1, request: 0, run: 1, response: 2, provider: "test", model: "test", reasoning: "ordinary", elapsedMs: 0 });
      await capture.flush();
      expect(JSON.parse(await readFile(destination, "utf8")).records[0]).toMatchObject({ event: "skipped", reason: "disabled", request: 0 });
      await composed.application.dispose();
      expect(capture.snapshot()).toEqual([]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it.each(["unset", "blank", "comparison", "settings-free"])("withholds diagnostic capture in %s mode", async mode => {
    vi.stubEnv(PRODUCT_IDENTITY.environment.suggestionDiagnostics, mode === "unset" ? undefined : mode === "blank" ? " " : "unused-snapshot.json");
    const composed = await compose({ ...(mode === "settings-free" ? {} : { profileId: "a1" }), ...(mode === "comparison" ? { ownedSurfaces: "off" as const } : {}) });
    expect(observed.options?.promptSuggestions?.diagnostics).toBeUndefined();
    if (mode === "comparison" || mode === "settings-free") expect(observed.options?.promptSuggestions).toBeUndefined();
    await composed.application.dispose();
  });
});
