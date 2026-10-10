import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
// Performance: this integration file exercises real cold emitted entries; dedicated tests retain source-loader coverage.
vi.mock("../../../src/app/session-shell/paste-executor.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../src/app/session-shell/paste-executor.js")>();
  const { coldPasteHelper } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, startPasteExecutor: (...args: Parameters<typeof actual.startPasteExecutor>) =>
    actual.startPasteExecutor(args[0], args[1], args[2], coldPasteHelper(args[3])) };
});
vi.mock("node:worker_threads", async importOriginal => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options);
      super(selected.entry, selected.options);
    }
  } };
});
import { fixture, nextImmediate, secondPresenter } from "./session-shell-fixture.js";

const reply = (text: string) => ({ role: "assistant", content: [{ type: "text", text }], timestamp: 1 });

async function settledFrames(): Promise<void> {
  // Rationale: Pi schedules frames on the next tick and throttles them; two turns cover both.
  await nextImmediate();
  await new Promise(resolve => setTimeout(resolve, 40));
}

describe("OwnedUiTerminalHost", () => {
  it("keeps a detached presenter live without painting, and paints it in full once on attach", async () => {
    const { terminal, shell } = await fixture([], [], true);
    const second = await secondPresenter(shell, terminal);
    try {
      second.presenter.start();
      await settledFrames();
      const writes = terminal.writes.length;
      const redraws = shell.runtime.fullRedraws;

      second.engine.session.emit({ type: "message_start", message: reply("Background reply") });
      second.engine.session.emit({ type: "message_end", message: reply("Background reply") });
      await second.adapter.session.flushEvents();
      shell.terminalHost.requestRender(second.presenter);
      shell.terminalHost.requestRender(second.presenter, true);
      await settledFrames();
      expect(terminal.writes.slice(writes)).toEqual([]);
      expect(shell.runtime.fullRedraws).toBe(redraws);
      expect(second.presenter.root.render(80).some(row => stripTerminalSequences(row).includes("Background reply"))).toBe(true);

      shell.terminalHost.attach(second.presenter);
      await settledFrames();
      expect(shell.terminalHost.active()).toBe(second.presenter);
      expect(shell.runtime.fullRedraws).toBe(redraws + 1);
      const switched = terminal.writes.slice(writes).join("");
      expect(switched).toContain("\u001b[2J");
      expect(stripTerminalSequences(switched)).toContain("Background reply");
      expect(shell.damagePresentationDecision()?.reason).not.toBe("stale-frame");

      // Invariant: within the new epoch a later frame is incremental, and the first presenter no longer paints.
      const afterSwitch = terminal.writes.length;
      second.presenter.root.editor.setText("typed after the switch");
      shell.terminalHost.requestRender(second.presenter);
      shell.terminalHost.requestRender(shell);
      await settledFrames();
      expect(shell.runtime.fullRedraws).toBe(redraws + 1);
      expect(stripTerminalSequences(terminal.writes.slice(afterSwitch).join(""))).toContain("typed after the switch");
      expect(shell.damagePresentationDecision()?.reason).not.toBe("stale-frame");
    } finally {
      await shell.dispose();
    }
  });

  it("hides a detached presenter's overlays and gates its terminal-wide writes", async () => {
    const { terminal, shell } = await fixture([], [], true);
    const second = await secondPresenter(shell, terminal);
    try {
      second.presenter.start();
      await settledFrames();
      const overlay = second.presenter.showSelector("Detached choice", [{ id: "one", label: "One" }], () => {});
      expect(overlay.isHidden()).toBe(true);
      const statuses = terminal.programStatuses.length;
      second.engine.session.emit({ type: "agent_start" });
      await second.adapter.session.flushEvents();
      expect(terminal.programStatuses.length).toBe(statuses);

      shell.terminalHost.attach(second.presenter);
      expect(overlay.isHidden()).toBe(false);
      await settledFrames();
      expect(stripTerminalSequences(terminal.writes.join(""))).toContain("Detached choice");

      shell.terminalHost.attach(shell);
      expect(overlay.isHidden()).toBe(true);
      overlay.hide();
    } finally {
      await shell.dispose();
    }
  });

  it("closes a presenter without ending the terminal until the last one closes", async () => {
    const { terminal, shell } = await fixture([], [], true);
    const second = await secondPresenter(shell, terminal);
    second.presenter.start();
    shell.terminalHost.attach(second.presenter);
    await second.presenter.dispose();
    expect(terminal.active).toBe(true);
    expect(shell.terminalHost.active()).toBeNull();

    shell.terminalHost.attach(shell);
    await settledFrames();
    await shell.dispose();
    expect(terminal.active).toBe(false);
    expect(() => shell.terminalHost.connect(second.presenter)).toThrow("terminal host has ended");
  });

  it("forgets a disconnected presenter", async () => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      const second = await secondPresenter(shell, terminal);
      shell.terminalHost.disconnect(second.presenter);
      expect(() => shell.terminalHost.attach(second.presenter)).toThrow("not connected");
      expect(shell.terminalHost.active()).toBe(shell);
    } finally {
      await shell.dispose();
    }
  });
});
