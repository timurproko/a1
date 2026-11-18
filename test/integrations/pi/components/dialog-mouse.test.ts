import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import {
  createPiShellAuthProviderSelector, createPiShellExtensionSelector, createPiShellSelector,
  createPiShellSessionSelector, createPiShellSkillsSelector, createPiShellTreeSelector,
  createPiShellTrustSelector, createPiShellUserMessageSelector, createPiShellLoginDialog, createPiShellShareOperationDialog, type PiShellComponentPort,
} from "../../../../src/integrations/pi/components/index.js";
import { piShellLazySelectors } from "../../../../src/integrations/pi/components/lazy-selectors.js";
import { cellBackgroundAt } from "../../../support/ansi-cell-style.js";

interface Case {
  readonly name: string;
  readonly label: string;
  readonly active: unknown;
  readonly clicked: unknown;
  create(select: (value: any) => void, cancel: () => void): PiShellComponentPort | Promise<PiShellComponentPort>;
}

const cases: readonly Case[] = [
  { name: "shared selector", label: "BetaRow", active: "a", clicked: "b", create: (onSelect, onCancel) => createPiShellSelector({ title: "Choose", options: [{ id: "a", label: "AlphaRow" }, { id: "b", label: "BetaRow" }], onSelect, onCancel }, true) },
  { name: "owned confirmation", label: "BetaRow", active: "AlphaRow", clicked: "BetaRow", create: (select, cancel) => createPiShellExtensionSelector("Choose", ["AlphaRow", "BetaRow"], select, cancel, true) },
  { name: "deferred Skills", label: "BetaRow", active: "AlphaRow", clicked: "BetaRow", create: (onSelect, onCancel) => createPiShellSkillsSelector({ skills: [{ name: "AlphaRow", description: "" }, { name: "BetaRow", description: "" }], onSelect, onCancel }) },
  { name: "deferred provider", label: "BetaRow", active: "a", clicked: "b", create: (select, cancel) => createPiShellAuthProviderSelector("login", [{ id: "a", label: "AlphaRow", providerId: "a", authType: "api_key" }, { id: "b", label: "BetaRow", providerId: "b", authType: "api_key" }], select, cancel, undefined, true) },
  { name: "deferred trust", label: "BetaRow", active: { trusted: false, updates: [] }, clicked: { trusted: true, updates: [] }, create: (onSelect, onCancel) => createPiShellTrustSelector({ cwd: "D:/work", standardStyle: true, savedDecision: null, projectTrusted: false, trustOptions: [{ label: "AlphaRow", trusted: false, updates: [] }, { label: "BetaRow", trusted: true, updates: [] }], onSelect, onCancel }) },
  { name: "Thinking Level", label: "high", active: "low", clicked: "high", create: (onSelect, onCancel) => piShellLazySelectors.createThinking({ currentLevel: "low", availableLevels: ["low", "high"], onSelect, onCancel, presentation: { profile: "bare", cycleBinding: "ctrl+tab" } }) },
  { name: "Fork from Message", label: "BetaRow", active: "a", clicked: "b", create: (select, cancel) => createPiShellUserMessageSelector([{ id: "a", label: "AlphaRow" }, { id: "b", label: "BetaRow" }], select, cancel, "a", true) },
  { name: "Resume Session", label: "BetaRow", active: "D:/a.jsonl", clicked: "D:/b.jsonl", create: async (onSelect, onCancel) => {
    const sessions: SessionInfo[] = ["AlphaRow", "BetaRow"].map((name, index) => ({ path: `D:/${index === 0 ? "a" : "b"}.jsonl`, id: String(index), name, cwd: "D:/work", created: new Date(0), modified: new Date(1000 - index), messageCount: 2, firstMessage: name, allMessagesText: name }));
    const component = await createPiShellSessionSelector({ standardStyle: true, currentSessionsLoader: async () => sessions, allSessionsLoader: async () => sessions, currentSessionFilePath: undefined, renameSession: async () => {}, requestRender() {}, onSelect, onCancel, onExit() {} });
    await new Promise(resolve => setImmediate(resolve));
    return component;
  } },
  { name: "Session Tree", label: "BetaRow", active: "a", clicked: "b", create: (onSelect, onCancel) => createPiShellTreeSelector({ standardStyle: true, tree: [{ entry: { type: "message", id: "a", parentId: null, timestamp: new Date(0).toISOString(), message: { role: "user", content: [{ type: "text", text: "AlphaRow" }], timestamp: 0 } }, children: [{ entry: { type: "message", id: "b", parentId: "a", timestamp: new Date(1).toISOString(), message: { role: "assistant", content: [{ type: "text", text: "BetaRow" }], timestamp: 1 } }, children: [] }] }], currentLeafId: "a", terminalHeight: 40, onSelect, onCancel, onLabelChange() {} }) },
];

