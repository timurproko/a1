import { describe, expect, it } from "vitest";
import {
  OWNED_UI_CONTRACT_VERSION,
  assertOwnedUiCommand,
  assertOwnedUiCustomization,
  assertOwnedUiEvent,
  assertOwnedUiPromptSuggestionRequest,
  assertOwnedUiPromptSuggestionResult,
  assertOwnedUiPromptSuggestionState,
  assertOwnedUiSessionViewModel,
  assertOwnedUiSnapshot,
  type OwnedUiCommand,
  type OwnedUiCustomization,
  type OwnedUiEvent,
  type OwnedUiSessionViewModel,
  type OwnedUiSnapshot,
  type OwnedUiSlotId,
  type OwnedUiTranscriptBlock,
} from "../../../src/contracts/owned-ui/index.js";

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

function block(overrides: Partial<OwnedUiTranscriptBlock> = {}): OwnedUiTranscriptBlock {
  return {
    id: "block-1",
    kind: "assistant",
    status: "finalized",
    revision: 1,
    title: "Assistant",
    text: "Done",
    payload: { source: "synthetic" },
    ...overrides,
  };
}

function customization(slot: OwnedUiSlotId = "theme"): OwnedUiCustomization {
  return {
    id: "customization-vanilla",
    slot,
    version: 1,
    precedence: 100,
    label: "Vanilla style",
    payload: { accent: "blue" },
  };
}

function view(overrides: Partial<OwnedUiSessionViewModel> = {}): OwnedUiSessionViewModel {
  return {
    contractVersion: OWNED_UI_CONTRACT_VERSION,
    sessionId: "session-1",
    revision: 3,
    lifecycle: "ready",
    transcript: [block()],
    editor: {
      text: "hello",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 5,
      historyRevision: 2,
      submitEnabled: true,
    },
    status: {
      title: "A1",
      workingMessage: null,
      diagnostics: [],
      badges: ["ready"],
    },
    terminal: {
      columns: 100,
      rows: 32,
      focusedRegion: "editor",
      hardwareCursor: false,
    },
    activeModel: {
      providerId: "openai",
      modelId: "gpt-5",
      displayName: "GPT-5",
    },
    thinkingLevel: "medium",
    activeCommandIds: ["command-1"],
    dialog: null,
    overlay: null,
    customizations: [customization()],
    diagnostics: [],
    ...overrides,
  };
}

function command(overrides: Partial<OwnedUiCommand> = {}): OwnedUiCommand {
  return {
    type: "prompt",
    correlationId: "command-1",
    sessionId: "session-1",
    text: "Inspect the repository",
    ...overrides,
  } as OwnedUiCommand;
}

function event(overrides: Partial<OwnedUiEvent> = {}): OwnedUiEvent {
  return {
    type: "session-view",
    sessionId: "session-1",
    sequence: 3,
    view: view(),
    ...overrides,
  } as OwnedUiEvent;
}

function snapshot(overrides: Partial<OwnedUiSnapshot> = {}): OwnedUiSnapshot {
  return {
    contractVersion: OWNED_UI_CONTRACT_VERSION,
    snapshotId: "snapshot-3",
    sessionId: "session-1",
    sequence: 3,
    view: view(),
    ...overrides,
  };
}

