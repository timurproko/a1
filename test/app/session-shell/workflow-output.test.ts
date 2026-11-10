import { PI_SHELL_COMPONENTS } from "../../support/pi-shell-components.js";
import { describe, expect, it, vi } from "vitest";
import type { OwnedUiWorkflowResult } from "../../../src/contracts/owned-ui/index.js";
import { WorkflowOutput } from "../../../src/app/session-shell/workflow-output.js";

function harness(customViewport: boolean) {
  const anchored: { id: string; render(width: number): readonly string[]; dispose?: () => void }[] = [];
  const anchors = new Map<string, number>();
  let transcriptLength = 2;
  const document = {
    get lastId() { return anchored.at(-1)?.id; },
    anchorOf: (id: string) => anchors.get(id),
    invalidate: vi.fn(),
    appendAnchored: vi.fn((id: string, component: { render(width: number): readonly string[] }, anchor: number) => {
      anchored.push({ id, ...component });
      anchors.set(id, anchor);
    }),
    removeAnchored: vi.fn(() => { anchored.length = 0; anchors.clear(); }),
  };
  const dock = { setNotice: vi.fn(), dismissNotice: vi.fn() };
  const invalidate = vi.fn();
  const output = new WorkflowOutput({
    customViewport, components: PI_SHELL_COMPONENTS,
    document: document as never,
    dock: dock as never,
    transcriptLength: () => transcriptLength,
    outputPad: () => 1,
    hotkeysPresentation: () => ({ bindings: {}, getShortcuts: () => [], profile: customViewport ? "a1" : "pi" }) as never,
    componentRuntime: { getColumns: () => 80, getRows: () => 24, requestRender: () => {} },
    invalidate,
  });
  const text = (index = -1) => anchored.at(index)!.render(60).join("\n");
  return { output, document, dock, anchored, invalidate, text, grow: () => { transcriptLength += 1; } };
}

const result = (overrides: Partial<OwnedUiWorkflowResult>): OwnedUiWorkflowResult =>
  ({ command: "model", outcome: "completed", message: "done", ...overrides }) as OwnedUiWorkflowResult;

describe("WorkflowOutput", () => {
  it("answers bare A1 in the dock notice", () => {
    const { output, dock, anchored } = harness(true);
    output.appendStatus("Reloaded");
    output.appendMessage({ kind: "error", message: "bad" }, "image-count");
    output.appendResult(result({ command: "new", message: "New session" }));
    expect(dock.setNotice.mock.calls.map(([notice]) => notice)).toEqual([
      { kind: "status", message: "Reloaded" },
      { kind: "warning", message: "bad", errorCode: "image-count" },
      { kind: "new-session", message: "New session" },
    ]);
    expect(anchored).toEqual([]);
  });

  it.each(["model", "models"] as const)("keeps successful %s changes quiet without hiding actionable diagnostics", command => {
    const { output, dock, anchored } = harness(true);
    output.appendResult(result({ command, message: "Switched to a model", presentation: { kind: "model-change" } }));
    expect(dock.setNotice).not.toHaveBeenCalled();
    output.appendResult(result({ command, presentation: { kind: "model-change" }, messages: [
      { kind: "warning", message: "catalog offline" }, { kind: "status", message: "Model: selected" },
    ] }));
    output.appendResult(result({ command, outcome: "failed", message: "No API key" }));
    output.appendResult(result({ command, outcome: "cancelled", message: "cancelled" }));
    expect(dock.setNotice.mock.calls.map(([notice]) => notice)).toEqual([
      { kind: "warning", message: "catalog offline" }, { kind: "error", message: "No API key" },
    ]);
    expect(anchored).toEqual([]);
    output.appendResult(result({ command, message: "A provider warning", messageKind: "warning", presentation: { kind: "model-change" } }));
    expect(dock.setNotice).toHaveBeenLastCalledWith({ kind: "warning", message: "A provider warning" });
    output.appendResult(result({ command, message: "Only one model available" }));
    expect(dock.setNotice).toHaveBeenLastCalledWith({ kind: "status", message: "Only one model available" });
    const pinned = harness(false);
    pinned.output.appendResult(result({ command, message: "Switched to a model", presentation: { kind: "model-change" } }));
    expect(pinned.text()).toContain("Switched to a model");
  });

  it("anchors pinned output after the transcript and replaces a repeated status in place", () => {
    const { output, document, anchored, invalidate, text, grow } = harness(false);
    output.appendStatus("first");
    output.appendStatus("second");
    expect(anchored).toHaveLength(1);
    expect(text()).toContain("second");
    expect(document.invalidate).toHaveBeenCalledWith("workflow-status");
    grow();
    output.appendStatus("third");
    expect(anchored).toHaveLength(2);
    expect(document.appendAnchored.mock.calls.map(call => call[2])).toEqual([2, 3]);
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it("presents failures, silent and cancelled results, and share links", () => {
    const { output, anchored, text } = harness(false);
    output.appendResult(result({ outcome: "failed", message: "nope" }));
    expect(text()).toContain("nope");
    output.appendResult(result({ messageKind: "silent" }));
    output.appendResult(result({ outcome: "cancelled" }));
    output.appendResult(result({ command: "quit" }));
    expect(anchored).toHaveLength(1);
    output.appendResult(result({ command: "share", message: "Share URL: https://x/y", detail: "https://gist/z" }));
    expect(text()).toContain("\u001b]8;;https://x/y");
    expect(text()).toContain("Gist:");
  });

  it("dismisses the dock notice before transcript-bound output and resets the status chain", () => {
    const { output, dock, document, anchored } = harness(false);
    output.appendResult(result({ command: "changelog", detail: "## 1.0.0" }));
    expect(dock.dismissNotice).toHaveBeenCalledOnce();
    output.appendStatus("after");
    output.reset();
    expect(document.removeAnchored).toHaveBeenCalledOnce();
    output.appendStatus("again");
    expect(anchored).toHaveLength(1);
  });
});