describe("owned dialog mouse adapters", () => {
  it.each(cases)("$name: hover preserves keyboard focus and a primary click acts on the explicit choice", async entry => {
    const select = vi.fn(), cancel = vi.fn();
    const component = await entry.create(select, cancel);
    try {
      await component.ready;
      const before = component.render(120);
      const plain = before.map(stripTerminalSequences);
      const row = plain.findIndex(line => line.includes(entry.label));
      expect(row).toBeGreaterThanOrEqual(0);
      const column = plain[row]!.indexOf(entry.label) + 1;
      const active = before.find(line => /^[\s]*[→›] /u.test(stripTerminalSequences(line)));
      component.handleLocalMouse?.({ kind: "motion", button: 3, column, row: row + 1 });
      const hovered = component.render(120);
      expect(hovered[row]).not.toBe(before[row]);
      expect(hovered.find(line => /^[\s]*[→›] /u.test(stripTerminalSequences(line)))).toBe(active);
      expect(cellBackgroundAt(hovered[row]!, column - 1)).toBe(cellBackgroundAt(before[row]!, column - 1));
      component.handleInput?.("\r");
      expect(select).toHaveBeenLastCalledWith(entry.active);
      select.mockClear();
      component.render(120);
      component.handleLocalMouse?.({ kind: "press", button: 2, column, row: row + 1 });
      expect(select).not.toHaveBeenCalled();
      component.handleLocalMouse?.({ kind: "press", button: 0, column, row: row + 1 });
      expect(select).toHaveBeenCalledExactlyOnceWith(entry.clicked);
      component.cancelDialog?.();
      expect(cancel).toHaveBeenCalledOnce();
    } finally { component.dispose?.(); }
  });

  it("clears hover on leave and rejects stale choice coordinates until a keyboard change is painted", async () => {
    const selected = vi.fn();
    const component = createPiShellSelector({ title: "Choose", options: [{ id: "a", label: "AlphaRow" }, { id: "b", label: "BetaRow" }], onSelect: selected }, true);
    await component.ready;
    const lines = component.render(80);
    const row = lines.findIndex(line => line.includes("BetaRow")) + 1;
    component.handleLocalMouse?.({ kind: "motion", button: 3, column: 3, row });
    expect(component.render(80)[row - 1]).not.toBe(lines[row - 1]);
    component.clearMouseHover?.();
    expect(component.render(80)).toEqual(lines);
    component.handleInput?.("\u001b[B");
    component.handleLocalMouse?.({ kind: "press", button: 0, column: 3, row });
    expect(selected).not.toHaveBeenCalled();
    component.dispose?.();
    expect(component.render(80)).toEqual([]);
    component.handleLocalMouse?.({ kind: "press", button: 0, column: 3, row });
    expect(selected).not.toHaveBeenCalled();
  });

  it.each([false, true])("cancels the owned login lifecycle exactly once (already loaded %s)", async loaded => {
    const complete = vi.fn();
    const dialog = createPiShellLoginDialog({ getColumns: () => 80, getRows: () => 24, requestRender() {} }, "provider", complete, undefined, undefined, true);
    try {
      if (loaded) await dialog.ready;
      dialog.cancelDialog?.();
      dialog.cancelDialog?.();
      await dialog.ready;
      expect(complete).toHaveBeenCalledExactlyOnceWith(false, "Login cancelled");
    } finally { dialog.dispose?.(); }
  });

  it("uses the cancellable operation's abort lifecycle for outside cancellation", () => {
    const dialog = createPiShellShareOperationDialog({ getColumns: () => 80, getRows: () => 24, requestRender() {} }, "Sharing");
    try {
      expect(dialog.signal.aborted).toBe(false);
      dialog.cancelDialog?.();
      expect(dialog.signal.aborted).toBe(true);
    } finally { dialog.dispose?.(); }
  });

  it("keeps non-cancellable generic surfaces outside the dismissal contract", async () => {
    const dialog = createPiShellSelector({ title: "Busy", options: [] }, true);
    await dialog.ready;
    expect(dialog.cancelDialog).toBeUndefined();
  });

  it("does not opt the comparison selector into owned mouse or outside cancellation", () => {
    const component = createPiShellSelector({ title: "Choose", options: [{ id: "a", label: "AlphaRow" }], onSelect() {}, onCancel() {} });
    expect(component.handleLocalMouse).toBeUndefined();
    expect(component.cancelDialog).toBeUndefined();
  });
});
