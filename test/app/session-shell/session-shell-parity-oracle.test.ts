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
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { interactionCase } from "../../../scripts/development/interaction-parity/matrix.mjs";
import { validateObservations } from "../../../scripts/development/interaction-parity/observations.mjs";
import { ObservationRecorder } from "../../support/interaction-parity/recorder.js";
import { fixture } from "./session-shell-fixture.js";

const ORACLE_CASES = ["prompt.type-ascii", "prompt.type-unicode", "shortcut.default-prompt", "selection.prompt-drag", "clipboard.copy-selection", "clipboard.first-paste", "detach.double-ctrl-c"].map(interactionCase);

/**
 * Drives the direct owned shell through the shared matrix cases that need no provider and records
 * content-free semantic observations: the prompt after typing, the action a shortcut invoked, a
 * transcript drag selection and the cells it paints, the selection and clipboard digests of a
 * copy, the first paste, and the double Ctrl+C exit.
 */
async function recordDirectOracle(clipboardText: string): Promise<ObservationRecorder> {
  const recorder = new ObservationRecorder("direct");
  const written: string[] = [];
  const { shell, terminal } = await fixture([
    { role: "assistant", content: [{ type: "text", text: "alpha beta gamma" }], timestamp: 1 },
  ], [], true, undefined, {
    readText: async () => clipboardText,
    writeText: async text => { written.push(text); },
  });
  try {
    const prompt = () => shell.root.editor.getText();
    const clipboardWrites = () => terminal.writes.join("").match(/\u001b\]52;c;([A-Za-z0-9+/=]*)\u0007/gu) ?? [];
    const presented = () => {
      shell.runtime.renderNow();
      const lines = shell.root.render(100);
      recorder.observe("cells", lines.join("\n"), { rows: lines.length, columns: 100 });
      const cursor = (shell.root.editor as { getCursor?: () => { line?: number; col?: number } }).getCursor?.();
      recorder.observe("cursor", JSON.stringify(cursor ?? null), { row: cursor?.line ?? -1, column: cursor?.col ?? -1 });
    };

    recorder.begin("prompt.type-ascii");
    terminal.input("hello");
    await vi.waitFor(() => expect(prompt()).toBe("hello"));
    recorder.observe("key", "hello", { keys: 5 });
    recorder.observe("prompt", prompt(), { cursor: prompt().length });
    presented();
    shell.root.editor.setText("");

    recorder.begin("prompt.type-unicode");
    terminal.input("开发 é");
    await vi.waitFor(() => expect(prompt()).toBe("开发 é"));
    recorder.observe("key", "开发 é", { keys: 5 });
    recorder.observe("prompt", prompt(), { codepoints: [...prompt()].length });
    presented();
    shell.root.editor.setText("");

    recorder.begin("shortcut.default-prompt");
    terminal.input("abc");
    await vi.waitFor(() => expect(prompt()).toBe("abc"));
    recorder.observe("key", "abc", { keys: 3 });
    recorder.sent();
    terminal.input("\u0001");
    await vi.waitFor(() => expect(shell.root.editor.hasSelection?.()).toBe(true));
    recorder.observe("key", "\u0001", { key: "a", mods: 2 });
    const selected = shell.root.editor.hasSelection?.() === true;
    recorder.observe("action", "owned.editor.selectAll", { action: "owned.editor.selectAll", invoked: selected });
    recorder.observe("selection", prompt(), { selected });
    expect(selected).toBe(true);

    recorder.begin("selection.prompt-drag");
    terminal.resize(100, 24);
    shell.runtime.renderNow();
    const transcriptRow = shell.root.render(100).findIndex(line => stripTerminalSequences(line).includes("alpha beta")) + 1;
    expect(transcriptRow).toBeGreaterThan(0);
    const dragBefore = clipboardWrites().length;
    recorder.sent();
    terminal.input(`\u001b[<0;1;${transcriptRow}M`);
    terminal.input(`\u001b[<32;10;${transcriptRow}M`);
    terminal.input(`\u001b[<0;10;${transcriptRow}m`);
    shell.runtime.renderNow();
    expect(shell.root.hasActiveSelection()).toBe(true);
    const painted = shell.root.render(100);
    recorder.observe("cells", painted.join("\n"), { rows: painted.length, highlighted: painted.join("").includes("\u001b[48;2;38;79;120m") });
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardWrites().length).toBeGreaterThan(dragBefore));
    const dragged = Buffer.from(clipboardWrites().at(-1)!.replace(/^\u001b\]52;c;/u, "").replace(/\u0007$/u, ""), "base64").toString("utf8");
    recorder.observe("selection", dragged, { row: transcriptRow - 1, columns: 10, cleared: !shell.root.hasActiveSelection() });
    expect(dragged.trim().length).toBeGreaterThanOrEqual(8);
    expect("alpha beta gamma".startsWith(dragged.trim())).toBe(true);
    // Invariant: the oracle records whether direct A1 keeps the transcript selection after a
    // copy; the resident candidate must match that observation rather than an assumed rule. A
    // plain click then clears it, as a user would, before the prompt copy case.
    terminal.input(`\u001b[<0;1;${transcriptRow}M\u001b[<0;1;${transcriptRow}m`);
    shell.runtime.renderNow();

    recorder.begin("clipboard.copy-selection");
    shell.root.editor.setText("abc");
    terminal.input("\u0001");
    await vi.waitFor(() => expect(shell.root.editor.hasSelection?.()).toBe(true));
    const before = clipboardWrites().length;
    recorder.sent();
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardWrites().length).toBeGreaterThan(before));
    const payload = clipboardWrites().at(-1)!.replace(/^\u001b\]52;c;/u, "").replace(/\u0007$/u, "");
    const copied = Buffer.from(payload, "base64").toString("utf8");
    recorder.observe("key", "\u0003", { key: "c", mods: 2 });
    recorder.observe("action", "tui.input.copy", { action: "tui.input.copy", attached: shell.runtime.active });
    recorder.observe("clipboard", copied, { location: "standard" });
    recorder.observe("selection", prompt(), { selected: shell.root.editor.hasSelection?.() === true });
    expect(copied).toBe("abc");
    expect(shell.runtime.active).toBe(true);
    shell.root.editor.setText("");

    recorder.begin("clipboard.first-paste");
    terminal.input("\u0016");
    await vi.waitFor(() => expect(prompt()).toBe(clipboardText), { timeout: 5_000 });
    recorder.observe("key", "\u0016", { key: "v", mods: 2 });
    recorder.observe("action", "owned.editor.paste", { action: "owned.editor.paste", pastes: 1 });
    recorder.observe("prompt", prompt(), { pasted: true });
    shell.root.editor.setText("");

    recorder.begin("detach.double-ctrl-c");
    const first = await shell.clearOrExit(1_000);
    recorder.observe("key", "\u0003", { key: "c", mods: 2 });
    recorder.observe("action", String(first.outcome), { action: "app.clear", attached: shell.runtime.active });
    recorder.sent();
    const second = await shell.clearOrExit(1_200);
    recorder.observe("key", "\u0003", { key: "c", mods: 2 });
    recorder.observe("action", String(second.outcome), { action: "exit", attached: shell.runtime.active });
    await shell.waitUntilStopped();
    expect(shell.runtime.active).toBe(false);
  } finally {
    await shell.dispose();
  }
  return recorder;
}

describe("direct owned shell parity oracle", () => {
  it("records stable content-free observations for the shared matrix without changing solo behaviour", async () => {
    const first = await recordDirectOracle("cold first paste");
    const second = await recordDirectOracle("cold first paste");
    expect(validateObservations(first.observations, ORACLE_CASES)).toEqual([]);
    for (const entry of ORACLE_CASES) {
      expect(first.stable(entry.id), entry.id).toEqual(second.stable(entry.id));
      expect(first.stable(entry.id).length, entry.id).toBeGreaterThan(0);
    }
    const serialized = JSON.stringify(first.observations);
    for (const content of ["hello", "cold first paste", "abc", "开发"]) expect(serialized).not.toContain(content);
    expect(first.observations.find(observation => observation.caseId === "detach.double-ctrl-c" && observation.kind === "action" && observation.seq === 2)?.detail).toMatchObject({ action: "exit", attached: false });
    expect(first.observations.find(observation => observation.caseId === "clipboard.copy-selection" && observation.kind === "action")?.detail).toMatchObject({ attached: true });
  }, 30_000);
});
