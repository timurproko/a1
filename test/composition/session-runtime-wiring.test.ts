import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { composeOwnedUi, type OwnedUiCompositionOptions } from "../../src/composition/owned-ui.js";
import { PID_LIVENESS_IDENTITY } from "../../src/foundation/lifecycle/process-liveness.js";
import {
  listSessionRepositoryWorktrees,
  registerSessionRepositoryRuntime,
  setSessionRepositoryContext,
  clearSessionRepositoryContext,
} from "../../src/foundation/lifecycle/session-repository-context.js";
import type { ProcessIdentity } from "../../src/foundation/lifecycle/model.js";

import type { PiEngineHostOptions } from "../../src/integrations/pi/engine/host.js";
import type { ProgressSpinnerSource, ProgressSpinnerStyle } from "../../src/contracts/presentation/index.js";
import type { PiSessionPresentersOptions } from "../../src/integrations/pi/session-presenters/presenters.js";

type RepositoryContextReader = (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<unknown>;
type WorktreeCwdReader = import("../../src/integrations/pi/engine/worktree-tools.js").PiWorktreeCwdReader;

const observed = vi.hoisted(() => ({
  hosts: [] as PiEngineHostOptions[], readers: [] as Array<RepositoryContextReader | undefined>, tools: [] as Array<WorktreeCwdReader | undefined>, autoName: true,
  nameFormat: "sentence" as "kebab" | "sentence" | "title" | undefined, spinnerStyle: "current" as ProgressSpinnerStyle,
  spinnerSources: [] as Array<ProgressSpinnerSource | undefined>, colorStarts: 0, settingsListeners: new Set<() => void>(),
}));
// Rationale: run the real composition, registry, and lifecycle store without provider, terminal, or user-file effects.
vi.mock("../../src/integrations/pi/components/upstream/theme/theme.js", async importOriginal => ({
  ...await importOriginal<object>(), applyConfiguredPiTheme() {}, getAvailablePiThemes: () => [], setPiAccentColor() {}, setPiPackageBorderProjectionEnabled() {} }));
vi.mock("../../src/integrations/pi/engine/host.js", () => ({ createPiEngineHost: vi.fn() }));
vi.mock("../../src/integrations/pi/tui-runtime/presentation-adapter.js", () => ({ createPiTerminalBridge: vi.fn() }));
vi.mock("../../src/composition/settings-route-host.js", () => ({ createOwnedRouteHost: () => null }));
vi.mock("../../src/integrations/pi/session-presenters/presenters.js", async importOriginal => {
  const original = await importOriginal<typeof import("../../src/integrations/pi/session-presenters/presenters.js")>();
  return { ...original, createPiSessionPresenters(adapter: Parameters<typeof original.createPiSessionPresenters>[0], options: PiSessionPresentersOptions) {
    observed.spinnerSources.push(options.spinner);
    return original.createPiSessionPresenters(adapter, options);
  } };
});
vi.mock("../../src/ui/settings/manager.js", () => ({
  OwnedSettingsManager: class {
    get file() { return "synthetic-agent-settings.json"; }
    refresh() { return false; }
    startSession() { observed.colorStarts++; }
    value(key: string) { return key === "spinnerStyle" ? observed.spinnerStyle : key === "sessionAutoName" ? observed.autoName : key === "sessionNameFormat" ? observed.nameFormat : key === "promptHistoryEnabled" ? false : key === "accentColor" ? "purple" : undefined; }
    onChange(listener: (current: this) => void) {
      const notify = () => listener(this);
      observed.settingsListeners.add(notify);
      return () => observed.settingsListeners.delete(notify);
    }
  },
}));
vi.mock("../../src/app/session-shell/session-shell.js", () => ({
  sessionTerminalHostOptions: () => ({}),
  OwnedUiTerminalHost: class { attach() {} async dispose() {} },
  OwnedUiSessionPresenter: class {},
}));

const execFileAsync = promisify(execFile);
let root: string;
let dataDir: string;
let primary: string;
const runtimeId = "runtime-wiring";
const sessionId = "01a0cac5-4b8c-75b4-86ed-2d6938e13ac2";

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "a1-runtime-wiring-")));
  dataDir = join(root, "data");
  primary = join(root, "primary");
  await execFileAsync("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "fixture\n");
  await execFileAsync("git", ["-C", primary, "add", "README.md"]);
  await execFileAsync("git", ["-C", primary, "-c", "user.name=A1 Test", "-c", "user.email=a1@example.com", "commit", "-m", "fixture"]);
  vi.stubEnv(PRODUCT_IDENTITY.environment.dataDir, dataDir);
  vi.stubEnv(PRODUCT_IDENTITY.environment.configDir, join(root, "config"));
  vi.stubEnv(PRODUCT_IDENTITY.environment.sessionRuntimeId, runtimeId);
  vi.stubEnv(PRODUCT_IDENTITY.environment.clipboardDiagnostics, undefined);
  vi.stubEnv(PRODUCT_IDENTITY.environment.suggestionDiagnostics, undefined);
});
afterEach(async () => {
  observed.readers = [];
  observed.tools = [];
  observed.hosts = [];
  observed.autoName = true;
  observed.nameFormat = "sentence";
  observed.spinnerStyle = "current";
  observed.spinnerSources = [];
  observed.settingsListeners.clear();
  observed.colorStarts = 0;
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

/** Compose exactly as `bin/ui.js` does, adding only the engine-host and release-check test seams. */
async function compose(options: Pick<OwnedUiCompositionOptions, "productMode" | "inspectProcess"> = {}, extra: object = {}) {
  return await composeOwnedUi({
    cwd: primary,
    profileId: "a1",
    productMode: "bare",
    projectTrustPrompt: async () => false as never,
    sessionForkPrompt: async () => null as never,
    ...options,
    checkForNewerRelease: async () => null,
    createEngineHost: async hostOptions => { observed.hosts.push(hostOptions); return ({
      create: async (input: { repositoryContextReader?: RepositoryContextReader; worktreeCwdReader?: WorktreeCwdReader }) => {
        observed.readers.push(input.repositoryContextReader);
        observed.tools.push(input.worktreeCwdReader);
        return { identity: { cwd: primary, agentDir: join(root, "agent") }, session: { onEvent: () => () => {} }, settings: { configuredTheme: () => "dark" }, ...extra };
      },
      setAccentColor() {},
      dispose: async () => {},
    }) as never; },
  });
}

async function sessionFile(id: string): Promise<string> {
  const file = join(root, `${id}.jsonl`);
  await writeFile(file, `${JSON.stringify({ type: "session", version: 3, id, cwd: primary })}\n`);
  return file;
}

async function runtimeRecords(): Promise<Array<Record<string, unknown>>> {
  const directory = join(dataDir, PRODUCT_IDENTITY.state.sessionWorktreeClaimDirectory, "runtimes");
  const names = (await readdir(directory).catch(() => [])).filter(name => name.endsWith(".json"));
  return await Promise.all(names.map(async name => JSON.parse(await readFile(join(directory, name), "utf8")) as Record<string, unknown>));
}

describe("session runtime composition wiring", () => {
  it.each(["bare", "comparison", "no-runtime"] as const)("supplies owner-bound recovery only to claim-owning bare sessions: %s", async mode => {
    if (mode === "no-runtime") vi.stubEnv(PRODUCT_IDENTITY.environment.sessionRuntimeId, undefined);
    const composed = await compose({ productMode: mode === "comparison" ? "comparison" : "bare" });
    try {
      if (mode === "bare") expect(observed.tools.at(-1)?.detach).toBeTypeOf("function");
      else expect(observed.tools.at(-1)).toBeUndefined();
    } finally { await composed.application.dispose(); }
  });
  it("resets color only on committed binding changes and unsubscribes on disposal", async () => {
    const listeners = new Set<() => void>();
    const identity = { cwd: primary, agentDir: join(root, "agent"), sessionBindingGeneration: 1, sessionGeneration: 1 };
    const composed = await compose({}, { identity, session: { onEvent: (listener: () => void) => {
      listeners.add(listener); listener(); return () => { listeners.delete(listener); };
    } } });
    const emit = () => { for (const listener of listeners) listener(); };
    expect(observed.colorStarts).toBe(0);
    identity.sessionGeneration++; emit();
    expect(observed.colorStarts).toBe(0);
    for (const _workflow of ["new", "resume", "fork", "import"]) {
      identity.sessionBindingGeneration++; emit(); emit();
    }
    expect(observed.colorStarts).toBe(4);
    await composed.application.dispose();
    expect(listeners.size).toBe(0);
  });
  it.each(["bare", "comparison"] as const)("wires profile-local spinner choices only into %s", async productMode => {
    observed.spinnerStyle = "circle";
    const composed = await compose({ productMode });
    try {
      const source = observed.spinnerSources.at(-1);
      if (productMode === "comparison") expect(source).toBeUndefined();
      else {
        expect(source!.snapshot()).toBe("circle");
        const before = new Set(observed.settingsListeners);
        const changed = vi.fn();
        const release = source!.onChange(changed);
        observed.spinnerStyle = "diamond";
        for (const listener of observed.settingsListeners) if (!before.has(listener)) listener();
        expect(source!.snapshot()).toBe("diamond");
        expect(changed).toHaveBeenCalledOnce();
        release();
        expect(observed.settingsListeners).toEqual(before);
      }
    } finally { await composed.application.dispose(); }
  });
  it.each(["bare", "comparison"] as const)("supplies product-owned persistent export storage only for %s", async productMode => {
    vi.stubEnv(PRODUCT_IDENTITY.environment.profileHome, root);
    const composed = await compose({ productMode });
    try {
      const reserve = observed.hosts.at(-1)?.workflowHost?.reserveExport;
      if (productMode === "comparison") expect(reserve).toBeUndefined();
      else {
        const selected = await reserve!("session", "html");
        expect(selected.path.startsWith(join(root, ".a1", "exports"))).toBe(true);
        expect(selected.path.startsWith(dataDir)).toBe(false);
        await selected.failed();
      }
    } finally { await composed.application.dispose(); }
  });

  function namingBackend(file: string) {
    const listeners = new Set<(event: unknown) => void>();
    const emit = (event: unknown) => { for (const listener of listeners) listener(event); };
    let state = { sessionFile: file, binding: 1, name: null as string | null, nameEntryId: null as string | null, source: "unnamed", completedContext: null as string | null };
    const complete = vi.fn(async (_request: unknown) => "fix-cache");
    const apply = vi.fn((_expected: unknown, name: string, context: string) => { state = { ...state, name, source: "auto", nameEntryId: name, completedContext: context }; return true; });
    let promptNumber = 0;
    return { complete, apply,
      extra: {
        identity: { cwd: primary, agentDir: join(root, "agent"), sessionBindingGeneration: 1,
          currentHistorySessionId: () => sessionId, currentSessionFile: () => file },
        session: { view: () => ({ transcript: [] }), onEvent: (next: (event: unknown) => void) => { listeners.add(next); return () => { listeners.delete(next); }; } },
        naming: { state: () => state, complete, apply },
      },
      prompt(text: string) { emit({ type: "agent-run-started" }); emit({ type: "transcript-block", block: { id: `prompt-${++promptNumber}`, kind: "user", text } }); },
    };
  }

  it.each([
    ["kebab", "fix-cache"], ["sentence", "Fix cache"], ["title", "Fix Cache"], [undefined, "Fix cache"],
  ] as const)("uses the %s format or Sentence case fallback for naming and context regeneration", async (format, expected) => {
    observed.nameFormat = format;
    const file = await sessionFile(sessionId);
    const backend = namingBackend(file);
    const composed = await compose({}, backend.extra);
    try {
      await observed.readers.at(-1)!(sessionId, file, new AbortController().signal);
      const worktree = join(root, "naming-task");
      await execFileAsync("git", ["-C", primary, "worktree", "add", "-b", "feature/naming", worktree]);
      const identity = { sessionId, sessionFile: file };
      await setSessionRepositoryContext(identity, worktree, { runtimeId });
      backend.prompt("Fix the cache");
      await vi.waitFor(() => expect(backend.apply).toHaveBeenCalledTimes(1), { timeout: 10_000 });
      expect(backend.apply.mock.calls[0]?.[1]).toBe(expected);
      observed.nameFormat = "title";
      await clearSessionRepositoryContext(identity, { runtimeId });
      await setSessionRepositoryContext(identity, worktree, { runtimeId });
      expect(backend.complete).toHaveBeenCalledOnce();
      backend.prompt("Add a search box");
      await vi.waitFor(() => expect(backend.apply).toHaveBeenCalledTimes(2), { timeout: 10_000 });
      expect(backend.apply.mock.calls[1]?.[1]).toBe("Fix Cache");
      expect(backend.complete.mock.calls[1]).toEqual([expect.objectContaining({ prompt: expect.stringContaining("Add a search box") })]);
    } finally { await composed.application.dispose(); }
  });

  it.each(["comparison", "disabled"])("withholds prompt naming in %s mode", async mode => {
    const backend = namingBackend(await sessionFile(sessionId));
    observed.autoName = mode !== "disabled";
    const composed = await compose({ productMode: mode === "comparison" ? "comparison" : "bare" }, backend.extra);
    backend.prompt("Fix cache");
    await new Promise(resolve => setImmediate(resolve));
    expect(backend.complete).not.toHaveBeenCalled();
    await composed.application.dispose();
  });
  it("publishes the primary runtime through the production inspector when the entrypoint injects none", async () => {
    const file = await sessionFile(sessionId);
    const composed = await compose();
    const reader = observed.readers.at(-1);
    expect(reader).toBeTypeOf("function");
    await reader!(sessionId, file, new AbortController().signal);
    expect(await runtimeRecords()).toEqual([expect.objectContaining({
      runtimeId, agentId: "primary", sessionId, sessionFile: file, pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY,
    })]);
    // Invariant: native inventory succeeds for the registered runtime instead of reporting it unavailable.
    await expect(listSessionRepositoryWorktrees({ sessionId, sessionFile: file }, { runtimeId })).resolves.toBeInstanceOf(Array);
    await composed.application.dispose();
    expect(await runtimeRecords()).toEqual([]);
  });

  it("uses an injected inspector instead of the production default", async () => {
    const file = await sessionFile(sessionId);
    const inspectProcess = vi.fn(async (pid: number): Promise<ProcessIdentity | null> => ({ pid, startIdentity: "fixture:injected" }));
    const composed = await compose({ inspectProcess });
    await observed.readers.at(-1)!(sessionId, file, new AbortController().signal);
    expect(inspectProcess).toHaveBeenCalledWith(process.pid);
    expect(await runtimeRecords()).toEqual([expect.objectContaining({ runtimeId, startIdentity: "fixture:injected" })]);
    await composed.application.dispose();
  });

  it("keeps the comparison profile unregistered", async () => {
    const composed = await compose({ productMode: "comparison" });
    expect(observed.readers.at(-1)).toBeUndefined();
    await composed.application.dispose();
    expect(await runtimeRecords()).toEqual([]);
  });

  it("releases only its own runtime and does not take over a worktree another runtime holds", async () => {
    const worktree = join(root, "delivery");
    await execFileAsync("git", ["-C", primary, "worktree", "add", "-b", "fix/example", worktree]);
    const otherIdentity = { sessionId: "other-session", sessionFile: await sessionFile("other-session") };
    const otherRuntime = { runtimeId: "runtime-other", options: { runtimeId: "runtime-other" } };
    // Rationale: the other runtime is this live test process, so the production liveness probe proves it is active.
    await registerSessionRepositoryRuntime(otherIdentity, otherRuntime.runtimeId, { pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY });
    await setSessionRepositoryContext(otherIdentity, worktree, otherRuntime.options);

    const file = await sessionFile(sessionId);
    const composed = await compose();
    await observed.readers.at(-1)!(sessionId, file, new AbortController().signal);
    await expect(setSessionRepositoryContext({ sessionId, sessionFile: file }, worktree, { runtimeId }))
      .rejects.toMatchObject({ code: "worktree-active-in-another-session" });
    await composed.application.dispose();
    expect(await runtimeRecords()).toEqual([expect.objectContaining({ runtimeId: "runtime-other", sessionId: "other-session" })]);
    const inventory = await listSessionRepositoryWorktrees(otherIdentity, otherRuntime.options);
    expect(inventory.find(entry => entry.branch === "fix/example")?.status).toBe("current");
  });
});
