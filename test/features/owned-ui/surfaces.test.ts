import { describe, expect, it } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  OwnedCommandSurface,
  OwnedDialogComponent,
  OwnedDiagnosticsComponent,
  OwnedSelectorComponent,
  OwnedStatusComponent,
  type OwnedTerminalInput,
} from "../../../src/features/owned-ui/index.js";

function view(): OwnedUiSessionViewModel {
  return {
    contractVersion: 1,
    sessionId: "session-1",
    revision: 1,
    lifecycle: "busy",
    transcript: [],
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "AddOne", workingMessage: "Working…", diagnostics: [], badges: ["ready"] },
    terminal: { columns: 80, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" },
    thinkingLevel: "high",
    activeCommandIds: [],
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: [],
  };
}

function key(keyName: string): OwnedTerminalInput {
  return { type: "key", key: keyName, ctrl: false, alt: false, shift: false };
}

describe("owned UI surfaces", () => {
  it("renders status and diagnostics from owned view models", () => {
    const current = view();
    const status = new OwnedStatusComponent();
    status.update(current);
    expect(status.render({ columns: 80, rows: 24 })).toEqual([
      "AddOne  ·  ready  ·  openai/gpt-5  ·  thinking:high  ·  Working…",
    ]);

    const diagnostics = new OwnedDiagnosticsComponent();
    diagnostics.update({
      ...current,
      diagnostics: [
        { sequence: 0, code: "one", severity: "warning", message: "first", recoverable: true },
        { sequence: 1, code: "two", severity: "error", message: "second", recoverable: true },
      ],
    });
    expect(diagnostics.render({ columns: 80, rows: 24 })).toEqual(["warning: first", "error: second"]);
  });

  it("navigates and selects selector options without leaking text input", () => {
    const selected: string[] = [];
    const selector = new OwnedSelectorComponent("models", [
      { id: "fast", label: "Fast" },
      { id: "quality", label: "Quality", description: "default" },
    ], { onSelect: id => selected.push(id) });

    selector.handleInput(key("down"));
    selector.handleInput(key("enter"));
    expect(selected).toEqual(["quality"]);
    expect(selector.render({ columns: 30, rows: 5 })).toEqual(["  Fast", "> Quality  default"]);
    expect(selector.handleInput({ type: "text", text: "x" })).toBe(true);
  });

  it("presents dialog options and owns cancellation", () => {
    const cancelled: number[] = [];
    const dialog = new OwnedDialogComponent({
      id: "dialog-1",
      title: "Choose model",
      kind: "choice",
      payload: { options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
    }, { onCancel: () => cancelled.push(1) });

    dialog.handleInput(key("down"));
    expect(dialog.render({ columns: 24, rows: 8 }).join("\n")).toContain("B");
    dialog.handleInput(key("escape"));
    expect(cancelled).toEqual([1]);
  });

  it("registers and dispatches correlated owned UI commands", async () => {
    const surface = new OwnedCommandSurface();
    surface.register("abort", context => ({
      type: "abort",
      correlationId: context.correlationId,
      sessionId: context.sessionId,
    }));
    const command = await surface.dispatch("abort", "session-1");
    expect(command).toMatchObject({ type: "abort", sessionId: "session-1", correlationId: "ui-command-1" });
    await expect(surface.dispatch("missing", "session-1")).rejects.toThrow(/unknown owned UI command/);
  });
});
