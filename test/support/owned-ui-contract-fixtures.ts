import {
  OWNED_UI_CONTRACT_VERSION,
  assertOwnedUiSnapshot,
  type OwnedUiCustomization,
  type OwnedUiSessionViewModel,
  type OwnedUiSlotId,
  type OwnedUiSnapshot,
  type OwnedUiTranscriptBlock,
} from "../../src/contracts/owned-ui/index.js";

// Invariant: the snapshot is the validated contract entry, so view, block, and customization checks run through it.

export function block(overrides: Partial<OwnedUiTranscriptBlock> = {}): OwnedUiTranscriptBlock {
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

export function customization(slot: OwnedUiSlotId = "theme"): OwnedUiCustomization {
  return {
    id: "customization-vanilla",
    slot,
    version: 1,
    precedence: 100,
    label: "Vanilla style",
    payload: { accent: "blue" },
  };
}

export function view(overrides: Partial<OwnedUiSessionViewModel> = {}): OwnedUiSessionViewModel {
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

export function snapshot(overrides: Partial<OwnedUiSnapshot> = {}): OwnedUiSnapshot {
  return {
    contractVersion: OWNED_UI_CONTRACT_VERSION,
    snapshotId: "snapshot-3",
    sessionId: "session-1",
    sequence: 3,
    view: view(),
    ...overrides,
  };
}

export function assertView(value: OwnedUiSessionViewModel): void {
  assertOwnedUiSnapshot(snapshot({ sessionId: value.sessionId, view: value }));
}

export function assertTranscriptBlock(value: OwnedUiTranscriptBlock): void {
  assertView(view({ transcript: [value] }));
}

export function assertCustomization(value: OwnedUiCustomization): void {
  assertView(view({ customizations: [value] }));
}
