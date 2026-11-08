import { describe, expect, it } from "vitest";
import {
  assertOwnedUiCommand,
  assertOwnedUiPromptSuggestionRequest,
  assertOwnedUiPromptSuggestionResult,
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiSlotId,
} from "../../../src/contracts/owned-ui/index.js";
import { assertCustomization, assertView, block, customization, snapshot, view } from "../../support/owned-ui-contract-fixtures.js";

const SLOT_IDS = [
  "theme",
  "transcript-block",
  "tool-card",
  "editor",
  "status",
  "command",
  "selector",
  "dialog",
  "overlay",
  "layout",
] as const satisfies readonly OwnedUiSlotId[];

function command(overrides: Partial<OwnedUiCommand> = {}): OwnedUiCommand {
  return {
    type: "prompt",
    correlationId: "command-1",
    sessionId: "session-1",
    text: "Inspect the repository",
    ...overrides,
  } as OwnedUiCommand;
}

describe("owned UI command and snapshot contracts", () => {
  it("accepts a coherent command, view model, and snapshot", () => {
    expect(() => assertOwnedUiCommand(command())).not.toThrow();
    expect(() => assertView(view())).not.toThrow();
    expect(() => assertOwnedUiSnapshot(snapshot())).not.toThrow();
  });

  it("accepts terminal working progress and rejects values beyond completion", () => {
    expect(() => assertView(view({
      status: { ...view().status, workingMessage: "Compacting", workingProgress: 100 },
    }))).not.toThrow();
    expect(() => assertView(view({
      status: { ...view().status, workingMessage: "Compacting", workingProgress: 101 },
    }))).toThrow(/working progress/);
  });

  it("validates prompt-suggestion identities and bounds", () => {
    const identity = {
      sessionId: "session-1",
      sessionGeneration: 2,
      runSequence: 4,
      responseSequence: 5,
      model: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" },
    };
    expect(() => assertOwnedUiPromptSuggestionRequest({ identity, signal: new AbortController().signal })).not.toThrow();
    expect(() => assertOwnedUiPromptSuggestionResult({ identity, outcome: "candidate", text: "run the tests" })).not.toThrow();
    expect(() => assertOwnedUiPromptSuggestionResult({ identity, outcome: "candidate", text: "x".repeat(100) })).toThrow(/suggestion text/);
    for (const outcome of ["empty", "rejected", "provider-failure", "unavailable", "cancelled"] as const) {
      expect(() => assertOwnedUiPromptSuggestionResult({ identity, outcome, text: null })).not.toThrow();
      expect(() => assertOwnedUiPromptSuggestionResult({ identity, outcome, text: "archive it" } as never)).toThrow(/outcome/);
    }
    for (const text of [null, "", " "]) {
      expect(() => assertOwnedUiPromptSuggestionResult({ identity, outcome: "candidate", text } as never)).toThrow();
    }
    expect(() => assertOwnedUiPromptSuggestionResult({ identity, text: "archive it" } as never)).toThrow(/outcome/);
    expect(() => assertOwnedUiPromptSuggestionResult({ identity: { ...identity, runSequence: -1 }, outcome: "empty", text: null })).toThrow(/run sequence/);
  });

  it("accepts every versioned customization slot", () => {
    for (const slot of SLOT_IDS) {
      expect(() => assertCustomization({ ...customization(slot), id: `slot-${slot}` })).not.toThrow();
    }
  });

  it("accepts empty editor and transcript text while bounding oversized content", () => {
    expect(() => assertView(view({
      editor: { ...view().editor, text: "", cursorOffset: 0 },
      transcript: [block({ text: "" })],
    }))).not.toThrow();
  });

  it("accepts bounded opaque image references and rejects raw or malformed image metadata", () => {
    const reference = { assetId: "image-abc", mimeType: "image/png", byteLength: 128, source: "user" as const };
    expect(() => assertView(view({ transcript: [block({ imageReferences: [reference] })] }))).not.toThrow();
    expect(() => assertView(view({ transcript: [block({ imageReferences: [{ ...reference, mimeType: "text/plain" }] })] }))).toThrow(/MIME/);
    expect(() => assertView(view({ transcript: [block({ imageReferences: [{ ...reference, byteLength: 30 * 1024 * 1024 }] })] }))).toThrow(/byte length/);
    expect(() => assertView(view({ transcript: [block({ payload: { data: "x".repeat(70 * 1024) } })] }))).toThrow(/byte limit/);
  });

  it("validates normalized footer pull request identity", () => {
    const footer = {
      branch: "feature/show-pr-id-status-bar",
      pullRequest: { number: 540, url: "https://github.com/timurproko/a1/pull/540" },
      sessionName: null,
      availableProviderCount: 1,
      extensionStatuses: [],
    };
    const status = { ...view().status, footer };
    expect(() => assertView(view({ status }))).not.toThrow();
    expect(() => assertView(view({ status: { ...status, footer: { ...footer, pullRequest: { ...footer.pullRequest, number: 0 } } } }))).toThrow(/pull request number/);
    expect(() => assertView(view({ status: { ...status, footer: { ...footer, pullRequest: { ...footer.pullRequest, url: "https://example.com/timurproko/a1/pull/540" } } } }))).toThrow(/pull request URL/);
    expect(() => assertView(view({ status: { ...status, footer: { ...footer, pullRequest: { number: 540 } as never } } }))).toThrow(/pull request URL/);
  });

  it("rejects malformed identities, unknown enums, and invalid focus geometry", () => {
    expect(() => assertOwnedUiCommand(command({ correlationId: "bad id" }))).toThrow(/unsupported characters/);
    expect(() => assertView(view({ lifecycle: "paused" as never }))).toThrow(/lifecycle/);
    expect(() => assertView(view({ terminal: { ...view().terminal, columns: 4 } }))).toThrow(/columns/);
    expect(() => assertView(view({
      editor: { ...view().editor, cursorOffset: 99 },
    }))).toThrow(/cursor offset/);
  });

  it("rejects oversized text, payloads, collections, and session views", () => {
    expect(() => assertOwnedUiCommand(command({ text: "x".repeat(300 * 1024) }))).toThrow(/prompt text/);
    expect(() => assertCustomization({ ...customization(), payload: { data: "x".repeat(70 * 1024) } })).toThrow(/byte limit/);
    expect(() => assertView(view({ transcript: [block({ text: "x".repeat(300 * 1024) })] }))).toThrow(/transcript block text/);
    const diagnostics = Array.from({ length: 1_001 }, (_, index) => ({
      sequence: index,
      code: `diagnostic-${index}`,
      severity: "info" as const,
      message: "diagnostic",
      recoverable: true,
    }));
    expect(() => assertView(view({ diagnostics }))).toThrow(/maximum length/);
  });

  it("rejects non-serializable payloads and duplicate identities", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => assertView(view({ transcript: [block({ payload: cycle })] }))).toThrow(/JSON serializable/);
    expect(() => assertView(view({ transcript: [block(), block()] }))).toThrow(/duplicate owned-UI transcript block/);
    expect(() => assertView(view({ customizations: [customization(), customization()] }))).toThrow(/duplicate owned-UI customization/);
  });

  it("requires dialogs and overlays to own matching focus and preserves version checks", () => {
    expect(() => assertView(view({
      dialog: { id: "dialog-1", title: "Choose", kind: "choice", payload: {} },
    }))).toThrow(/dialog focus/);
    expect(() => assertView(view({
      terminal: { ...view().terminal, focusedRegion: "dialog" },
      dialog: { id: "dialog-1", title: "Choose", kind: "choice", payload: {} },
    }))).not.toThrow();
    expect(() => assertOwnedUiSnapshot(snapshot({ contractVersion: 2 as never }))).toThrow(/snapshot contract version/);
  });

  it("rejects snapshots whose session identity disagrees with their view", () => {
    expect(() => assertOwnedUiSnapshot(snapshot({ sessionId: "session-2" }))).toThrow(/identity/);
  });
});
