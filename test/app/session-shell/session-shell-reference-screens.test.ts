import { VERSION, type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";
import { createPiEngineAdapter, type PiWorkflowHost } from "../../../src/integrations/pi/engine/index.js";
import type { UiRouteHost, UiRouteInput, UiRouteSurface } from "../../../src/ui/apps/index.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { Runtime } from "./session-shell-fixture.js";

const ESC = "\u001b";
const CHANGELOG_NOTICE = "Run /changelog to view the full release notes.";
const NEW_ENTRIES = "## 0.85.1\n\n- **Reference screens** for the release notes";

/** A route host that records every open and hands back a surface the test can close. */
function routeHost(routes: readonly string[] = ["settings", "changelog", "hotkeys"]) {
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
  it.each(["changelog", "hotkeys"])("opens /%s as an owned screen without a feed document and restores the viewport on Esc", async route => {
    const { shell, terminal, routes, adapter, engine } = await shellFixture({ customViewport: true });
    const workflow = vi.spyOn(adapter, "executeWorkflow");
    shell.start();
    shell.runtime.renderNow();
    const before = feed(shell);
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

  it("keeps the in-feed documents in the pinned layout without a route host", async () => {
    const { shell, adapter } = await shellFixture({ customViewport: false, routes: null });
    vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => request.command === "changelog"
      ? { command: request.command, outcome: "completed", message: "What's New", detail: "## 0.85.1\n\n- pinned entry" }
      : { command: request.command, outcome: "completed", message: "Keyboard Shortcuts" });
    shell.start();
    await shell.submit("/changelog");
    await shell.submit("/hotkeys");
    const plain = feed(shell);
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
  it("shows expanded release notes once as a transient dock notice without opening a screen", async () => {
    const { shell, routes, stored, readChangelog, adapter, engine } = await shellFixture({ customViewport: true, lastVersion: "0.84.0" });
    expect(readChangelog).toHaveBeenCalledWith("0.84.0");
    expect(adapter.view().diagnostics).toContainEqual(expect.objectContaining({ code: "changelog-expanded", message: NEW_ENTRIES }));
    expect(stored!.version).toBe(VERSION);
    shell.start();
    expect(routes!.opens).toEqual([]);
    expect(shell.runtime.hasOverlay()).toBe(false);
    let plain = feed(shell);
    expect(plain).toContain(CHANGELOG_NOTICE);
    expect(plain).not.toContain("What's New");
    expect(plain).not.toContain("Reference screens");
    expect(shell.root.exitTranscript(100)).toBe("");
    expect(shell.root.viewportFrameDescriptor()?.nextDocumentRange.end).toBe(0);

    const streamed = { role: "assistant", timestamp: 10, content: [{ type: "text", text: "streamed after startup" }] };
    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: streamed });
    await adapter.flushEvents();
    plain = feed(shell);
    expect(plain.indexOf(CHANGELOG_NOTICE)).toBeGreaterThan(plain.indexOf("streamed after startup"));
    expect(shell.root.exitTranscript(100)).not.toContain(CHANGELOG_NOTICE);

    // Invariant: a retained diagnostic cannot recreate the changelog notice after a newer status replaces it.
    shell.root.appendWorkflowStatus("Newer informational notice");
    engine.session.emit({ type: "agent_end", messages: [streamed] });
    await adapter.flushEvents();
    plain = feed(shell);
    expect(plain).toContain("Newer informational notice");
    expect(plain).not.toContain(CHANGELOG_NOTICE);
    expect(routes!.opens).toEqual([]);

    engine.session.emit({ type: "message_start", message: { role: "user", timestamp: 11, content: [{ type: "text", text: "next prompt" }] } });
    await adapter.flushEvents();
    plain = feed(shell);
    expect(plain).toContain("next prompt");
    expect(plain).not.toContain("Newer informational notice");
    expect(plain).not.toContain(CHANGELOG_NOTICE);
    expect(stored!.version).toBe(VERSION);
    await shell.dispose();
  });

  it("shows the same one-line transient notice when the changelog is collapsed", async () => {
    const { shell, routes, adapter } = await shellFixture({ customViewport: true, lastVersion: "0.84.0", collapsed: true });
    expect(adapter.view().diagnostics).toContainEqual(expect.objectContaining({ code: "changelog-collapsed" }));
    shell.start();
    expect(routes!.opens).toEqual([]);
    expect(shell.runtime.hasOverlay()).toBe(false);
    const plain = feed(shell);
    expect(plain).toContain(CHANGELOG_NOTICE);
    expect(plain).not.toContain("What's New");
    expect(plain).not.toContain("Reference screens");
    expect(shell.root.exitTranscript(100)).toBe("");
    await shell.dispose();
  });

  it("keeps the transient notice behind an existing modal and leaves the full changelog on demand", async () => {
    const { shell, routes, adapter, engine, terminal } = await shellFixture({ customViewport: true });
    shell.start();
    shell.showSelector("Choose", [{ id: "one", label: "One" }], () => {});
    expect(shell.runtime.hasOverlay()).toBe(true);
    const original = adapter.view.bind(adapter);
    vi.spyOn(adapter, "view").mockImplementation((): OwnedUiSessionViewModel => {
      const view = original();
      return { ...view, diagnostics: [...view.diagnostics, { sequence: 900, code: "changelog-expanded", severity: "info", message: NEW_ENTRIES, recoverable: true }] };
    });
    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "agent_end" });
    await adapter.flushEvents();
    expect(routes!.opens).toEqual([]);
    expect(feed(shell)).toContain(CHANGELOG_NOTICE);

    terminal.input(ESC);
    expect(shell.runtime.hasOverlay()).toBe(false);
    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "agent_end" });
    await adapter.flushEvents();
    expect(routes!.opens).toEqual([]);
    expect(feed(shell)).toContain(CHANGELOG_NOTICE);
    // Rationale: the complete changelog remains one command away.
    await shell.submit("/changelog");
    expect(routes!.opens).toEqual([{ route: "changelog", input: undefined }]);
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

