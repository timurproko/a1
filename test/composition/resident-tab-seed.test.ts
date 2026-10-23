import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindResidentAgentTab } from "../../src/composition/resident-tab-bridge.js";
import { bindResidentTabSeed } from "../../src/composition/resident-tab-seed.js";
import type { TabBridgeCommand } from "../../src/foundation/resident-tabs/bridge-client.js";
import { SEED_PROMPT_FILE, SEED_PROMPT_SCHEMA } from "../../src/foundation/resident-tabs/seed-prompt.js";

const directories: string[] = [];
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.useRealTimers();
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true });
});

function writeSeed(dataDir: string, text: string): string {
  const file = join(dataDir, SEED_PROMPT_FILE);
  writeFileSync(file, JSON.stringify({ schema: SEED_PROMPT_SCHEMA, text }));
  return file;
}

function fixture() {
  const dataDir = mkdtempSync(join(tmpdir(), "a1-tab-seed-"));
  directories.push(dataDir);
  const listeners = new Set<(command: TabBridgeCommand) => void>();
  const screen = { active: false, overlay: false, defaultInput: true, dialog: null as unknown };
  const submit = vi.fn(async (_text: string) => undefined);
  const acknowledge = vi.fn();
  const ports = {
    dataDir,
    presenter: {
      submit,
      view: () => ({ dialog: screen.dialog }),
      root: { usesDefaultInputSurface: () => screen.defaultInput },
    },
    runtime: { get active() { return screen.active; }, hasOverlay: () => screen.overlay },
  };
  const bridge = {
    onCommand: (listener: (command: TabBridgeCommand) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    dataDir,
    screen,
    submit,
    acknowledge,
    ports,
    bridge,
    listeners,
    announce: () => { for (const listener of listeners) listener({ type: "seed", acknowledge }); },
  };
}

describe("resident tab seeded first prompt", () => {
  it("submits a seed present at bind once the shell runs with a free screen", () => {
    const value = fixture();
    const file = writeSeed(value.dataDir, "What does this repository build?");
    const unbind = bindResidentTabSeed(value.bridge, value.ports);
    expect(existsSync(file), "the file is consumed at once").toBe(false);
    vi.advanceTimersByTime(500);
    expect(value.submit, "the shell is not running yet").not.toHaveBeenCalled();
    value.screen.active = true;
    value.screen.overlay = true;
    vi.advanceTimersByTime(500);
    expect(value.submit, "a startup route or dialog overlay comes first").not.toHaveBeenCalled();
    value.screen.overlay = false;
    vi.advanceTimersByTime(500);
    expect(value.submit).toHaveBeenCalledExactlyOnceWith("What does this repository build?");
    // Invariant: the admission notice for the seed already taken submits nothing more.
    value.announce();
    vi.advanceTimersByTime(500);
    expect(value.submit).toHaveBeenCalledOnce();
    expect(value.acknowledge).toHaveBeenCalledOnce();
    unbind();
    expect(value.listeners.size).toBe(0);
  });

  it("submits a seed the server announces after a standby promotion", () => {
    const value = fixture();
    value.screen.active = true;
    bindResidentTabSeed(value.bridge, value.ports);
    vi.advanceTimersByTime(500);
    expect(value.submit).not.toHaveBeenCalled();
    writeSeed(value.dataDir, "Explain the build");
    value.announce();
    expect(value.acknowledge).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(500);
    expect(value.submit).toHaveBeenCalledExactlyOnceWith("Explain the build");
  });

  it("waits while a dialog or replacement input surface holds the screen", () => {
    const value = fixture();
    value.screen.active = true;
    value.screen.dialog = { id: "trust" };
    writeSeed(value.dataDir, "prompt");
    bindResidentTabSeed(value.bridge, value.ports);
    vi.advanceTimersByTime(500);
    value.screen.dialog = null;
    value.screen.defaultInput = false;
    vi.advanceTimersByTime(500);
    expect(value.submit).not.toHaveBeenCalled();
    value.screen.defaultInput = true;
    vi.advanceTimersByTime(30);
    expect(value.submit, "a momentarily free screen is not enough").not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(value.submit).toHaveBeenCalledOnce();
  });

  it("never submits a seed after the tab unbinds", () => {
    const value = fixture();
    writeSeed(value.dataDir, "prompt");
    const unbind = bindResidentTabSeed(value.bridge, value.ports);
    unbind();
    value.screen.active = true;
    vi.advanceTimersByTime(500);
    expect(value.submit).not.toHaveBeenCalled();
  });

  it.each([
    { tabId: "tab-1", consumed: true },
    { tabId: "settings-1", consumed: false },
  ])("binds the lazily loaded seed consumer only for an Agent tab ($tabId)", async ({ tabId, consumed }) => {
    vi.useRealTimers();
    const value = fixture();
    writeSeed(value.dataDir, "prompt");
    const tabBridge = {
      tabId,
      start: vi.fn(async () => true),
      status: vi.fn(), session: vi.fn(), prompt: vi.fn(),
      onCommand: vi.fn(value.bridge.onCommand),
    };
    const backend = {
      identity: { currentSessionResumeMetadata: () => null },
      session: { view: () => ({ lifecycle: "ready", status: { footer: {} }, transcript: [] }), onEvent: () => () => {} },
      workflows: { executeWorkflow: vi.fn() },
      generateResidentTabName: vi.fn(),
    };
    const unbind = await bindResidentAgentTab(tabBridge as never, backend as never, null, {}, value.ports);
    await vi.waitFor(() => expect(value.listeners.size, "composition always listens; the seed consumer joins it").toBe(consumed ? 2 : 1));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(existsSync(join(value.dataDir, SEED_PROMPT_FILE)), "only an Agent tab reads its seed").toBe(!consumed);
    unbind();
  });
});
