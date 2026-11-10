import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { createPiSessionPresenters } from "../../../src/integrations/pi/session-presenters/index.js";
import type { UiRouteSurface } from "../../../src/ui/apps/contracts.js";
import { Runtime } from "./session-shell-fixture.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { replayTerminalPaint } from "../../support/rendering/terminal-paint-evidence.js";

const APPS = "\u0010";
const ESC = "\u001b";
const ENTER = "\r";

describe("session application switching", () => {
  it("opens Apps over Agent and routes, retains the draft, closes replaced apps, and isolates keyboard and pointer input", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-apps-"));
    const engine = new Runtime([{ role: "assistant", content: [{ type: "text", text: "transcript selection target\n\n".repeat(120) }] }]);
    const adapter = await createPiEngineAdapter({ cwd: "D:/work", agentDir, sessionId: "apps-test", createRuntime: async () => engine as unknown as AgentSessionRuntime });
    const terminal = new TestPresentationTerminal();
    const surfaces: { route: string; input: ReturnType<typeof vi.fn>; mouse: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }[] = [];
    const shell = new OwnedUiSessionShell({
      presenters: createPiSessionPresenters(adapter),
      engine: { backend: adapter, cwd: "D:/work", sessionLayout: "custom-viewport", routeHost: {
        claims: route => ["settings", "changelog"].includes(route),
        open: route => {
          const state = { route, input: vi.fn(), mouse: vi.fn(), close: vi.fn() };
          surfaces.push(state);
          let closed = false;
          const surface: UiRouteSurface = {
            id: route, render: (width, height) => Array.from({ length: height }, () => route.padEnd(width)),
            handleInput: key => { state.input(key); return true; }, handleMouse: event => { state.mouse(event); return true; },
            close: () => { closed = true; state.close(); }, isClosed: () => closed,
            onRenderRequested() {}, onExitRequested() {},
          };
          return surface;
        },
      } },
      presentation: { terminal, reload: { minVisibleMs: 0 } },
    });
    shell.start();
    const text = async () => {
      await vi.dynamicImportSettled();
      shell.runtime.renderNow(true);
      const paint = await replayTerminalPaint(terminal.writes.map(data => ({ data, atMs: 0 })), {
        columns: terminal.columns, rows: terminal.rows, synchronizedUpdates: "honor",
      });
      return paint.final.rows.join("\n");
    };
    try {
      shell.root.editor.setText("unfinished draft");
      terminal.input(APPS);
      expect(await text()).toContain("Apps");
      terminal.input("set"); terminal.input(ENTER);
      expect(await text()).toContain("settings");
      expect(surfaces.map(surface => surface.route)).toEqual(["settings"]);
      const scroll = shell.root.viewportPresentationEvidence().scrollTop;
      const copiedAt = terminal.writes.length;
      terminal.input("\u001b[<64;3;3M\u001b[<0;2;3M\u001b[<32;7;3M\u001b[<0;7;3m");
      await new Promise(resolve => setImmediate(resolve));
      expect(surfaces[0]!.mouse).toHaveBeenCalledTimes(4);
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(scroll);
      expect(terminal.writes.slice(copiedAt).join("")).not.toContain("\u001b]52;c;");
      expect(shell.root.editor.getText()).toBe("unfinished draft");
      terminal.input(APPS);
      expect(await text()).toContain("Apps");
      terminal.input(ESC);
      expect(surfaces[0]!.close).not.toHaveBeenCalled();
      terminal.input(APPS); terminal.input("settings"); terminal.input(ENTER);
      await vi.dynamicImportSettled();
      expect(surfaces).toHaveLength(1);
      terminal.input(APPS); terminal.input("change"); terminal.input(ENTER);
      await vi.dynamicImportSettled();
      expect(surfaces[0]!.close).toHaveBeenCalledOnce();
      expect(surfaces.map(surface => surface.route)).toEqual(["settings", "changelog"]);
      expect(await text()).toContain("changelog");
      terminal.input(APPS); terminal.input(ENTER);
      await vi.dynamicImportSettled();
      expect(shell.runtime.hasOverlay()).toBe(false);
      expect(surfaces[1]!.close).toHaveBeenCalledOnce();
      expect(shell.root.editor.getText()).toBe("unfinished draft");
      expect(engine.session.calls.some(call => call.startsWith("prompt:") || call === "setModel")).toBe(false);
      expect(surfaces.flatMap(surface => surface.input.mock.calls)).toEqual([]);
      terminal.input("\u001b[109;5u");
      expect(await text()).toContain("Models");
      terminal.input(APPS);
      expect(await text()).not.toContain("Open an application");
      terminal.input(ESC);
      expect(shell.root.editor.getText()).toBe("unfinished draft");
    } finally { await shell.dispose(); await rm(agentDir, { recursive: true, force: true }); }
  });
});
