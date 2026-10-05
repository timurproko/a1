import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { createPiEngineAdapter, type PiWorkflowHost } from "../../../src/integrations/pi/engine/index.js";
import type { UiRouteHost, UiRouteInput, UiRouteSurface } from "../../../src/ui/apps/index.js";
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
    if (data === ESC) this.close();
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
    createRuntime: async () => engine as unknown as AgentSessionRuntime,
    workflowHost: { copyText: async () => {}, runCommand: async () => ({ stdout: "", stderr: "" }), readChangelog },
  });
  const terminal = new TestPresentationTerminal();
  const routes = options.routes === undefined ? routeHost() : options.routes;
  const shell = new OwnedUiSessionShell({
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

describe("bare A1 reference command screens", () => {
  it.each(["session", "changelog", "hotkeys"])("opens /%s as an owned screen without a feed document and restores the viewport on Esc", async route => {
    const { shell, terminal, routes, adapter, engine } = await shellFixture({ customViewport: true });
    const workflow = vi.spyOn(adapter, "executeWorkflow");
    shell.start();
    shell.runtime.renderNow();
    const before = feed(shell);
    expect(before).not.toContain("Session Info");
    expect(before).not.toContain("What's New");
    expect(before).not.toContain("Keyboard Shortcuts");

    shell.root.editor.setText(`/${route}`);
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
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

  it("dismisses a stale dock notice when the session reference screen opens", async () => {
    const { shell, terminal, routes } = await shellFixture({ customViewport: true });
    shell.start();
    shell.root.appendWorkflowMessage({ kind: "warning", message: "stale route notice" });
    expect(feed(shell)).toContain("stale route notice");

    shell.root.editor.setText("/session");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(routes!.opens).toEqual([{ route: "session", input: undefined }]);
    expect(feed(shell)).not.toContain("stale route notice");
    expect(feed(shell)).not.toContain("Session Info");
    terminal.input(ESC);
    await shell.dispose();
  });

  it("keeps the in-feed documents in the pinned layout without a route host", async () => {
    const { shell, adapter } = await shellFixture({ customViewport: false, routes: null });
    vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => request.command === "session"
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