describe("owned UI command, event, and snapshot contracts", () => {
  it("accepts a coherent command, event envelope, view model, and snapshot", () => {
    expect(() => assertOwnedUiCommand(command())).not.toThrow();
    expect(() => assertOwnedUiEvent(event())).not.toThrow();
    expect(() => assertOwnedUiSessionViewModel(view())).not.toThrow();
    expect(() => assertOwnedUiSnapshot(snapshot())).not.toThrow();
  });

  it("validates settled-run and prompt-suggestion identities and bounds", () => {
    const identity = {
      sessionId: "session-1",
      sessionGeneration: 2,
      runSequence: 4,
      model: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" },
    };
    expect(() => assertOwnedUiEvent(event({
      type: "agent-run-settled",
      sessionGeneration: 2,
      runSequence: 4,
      model: identity.model,
      assistantMessageCount: 2,
      successful: true,
    }))).not.toThrow();
    expect(() => assertOwnedUiPromptSuggestionRequest({ identity, signal: new AbortController().signal })).not.toThrow();
    expect(() => assertOwnedUiPromptSuggestionResult({ identity, text: "run the tests" })).not.toThrow();
    expect(() => assertOwnedUiPromptSuggestionState({ status: "available", identity, text: "run the tests" })).not.toThrow();
    expect(() => assertOwnedUiPromptSuggestionResult({ identity, text: "x".repeat(100) })).toThrow(/suggestion text/);
    expect(() => assertOwnedUiPromptSuggestionState({ status: "generating", identity: { ...identity, runSequence: -1 } })).toThrow(/run sequence/);
  });

  it("accepts every versioned customization slot", () => {
    for (const slot of SLOT_IDS) {
      expect(() => assertOwnedUiCustomization({ ...customization(slot), id: `slot-${slot}` })).not.toThrow();
    }
  });

  it("accepts empty editor and transcript text while bounding oversized content", () => {
    expect(() => assertOwnedUiSessionViewModel(view({
      editor: { ...view().editor, text: "", cursorOffset: 0 },
      transcript: [block({ text: "" })],
    }))).not.toThrow();
  });

  it("accepts bounded opaque image references and rejects raw or malformed image metadata", () => {
    const reference = { assetId: "image-abc", mimeType: "image/png", byteLength: 128, source: "user" as const };
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block({ imageReferences: [reference] })] }))).not.toThrow();
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block({ imageReferences: [{ ...reference, mimeType: "text/plain" }] })] }))).toThrow(/MIME/);
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block({ imageReferences: [{ ...reference, byteLength: 30 * 1024 * 1024 }] })] }))).toThrow(/byte length/);
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block({ payload: { data: "x".repeat(70 * 1024) } })] }))).toThrow(/byte limit/);
  });

  it("rejects malformed identities, unknown enums, and invalid focus geometry", () => {
    expect(() => assertOwnedUiCommand(command({ correlationId: "bad id" }))).toThrow(/unsupported characters/);
    expect(() => assertOwnedUiEvent(event({ type: "future" } as unknown as OwnedUiEvent))).toThrow(/unknown/);
    expect(() => assertOwnedUiSessionViewModel(view({ lifecycle: "paused" as never }))).toThrow(/lifecycle/);
    expect(() => assertOwnedUiSessionViewModel(view({ terminal: { ...view().terminal, columns: 4 } }))).toThrow(/columns/);
    expect(() => assertOwnedUiSessionViewModel(view({
      editor: { ...view().editor, cursorOffset: 99 },
    }))).toThrow(/cursor offset/);
  });

  it("rejects oversized text, payloads, collections, and session views", () => {
    expect(() => assertOwnedUiCommand(command({ text: "x".repeat(300 * 1024) }))).toThrow(/prompt text/);
    expect(() => assertOwnedUiCustomization({ ...customization(), payload: { data: "x".repeat(70 * 1024) } })).toThrow(/byte limit/);
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block({ text: "x".repeat(300 * 1024) })] }))).toThrow(/transcript block text/);
    const diagnostics = Array.from({ length: 1_001 }, (_, index) => ({
      sequence: index,
      code: `diagnostic-${index}`,
      severity: "info" as const,
      message: "diagnostic",
      recoverable: true,
    }));
    expect(() => assertOwnedUiSessionViewModel(view({ diagnostics }))).toThrow(/maximum length/);
  });

  it("rejects non-serializable payloads and duplicate identities", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block({ payload: cycle })] }))).toThrow(/JSON serializable/);
    expect(() => assertOwnedUiSessionViewModel(view({ transcript: [block(), block()] }))).toThrow(/duplicate owned-UI transcript block/);
    expect(() => assertOwnedUiEvent({
      type: "customization",
      sessionId: "session-1",
      sequence: 4,
      customizations: [customization(), customization()],
    })).toThrow(/duplicate owned-UI customization/);
  });

  it("requires dialogs and overlays to own matching focus and preserves version checks", () => {
    expect(() => assertOwnedUiSessionViewModel(view({
      dialog: { id: "dialog-1", title: "Choose", kind: "choice", payload: {} },
    }))).toThrow(/dialog focus/);
    expect(() => assertOwnedUiSessionViewModel(view({
      terminal: { ...view().terminal, focusedRegion: "dialog" },
      dialog: { id: "dialog-1", title: "Choose", kind: "choice", payload: {} },
    }))).not.toThrow();
    expect(() => assertOwnedUiSnapshot(snapshot({ contractVersion: 2 as never }))).toThrow(/snapshot contract version/);
  });

  it("rejects envelopes whose session identity disagrees with their view", () => {
    expect(() => assertOwnedUiEvent(event({ view: view({ sessionId: "session-2" }) }))).toThrow(/identity/);
    expect(() => assertOwnedUiSnapshot(snapshot({ sessionId: "session-2" }))).toThrow(/identity/);
  });
});
