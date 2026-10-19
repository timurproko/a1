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
    customViewport,
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
