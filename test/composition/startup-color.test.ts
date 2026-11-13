import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { composeOwnedUi } from "../../src/composition/owned-ui.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const painted = vi.hoisted(() => ({ color: "", frames: [] as string[], commands: [] as unknown[] }));
vi.mock("../../src/integrations/pi/components/upstream/theme/theme.js", async original => ({ ...await original<object>(), applyConfiguredPiTheme() {}, getAvailablePiThemes: () => [], setPiAccentColor() {}, setPiPackageBorderProjectionEnabled() {} }));
vi.mock("../../src/integrations/pi/engine/host.js", () => ({ createPiEngineHost: vi.fn() }));
vi.mock("../../src/composition/settings-route-host.js", () => ({ createOwnedRouteHost: () => null }));
vi.mock("../../src/app/session-shell/session-shell.js", () => ({
  sessionTerminalHostOptions: () => ({}),
  OwnedUiTerminalHost: class { readonly runtime = { renderNow() {} }; attach() {} async dispose() {} },
  OwnedUiSessionPresenter: class { start() { painted.frames.push(painted.color); } },
}));
let root = "";
afterEach(async () => { vi.unstubAllEnvs(); painted.frames = []; painted.commands = []; if (root) await rm(root, { recursive: true, force: true }); });
describe("first-frame and committed replacement color composition", () => {
  it("seeds the host before paint, retains policy after live writes, and submits literal prompt once after paint", async () => {
    root = await mkdtemp(join(tmpdir(), "startup-color-"));
    const profile = join(root, ".a1", "agent");
    await mkdir(profile, { recursive: true });
    const savedSettings = JSON.stringify({ [PRODUCT_IDENTITY.commandName]: { defaultAccentColor: "pink", promptHistoryEnabled: false } });
    await writeFile(join(profile, "settings.json"), savedSettings);
    vi.stubEnv(PRODUCT_IDENTITY.environment.profileHome, root);
    vi.stubEnv(PRODUCT_IDENTITY.environment.runtimeDir, join(root, "runtime"));
    vi.stubEnv(PRODUCT_IDENTITY.environment.dataDir, join(root, "data"));
    vi.stubEnv(PRODUCT_IDENTITY.environment.configDir, join(root, "config"));
    vi.stubEnv("HC_TERMINAL_ID", undefined);
    const listeners = new Set<() => void>();
    const identity = { sessionId: randomUUID(), cwd: root, agentDir: profile, sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
    const composed = await composeOwnedUi({ cwd: root, profileId: "a1", sessionColor: "green", promptArguments: ["--session-color", "pink", "$(literal)"], checkForNewerRelease: async () => null,
      createEngineHost: async options => {
        painted.color = options.theme!.accentColor!;
        return { create: async () => ({ identity, session: { onEvent(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }, async flushEvents() {}, async execute(command: unknown) { expect(painted.frames).toEqual(["green"]); painted.commands.push(command); } }, settings: { configuredTheme: () => "dark" } }), setAccentColor(color: string) { painted.color = color; }, async dispose() {} } as never;
      },
    });
    try {
      expect(composed.settings!.value("accentColor")).toBe("green");
      composed.application.start(); await composed.application.flush(); await composed.application.flush();
      expect(painted.frames).toEqual(["green"]);
      expect(painted.commands).toEqual([expect.objectContaining({ type: "prompt", text: "--session-color pink $(literal)" })]);
      await composed.settings!.change("a1", "accentColor", "orange");
      for (const listener of listeners) listener(); // Invariant: failed/cancelled work does not commit a generation.
      expect(painted.color).toBe("orange");
      for (const _workflow of ["new", "resume", "fork", "import"]) {
        identity.sessionId = randomUUID(); identity.sessionBindingGeneration++;
        for (const listener of listeners) listener();
        expect(painted.color).toBe("green");
        await composed.settings!.change("a1", "accentColor", "orange");
      }
    } finally { await composed.application.dispose(); }
    expect(listeners.size).toBe(0);
    expect(await readFile(join(profile, "settings.json"), "utf8")).toBe(savedSettings);
  });
});
