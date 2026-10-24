import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptHistorySnapshot } from "../../src/contracts/owned-ui/index.js";
import { PromptHistoryService, resolvePromptHistoryPath } from "../../src/features/prompt-history/index.js";
import { PromptHistoryStore } from "../../src/features/prompt-history/store.js";
import * as launch from "../../src/features/launch/index.js";
import { resolveProductPaths } from "../../src/foundation/lifecycle/index.js";
import { composeOwnedUi } from "../../src/composition/owned-ui.js";
import { PromptHistoryController } from "../../src/app/session-shell/prompt-history-controller.js";

type ShellOptions = { history?: { store: PromptHistoryService; imageSidecar?: { directory: string }; forSession?: (id: string) => { store: PromptHistoryService } } };
const observed = vi.hoisted(() => ({ shells: [] as ShellOptions[], enabled: true, scope: "unique" as "unique" | "shared", sessionId: "pi-one", loadEditor: vi.fn() }));

// Rationale: test composition/storage without starting a terminal, provider, or Pi runtime.
vi.mock("../../src/integrations/pi/components/upstream/theme/theme.js", () => ({
  applyConfiguredPiTheme() {}, getAvailablePiThemes: () => [], setPiAccentColor() {}, setPiPackageBorderProjectionEnabled() {},
}));
vi.mock("../../src/integrations/pi/components/history-editor-loader.js", () => ({ loadHistoryEditor: observed.loadEditor }));
vi.mock("../../src/integrations/pi/engine/host.js", () => ({ createPiEngineHost: vi.fn() }));
vi.mock("../../src/integrations/pi/tui-runtime/presentation-adapter.js", () => ({ createPiTerminalBridge: vi.fn() }));
vi.mock("../../src/composition/settings-route-host.js", () => ({ createOwnedRouteHost: () => null }));
vi.mock("../../src/ui/settings/manager.js", () => ({
  OwnedSettingsManager: class {
    value(key: string) { return key === "promptHistoryEnabled" ? observed.enabled : key === "promptHistoryScope" ? observed.scope : key === "promptHistoryMaxItems" ? 100 : key === "accentColor" ? "purple" : undefined; }
    onChange() { return () => undefined; }
  },
}));
vi.mock("../../src/app/session-shell/session-shell.js", () => ({
  sessionTerminalHostOptions: () => ({}),
  OwnedUiTerminalHost: class {
    #presenter: { readonly options: ShellOptions } | undefined;
    attach(presenter: { readonly options: ShellOptions }) { this.#presenter = presenter; }
    async dispose() { await this.#presenter?.options.history?.store.close(); }
  },
  OwnedUiSessionPresenter: class {
    readonly options: ShellOptions;
    constructor(_host: unknown, options: ShellOptions) { this.options = options; observed.shells.push(options); }
  },
}));

let root: string;
let profileRoot: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "a1-home-history-"));
  profileRoot = join(root, "custom-agent-profile");
  observed.enabled = true;
  observed.scope = "unique";
  observed.sessionId = "pi-one";
  observed.shells.length = 0;
  observed.loadEditor.mockClear();
  vi.stubEnv("A1_PROFILE_HOME", root);
  vi.stubEnv("A1_DATA_DIR", undefined);
  vi.stubEnv("A1_CONFIG_DIR", join(root, "config"));
  vi.stubEnv("LOCALAPPDATA", join(root, "legacy-data"));
  vi.stubEnv("XDG_DATA_HOME", join(root, "legacy-data"));
});
afterEach(async () => {
  await Promise.all(observed.shells.map(shell => shell.history?.store.close()));
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

async function compose(options: { profileId?: string; ownedSurfaces?: "off" } = { profileId: "a1" }) {
  return composeOwnedUi({
    ...options,
    cwd: root,
    createEngineHost: async () => ({ create: async () => ({ identity: { cwd: root, agentDir: profileRoot, currentHistorySessionId: () => observed.sessionId || null }, settings: { configuredTheme: () => "dark" } }), setAccentColor() {}, dispose: async () => {} }) as never,
  });
}

async function snapshot(store: PromptHistoryService): Promise<PromptHistorySnapshot> {
  let latest: PromptHistorySnapshot | undefined;
  let failure: string | undefined;
  const detach = store.onSnapshot(value => { latest = value; });
  const detachFailure = store.onFailure(code => { failure = code; });
  try {
    store.refresh();
    await vi.waitFor(() => { expect(failure).toBeUndefined(); expect(latest).toBeDefined(); }, { timeout: 5000 });
    return latest!;
  } finally { detach(); detachFailure(); }
}

function seedOldStore() {
  const location = resolvePromptHistoryPath(resolveProductPaths().dataDir, profileRoot);
  const old = new PromptHistoryStore(location.path, location.profileId, 100);
  try { old.record({ id: "old", text: "synthetic old history", timestamp: 1, kind: "prompt" }); }
  finally { old.close(); }
  // Invariant: closed-store sidecar sentinels must not be opened, repaired, or deleted by the new launch.
  for (const suffix of ["-wal", "-shm"]) writeFileSync(location.path + suffix, "synthetic old sidecar");
  const files = ["", "-wal", "-shm"].map(suffix => ({ path: location.path + suffix, bytes: readFileSync(location.path + suffix), mtime: statSync(location.path + suffix).mtimeMs }));
  return () => {
    for (const file of files) {
      expect(readFileSync(file.path).equals(file.bytes)).toBe(true);
      expect(statSync(file.path).mtimeMs).toBe(file.mtime);
    }
  };
}

describe("owned history storage composition", () => {
  it("starts fresh at the home root and retains new prompts across restart without touching old history", async () => {
    const assertOldUntouched = seedOldStore();
    const productPaths = resolveProductPaths();
    const first = await compose();
    const store = observed.shells.at(-1)!.history!.store;
    expect(store.options).toMatchObject({ dataDir: join(root, ".a1", "data"), profileRoot, limit: 100, scope: "unique", sessionId: "pi-one" });
    expect((await snapshot(store)).entries).toEqual([]);
    expect(await store.record({ id: "new", text: "synthetic new prompt", timestamp: 2, kind: "prompt" })).toBe("committed");
    const location = resolvePromptHistoryPath(store.options.dataDir, profileRoot, process.platform, "unique", "pi-one");
    expect(existsSync(location.path)).toBe(true);
    if (process.platform !== "win32") {
      expect(statSync(dirname(location.path)).mode & 0o777).toBe(0o700);
      for (const suffix of ["", "-wal", "-shm"]) expect(statSync(location.path + suffix).mode & 0o077).toBe(0);
    }
    assertOldUntouched();
    await first.application.dispose();
    await compose();
    expect((await snapshot(observed.shells.at(-1)!.history!.store)).entries).toEqual([{ text: "synthetic new prompt", submissionId: "new" }]);
    expect(resolveProductPaths()).toEqual(productPaths);
    assertOldUntouched();
  }, 15_000);

  it("isolates two agent runtimes and exposes legacy entries only in Shared mode", async () => {
    const sharedLocation = resolvePromptHistoryPath(join(root, ".a1", "data"), profileRoot);
    const legacy = new PromptHistoryStore(sharedLocation.path, sharedLocation.profileId, 100);
    legacy.record({ id: "legacy", text: "shared history", timestamp: 1, kind: "prompt" });
    legacy.close();
    await compose();
    const first = observed.shells.at(-1)!.history!;
    expect((await snapshot(first.store)).entries).toEqual([]);
    expect(await first.store.record({ id: "first", text: "first agent", timestamp: 2, kind: "prompt" })).toBe("committed");
    const other = first.forSession!("pi-two");
    expect((await snapshot(other.store)).entries).toEqual([]);
    await other.store.close();
    observed.sessionId = "pi-two";
    await compose();
    const second = observed.shells.at(-1)!.history!;
    expect((await snapshot(second.store)).entries).toEqual([]);
    expect(await second.store.record({ id: "second", text: "second agent", timestamp: 3, kind: "prompt" })).toBe("committed");
    expect((await snapshot(first.store)).entries.map(entry => entry.text)).toEqual(["first agent"]);
    observed.scope = "shared";
    await compose();
    const shared = observed.shells.at(-1)!.history!;
    expect(shared.store.options.scope).toBe("shared");
    expect(shared.forSession).toBeUndefined();
    expect((await snapshot(shared.store)).entries.map(entry => entry.text)).toEqual(["shared history"]);
    expect(shared.imageSidecar?.directory).toBe(sharedLocation.imagesDir);
    observed.scope = "unique";
    await compose();
    expect((await snapshot(observed.shells.at(-1)!.history!.store)).entries.map(entry => entry.text)).toEqual(["second agent"]);
  }, 15_000);

  it("accesses only an explicit data override and leaves the default home store absent", async () => {
    vi.stubEnv("A1_DATA_DIR", join(root, "override"));
    await compose();
    const store = observed.shells.at(-1)!.history!.store;
    expect(store.options.dataDir).toBe(join(root, "override"));
    expect(await store.record({ id: "override", text: "synthetic override prompt", timestamp: 1, kind: "prompt" })).toBe("committed");
    expect(existsSync(resolvePromptHistoryPath(store.options.dataDir, profileRoot, process.platform, "unique", "pi-one").path)).toBe(true);
    expect(existsSync(join(root, ".a1"))).toBe(false);
  });

  it("quietly preserves recall with an unavailable home store without falling back to the old store", async () => {
    const assertOldUntouched = seedOldStore();
    mkdirSync(join(root, ".a1"));
    writeFileSync(join(root, ".a1", "data"), "not a directory");
    const composition = await compose();
    const store = observed.shells.at(-1)!.history!.store;
    const failure = vi.fn();
    store.onFailure(failure);
    const replace = vi.fn();
    const controller = new PromptHistoryController({
      editor: { recall: { replace, observe: () => () => {} } } as never,
      store, limit: 100, fallback: ["synthetic loaded fallback"], active: () => true, render() {},
    });
    try {
      controller.capture("synthetic private prompt", "prompt", root, "test-session");
      await vi.waitFor(() => expect(failure).toHaveBeenCalledWith("unavailable"));
      controller.synchronize();
      expect(replace).toHaveBeenLastCalledWith(["synthetic private prompt", "synthetic loaded fallback"]);
      controller.capture("synthetic later prompt", "prompt", root, "test-session");
      expect(replace).toHaveBeenLastCalledWith(["synthetic later prompt", "synthetic private prompt", "synthetic loaded fallback"]);
      assertOldUntouched();
    } finally { await controller.close(); await composition.application.dispose(); }
  });

  it("does not fall back to Shared when a unique session has no durable identity", async () => {
    const legacy = resolvePromptHistoryPath(join(root, ".a1", "data"), profileRoot);
    const seed = new PromptHistoryStore(legacy.path, legacy.profileId, 100);
    seed.record({ id: "shared", text: "private shared prompt", timestamp: 1, kind: "prompt" });
    seed.close();
    observed.sessionId = "";
    await compose();
    expect(observed.shells.at(-1)!.history).toBeUndefined();
    expect(existsSync(legacy.path)).toBe(true);
  });

  it.each(["disabled", "comparison", "settings-free"])("does not resolve or access history in %s mode", async mode => {
    const assertOldUntouched = seedOldStore();
    const resolveRoot = vi.spyOn(launch, "resolvePromptHistoryDataDir");
    if (mode === "disabled") observed.enabled = false;
    await compose(mode === "settings-free" ? {} : { profileId: "a1", ...(mode === "comparison" ? { ownedSurfaces: "off" as const } : {}) });
    expect(resolveRoot).not.toHaveBeenCalled();
    expect(observed.shells.at(-1)!.history).toBeUndefined();
    expect(observed.loadEditor).not.toHaveBeenCalled();
    expect(existsSync(join(root, ".a1"))).toBe(false);
    assertOldUntouched();
  });
});
