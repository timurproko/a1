import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOwnedRouteHost } from "../../../src/composition/index.js";
import { createPiEngineAdapter, type PiWorkflowHost } from "../../../src/integrations/pi/engine/index.js";
import { createPiSessionPresenters } from "../../../src/integrations/pi/session-presenters/index.js";
import type { UiRouteHost, UiRouteInput, UiRouteSurface } from "../../../src/ui/apps/index.js";
import { OwnedSettingsManager } from "../../../src/ui/settings/index.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { Runtime } from "./session-shell-fixture.js";

const ESC = "\u001b";
const NEW_ENTRIES = "## 0.85.1\n\n- **Reference screens** for the release notes";

/** A route host that records every open and hands back a surface the test can close. */
function routeHost(routes: readonly string[] = ["settings", "session", "changelog", "hotkeys"]) {
  const opens: { route: string; input: UiRouteInput | undefined }[] = [];
  const surfaces: FakeSurface[] = [];
  const host: UiRouteHost = {
    claims: route => routes.includes(route),
    open: (route, input) => {
      if (!routes.includes(route)) return null;
      opens.push({ route, input });
      const surface = new FakeSurface(route);
      surfaces.push(surface);
      return surface;
    },
  };
  return { host, opens, surfaces };
}

class FakeSurface implements UiRouteSurface {
  readonly id: string;
  readonly inputs: string[] = [];
  readonly mouse: number[] = [];
  #closed = false;
  #onRender: () => void = () => {};
  constructor(id: string) { this.id = id; }
  render(width: number, height: number): readonly string[] {
    return Array.from({ length: height }, (_row, index) => (index === 0 ? `SCREEN ${this.id}` : "").padEnd(width).slice(0, width));
  }
  handleInput(data: string): boolean {
    this.inputs.push(data);
    if (data === ESC || data === "\u0003") this.close();
    return true;
  }
  handleMouse(): boolean { this.mouse.push(1); return true; }
  isClosed(): boolean { return this.#closed; }
  close(): void { this.#closed = true; this.#onRender(); }
  onRenderRequested(listener: () => void): void { this.#onRender = listener; }
  onExitRequested(): void {}
}

/** Pinned changelog bookkeeping on the runtime double, so startup announces new entries. */
function withChangelog(engine: Runtime, lastVersion: string | undefined, collapsed = false) {
  const stored: { version: string | undefined; flushes: number } = { version: lastVersion, flushes: 0 };
  Object.assign(engine.services.settingsManager, {
    getLastChangelogVersion: () => stored.version,
    setLastChangelogVersion: (version: string) => { stored.version = version; },
    getCollapseChangelog: () => collapsed,
    flush: async () => { stored.flushes += 1; },
  });
  return stored;
}

async function shellFixture(options: {
  readonly customViewport: boolean;
  readonly routes?: ReturnType<typeof routeHost> | null;
  readonly lastVersion?: string;
  readonly collapsed?: boolean;
  readonly readChangelog?: PiWorkflowHost["readChangelog"];
  readonly startupRoute?: { readonly route: string; readonly input?: UiRouteInput; readonly onClosed?: () => void | Promise<void> };
}) {
  const engine = new Runtime([]);
  const stored = options.lastVersion === undefined ? null : withChangelog(engine, options.lastVersion, options.collapsed ?? false);
  const readChangelog = vi.fn(options.readChangelog ?? (async (since?: string) => (since === undefined ? "# Changelog\n\n## 0.85.1\n\n- complete" : NEW_ENTRIES)));
  const adapter = await createPiEngineAdapter({
    cwd: "D:/work",
    sessionId: "owned-shell",
    settingsProductMode: options.customViewport ? "bare" : "comparison",
    createRuntime: async () => engine as unknown as AgentSessionRuntime,
    workflowHost: { copyText: async () => {}, runCommand: async () => ({ stdout: "", stderr: "" }), readChangelog },
  });
  // Invariant: the engine host announces the changelog once per process; the fixture stands in for it.
  if (options.lastVersion !== undefined) await adapter.announcements.startupChangelog();
  const terminal = new TestPresentationTerminal();
  const routes = options.routes === undefined ? routeHost() : options.routes;
  const shell = new OwnedUiSessionShell({
    presenters: createPiSessionPresenters(adapter),
    engine: {
      backend: adapter,
      cwd: "D:/work",
      ...(routes === null ? {} : { routeHost: routes.host }),
      ...(options.startupRoute === undefined ? {} : { startupRoute: options.startupRoute }),
      ...(options.customViewport ? { sessionLayout: "custom-viewport" as const } : {}),
    },
    presentation: { terminal, reload: { minVisibleMs: 0 } },
  });
  return { engine, adapter, terminal, shell, routes, stored, readChangelog };
}

function feed(shell: OwnedUiSessionShell, width = 100): string {
  return stripTerminalSequences(shell.root.render(width).join("\n"));
}

async function openReference(shell: OwnedUiSessionShell, terminal: TestPresentationTerminal, route: string): Promise<void> {
  if (route === "settings" || route === "changelog" || route === "hotkeys") {
    terminal.input("\u0010"); await vi.dynamicImportSettled();
    terminal.input(route); terminal.input("\r"); await vi.dynamicImportSettled();
  } else {
    shell.root.editor.setText(`/${route}`); terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

describe("bare A1 reference screens", () => {
  it("does not dispatch the removed bare-A1 Hotkeys built-in command or shadow unrelated slash input", async () => {
    const { shell, adapter, engine, routes } = await shellFixture({ customViewport: true });
    const workflow = vi.spyOn(adapter.workflows, "executeWorkflow");
    shell.start();
    try {
      await shell.submit("/hotkeys");
      expect(workflow).not.toHaveBeenCalled();
      expect(routes!.opens).toEqual([]);
      expect(engine.session.calls).toContain("prompt:/hotkeys");
      expect(shell.runtime.hasOverlay()).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["changelog", "hotkeys"])("opens %s as an owned screen without a feed document and restores the viewport on Esc", async route => {
    const { shell, terminal, routes, adapter, engine } = await shellFixture({ customViewport: true });
    const workflow = vi.spyOn(adapter.workflows, "executeWorkflow");
    shell.start();
    shell.runtime.renderNow();
    const before = feed(shell);
    expect(before).not.toContain("Session Info");
    expect(before).not.toContain("What's New");
    expect(before).not.toContain("Keyboard Shortcuts");

    await openReference(shell, terminal, route);
    expect(routes!.opens).toEqual([{ route, input: undefined }]);
    expect(workflow).not.toHaveBeenCalled();
    expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
    expect(shell.root.editor.getText()).toBe("");
    expect(shell.runtime.hasOverlay()).toBe(true);
    shell.runtime.renderNow();
    expect(terminal.writes.join("")).toContain(`SCREEN ${route}`);
    expect(terminal.writes.some(write => write.includes("[?1003h"))).toBe(true);
    // Invariant: the feed gains nothing: no document, status, or checkmark row.
    expect(feed(shell)).toBe(before);

    terminal.input("\u001b[<0;20;4M");
    expect(routes!.surfaces[0]!.mouse).toHaveLength(1);
    terminal.input(ESC);
    expect(routes!.surfaces[0]!.isClosed()).toBe(true);
    expect(shell.runtime.hasOverlay()).toBe(false);
    // Invariant: the custom viewport keeps its own pointer reporting after the screen closes.
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(false);
    expect(feed(shell)).toBe(before);
    await shell.dispose();
  });

  it.each(["settings", "changelog", "hotkeys"])("closes the %s fullscreen route on one Ctrl+C", async route => {
    const { shell, terminal, routes, adapter } = await shellFixture({ customViewport: true });
    shell.start();
    await openReference(shell, terminal, route);
    expect(shell.runtime.hasOverlay()).toBe(true);

    terminal.input("\u0003");

    expect(routes!.surfaces[0]!.inputs).toContain("\u0003");
    expect(routes!.surfaces[0]!.isClosed()).toBe(true);
    expect(shell.runtime.hasOverlay()).toBe(false);
    expect(adapter.view().lifecycle).not.toBe("stopped");
    await shell.dispose();
  });

  it("dismisses a stale dock notice when the session reference screen opens", async () => {
    const { shell, terminal, routes } = await shellFixture({ customViewport: true });
    shell.start();
    shell.root.workflow.appendMessage({ kind: "warning", message: "stale route notice" });
    expect(feed(shell)).toContain("stale route notice");

    shell.root.editor.setText("/session");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(routes!.opens).toEqual([{ route: "session", input: undefined }]);
    expect(feed(shell)).not.toContain("stale route notice");
    expect(shell.runtime.hasOverlay()).toBe(false);
    expect(feed(shell)).toContain("SCREEN session");
    terminal.input(ESC);
    await shell.dispose();
  });

  it.each([ESC, "\u0003", "\u001b[99;5u"])("opens Session Info in the dock and restores input on %j", async close => {
    const { shell, terminal, routes, engine } = await shellFixture({ customViewport: true });
    shell.start();
    shell.root.editor.setText("retained draft");
    const before = feed(shell);
    shell.openOwnedRoute("session");
    expect(shell.runtime.hasOverlay()).toBe(false);
    expect(shell.root.usesDefaultInputSurface()).toBe(false);
    const frame = feed(shell);
    expect(frame).toContain("SCREEN session");
    expect(frame).toContain("D:/work");
    expect(frame.split("\n")).toHaveLength(24);
    terminal.input(close);
    expect(routes!.surfaces[0]!.isClosed()).toBe(true);
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    expect(shell.root.editor.getText()).toBe("retained draft");
    expect(feed(shell)).toBe(before);
    expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
    await shell.dispose();
  });

  it("disposes an in-place route when another input replaces it or the shell stops", async () => {
    const { shell, routes } = await shellFixture({ customViewport: true });
    shell.start();
    shell.openOwnedRoute("session");
    shell.root.setInputSurface({ render: () => ["replacement"], invalidate: () => {} });
    expect(routes!.surfaces[0]!.isClosed()).toBe(true);
    shell.root.setInputSurface(null);
    shell.openOwnedRoute("session");
    await shell.dispose();
    expect(routes!.surfaces[1]!.isClosed()).toBe(true);
  });

  it("keeps the in-feed documents in the pinned layout without a route host", async () => {
    const { shell, adapter } = await shellFixture({ customViewport: false, routes: null });
    vi.spyOn(adapter.workflows, "executeWorkflow").mockImplementation(async request => request.command === "session"
      ? {
          command: request.command, outcome: "completed", message: "Session Info",
          presentation: {
            kind: "session-info",
            stats: {
              sessionId: "pinned-session", userMessages: 1, assistantMessages: 1, toolCalls: 0, toolResults: 0, totalMessages: 2,
              tokens: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, total: 15 }, cost: 0,
            },
            cacheWaste: { missedTokens: 0, missedCost: 0, missCount: 0 }, usageBreakdown: [], cacheWarming: { mode: "streaming" },
          },
        }
      : request.command === "changelog"
        ? { command: request.command, outcome: "completed", message: "What's New", detail: "## 0.85.1\n\n- pinned entry" }
        : { command: request.command, outcome: "completed", message: "Keyboard Shortcuts" });
    shell.start();
    await shell.submit("/session");
    await shell.submit("/changelog");
    await shell.submit("/hotkeys");
    const plain = feed(shell);
    expect(plain).toContain("Session Info");
    expect(plain).toContain("Messages");
    expect(plain).toContain("What's New");
    expect(plain).toContain("pinned entry");
    expect(plain).toContain("Keyboard Shortcuts");
    expect(shell.runtime.hasOverlay()).toBe(false);
    await shell.dispose();
  });

  it("reports the current bindings and extension shortcuts for the hotkeys screen", async () => {
    const { shell } = await shellFixture({ customViewport: true });
    shell.start();
    const presentation = shell.hotkeysPresentation();
    expect(presentation.profile).toBe("a1");
    expect(presentation.bindings).toBeDefined();
    expect(presentation.getShortcuts?.(presentation.bindings!)).toEqual([]);
    await shell.dispose();
  });
});

describe("bare A1 startup release notes", () => {
  it("opens the packaged current note after the first frame and acknowledges only after a rendered close", async () => {
    const closed = vi.fn();
    const input = { document: "# A1 1.2.3\n\n- reviewed note\n" };
    const { shell, routes, terminal } = await shellFixture({
      customViewport: true,
      startupRoute: { route: "changelog", input, onClosed: closed },
    });
    shell.start();
    expect(routes!.opens).toEqual([]);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(routes!.opens).toEqual([{ route: "changelog", input }]);
    expect(shell.runtime.hasOverlay()).toBe(true);
    expect(closed).not.toHaveBeenCalled();
    shell.runtime.renderNow();
    terminal.input(ESC);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(shell.runtime.hasOverlay()).toBe(false);
    expect(feed(shell)).not.toContain("Run /changelog to view the full release notes.");
    await shell.dispose();
  });

  it("defers the startup note behind an existing safety modal", async () => {
    const closed = vi.fn();
    const { shell, routes, terminal } = await shellFixture({
      customViewport: true,
      startupRoute: { route: "changelog", onClosed: closed },
    });
    shell.start();
    shell.showSelector("Choose", [{ id: "one", label: "One" }], () => {});
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(routes!.opens).toEqual([]);
    terminal.input(ESC);
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(routes!.opens).toEqual([{ route: "changelog", input: undefined }]);
    shell.runtime.renderNow();
    terminal.input(ESC);
    expect(closed).toHaveBeenCalledTimes(1);
    await shell.dispose();
  });

  it("retains a route requested before start and opens it exactly once after start", async () => {
    const { shell, routes } = await shellFixture({ customViewport: true });
    shell.openOwnedRoute("changelog");
    shell.openOwnedRoute("settings");
    expect(routes!.opens).toEqual([]);
    shell.start();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(routes!.opens).toEqual([{ route: "settings", input: undefined }]);
    expect(shell.runtime.hasOverlay()).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(routes!.opens).toHaveLength(1);
    await shell.dispose();
  });

  it("reports a route that cannot open instead of dropping it", async () => {
    const { shell } = await shellFixture({ customViewport: true, routes: routeHost(["changelog"]) });
    shell.start();
    shell.openOwnedRoute("settings");
    expect(feed(shell)).toContain("route is unavailable: settings");
    await shell.dispose();
  });

  it("does not acknowledge when the startup route cannot render", async () => {
    const closed = vi.fn();
    const { shell } = await shellFixture({ customViewport: true, routes: null, startupRoute: { route: "changelog", onClosed: closed } });
    shell.start();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(closed).not.toHaveBeenCalled();
    expect(shell.runtime.hasOverlay()).toBe(false);
    await shell.dispose();
  });

  it("keeps the pinned layout's in-feed document and opens no screen", async () => {
    const { shell, routes, adapter } = await shellFixture({ customViewport: false, lastVersion: "0.84.0" });
    expect(adapter.view().diagnostics).toContainEqual(expect.objectContaining({ code: "changelog-expanded" }));
    shell.start();
    expect(routes!.opens).toEqual([]);
    expect(shell.runtime.hasOverlay()).toBe(false);
    const plain = feed(shell);
    expect(plain).toContain("What's New");
    expect(plain).toContain("Reference screens");
    expect(plain).not.toContain("Run /changelog to view the full release notes.");
    await shell.dispose();
  });
});


describe("owned screens decode legacy and kitty keys alike", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  /** The real Changelog screen behind the shell's route boundary, recording each opened surface. */
  async function changelogRoutes(sessionReady: Promise<void> = Promise.resolve()) {
    const root = mkdtempSync(path.join(tmpdir(), "a1-kitty-keys-"));
    roots.push(root);
    const settings = new OwnedSettingsManager({ configDir: root, profileId: "a1", declarations: [], agent: null });
    await settings.load();
    const rows = Array.from({ length: 40 }, (_row, index) => `row ${String(index + 1).padStart(2, "0")}`);
    const real = createOwnedRouteHost(settings, {
      changelog: async () => ({ rows: () => rows }),
      hotkeys: async () => ({ rows: () => rows }),
      session: async () => { await sessionReady; return { rows: () => rows }; },
    });
    const surfaces: UiRouteSurface[] = [];
    const host: UiRouteHost = {
      claims: route => real.claims(route),
      open: (route, input) => {
        const surface = real.open(route, input);
        if (surface !== null) surfaces.push(surface);
        return surface;
      },
    };
    return { host, surfaces, opens: [] };
  }

  async function firstRow(surface: UiRouteSurface, expected: string): Promise<string> {
    let row = "";
    for (let attempt = 0; attempt < 200; attempt += 1) {
      row = stripTerminalSequences(surface.render(60, 10)[2] ?? "");
      if (row.startsWith(expected)) break;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    return row;
  }

  it("closes Session Info before its document loads without resurrecting the dock", async () => {
    let release!: () => void;
    const routes = await changelogRoutes(new Promise<void>(resolve => { release = resolve; }));
    const { shell, terminal } = await shellFixture({ customViewport: true, routes: routes as unknown as ReturnType<typeof routeHost> });
    shell.start();
    shell.openOwnedRoute("session");
    terminal.input(ESC);
    expect(routes.surfaces[0]!.isClosed()).toBe(true);
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    release();
    await vi.dynamicImportSettled();
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    expect(feed(shell)).not.toContain("Session Info");
    await shell.dispose();
  });

  it("bounds Session Info, routes local wheel input, and leaves transcript gestures outside the dock", async () => {
    const routes = await changelogRoutes();
    const { shell, terminal } = await shellFixture({ customViewport: true, routes: routes as unknown as ReturnType<typeof routeHost> });
    shell.start();
    shell.openOwnedRoute("session");
    const surface = routes.surfaces[0]!;
    await firstRow(surface, "row 01");
    const mouse = vi.spyOn(surface, "handleMouse");
    let frame = shell.root.render(80).map(stripTerminalSequences);
    const start = frame.findIndex(row => row.startsWith("─"));
    expect(start).toBeGreaterThan(0);
    terminal.input(`\u001b[<65;20;${start + 4}M`);
    expect(mouse).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "wheel-down", column: 20, row: 4 }));
    const calls = mouse.mock.calls.length;
    terminal.input("\u001b[<64;20;1M");
    expect(mouse).toHaveBeenCalledTimes(calls);
    terminal.resize(40, 12);
    frame = shell.root.render(40).map(stripTerminalSequences);
    expect(frame).toHaveLength(12);
    expect(frame.some(row => row.includes("Esc close"))).toBe(true);
    expect(frame.at(-1)).toContain("gpt");
    terminal.input("\u001b[1;1B");
    terminal.input(ESC);
    expect(surface.isClosed()).toBe(true);
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    await shell.dispose();
  });

  it.each([
    { name: "legacy", up: `${ESC}[A`, down: `${ESC}[B`, close: ESC },
    { name: "kitty", up: `${ESC}[1;1A`, down: `${ESC}[1;1B`, close: `${ESC}[27u` },
  ])("scrolls and closes the Changelog with $name keys", async keys => {
    const routes = await changelogRoutes();
    const { shell, terminal } = await shellFixture({ customViewport: true, routes: routes as unknown as ReturnType<typeof routeHost> });
    shell.start();
    shell.openOwnedRoute("changelog");
    const surface = routes.surfaces[0]!;
    expect(await firstRow(surface, "row 01")).toMatch(/^row 01/u);
    terminal.input(keys.down);
    terminal.input(keys.down);
    expect(await firstRow(surface, "row 03")).toMatch(/^row 03/u);
    terminal.input(keys.up);
    expect(await firstRow(surface, "row 02")).toMatch(/^row 02/u);
    expect(surface.isClosed()).toBe(false);
    terminal.input(keys.close);
    expect(surface.isClosed()).toBe(true);
    expect(shell.runtime.hasOverlay()).toBe(false);
    await shell.dispose();
  });

  it.each([["legacy", "\u0003"], ["kitty", `${ESC}[99;5u`]])("closes the Changelog on one %s Ctrl+C", async (_name, interrupt) => {
    const routes = await changelogRoutes();
    const { shell, terminal, adapter } = await shellFixture({ customViewport: true, routes: routes as unknown as ReturnType<typeof routeHost> });
    shell.start();
    shell.openOwnedRoute("changelog");
    const surface = routes.surfaces[0]!;
    expect(await firstRow(surface, "row 01")).toMatch(/^row 01/u);
    terminal.input(interrupt);
    expect(surface.isClosed()).toBe(true);
    expect(shell.runtime.hasOverlay()).toBe(false);
    expect(adapter.view().lifecycle).not.toBe("stopped");
    await shell.dispose();
  });
});
