export const OWNED_UI_CONTRACT_VERSION = 1 as const;

export type OwnedUiSessionId = string;
export type OwnedUiEntityId = string;
export type OwnedUiCorrelationId = string;

export type OwnedUiLifecycle =
  | "starting"
  | "ready"
  | "busy"
  | "suspended"
  | "stopping"
  | "stopped"
  | "failed";

export type OwnedUiBlockStatus = "live" | "finalized";

export type OwnedUiTranscriptBlockKind =
  | "user"
  | "assistant"
  | "thinking"
  | "tool-call"
  | "tool-result"
  | "retry"
  | "compaction"
  | "error"
  | "system"
  | "custom"
  | "bash";

export type OwnedUiSeverity = "info" | "warning" | "error";

export interface OwnedUiModelInfo {
  readonly providerId: string;
  readonly modelId: string;
  readonly displayName: string;
}

export interface OwnedUiPromptSuggestionIdentity {
  readonly sessionId: OwnedUiSessionId;
  readonly sessionGeneration: number;
  readonly runSequence: number;
  readonly model: OwnedUiModelInfo;
}

export interface OwnedUiPromptSuggestionRequest {
  readonly identity: OwnedUiPromptSuggestionIdentity;
  readonly signal: AbortSignal;
}

export interface OwnedUiPromptSuggestionResult {
  readonly identity: OwnedUiPromptSuggestionIdentity;
  readonly text: string | null;
}

export type OwnedUiPromptSuggestionState =
  | { readonly status: "idle" }
  | { readonly status: "generating"; readonly identity: OwnedUiPromptSuggestionIdentity }
  | { readonly status: "available"; readonly identity: OwnedUiPromptSuggestionIdentity; readonly text: string };

export interface OwnedUiPromptSuggestionGeneratorPort {
  generate(request: OwnedUiPromptSuggestionRequest): Promise<OwnedUiPromptSuggestionResult>;
}

export type OwnedUiThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface OwnedUiViewportSettings {
  readonly scrollbarAppearance: "auto" | "always" | "hidden";
  readonly scrollbarStyle: "thin" | "thick";
  /** normal is baseline; fast is 2x normal; high is normal plus fast. */
  readonly scrollbarSpeed: "normal" | "fast" | "high";
}

/** Narrow live settings boundary consumed by the bare-A1 shell composition. */
export interface OwnedUiViewportSettingsPort {
  snapshot(): OwnedUiViewportSettings;
  onChange(listener: (settings: OwnedUiViewportSettings) => void): () => void;
}

export interface OwnedUiTerminalSurface {
  readonly columns: number;
  readonly rows: number;
  readonly focusedRegion: "transcript" | "editor" | "dialog" | "overlay" | "status";
  readonly hardwareCursor: boolean;
}

export interface OwnedUiImageAttachment {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
}

export interface OwnedUiEditorState {
  readonly text: string;
  readonly queuedSubmissions: readonly string[];
  readonly selection: { readonly start: number; readonly end: number } | null;
  readonly cursorOffset: number;
  readonly historyRevision: number;
  readonly submitEnabled: boolean;
}

export interface OwnedUiUsageView {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly cost: number;
  readonly latestCacheHitRate: number | null;
  readonly latestPrompt?: { readonly input: number; readonly cacheRead: number; readonly cacheWrite: number } | null;
  readonly contextAvailable?: boolean;
  readonly contextTokens: number | null;
  readonly contextWindow: number;
  readonly contextPercent: number | null;
  readonly usingSubscription: boolean;
  readonly autoCompactEnabled: boolean;
}

export interface OwnedUiFooterView {
  readonly branch: string | null;
  readonly sessionName: string | null;
  readonly availableProviderCount: number;
  readonly extensionStatuses: readonly (readonly [string, string])[];
}

export interface OwnedUiStatusView {
  readonly title: string;
  readonly workingMessage: string | null;
  readonly diagnostics: readonly string[];
  readonly badges: readonly string[];
  readonly usage?: OwnedUiUsageView;
  readonly footer?: OwnedUiFooterView;
}

export interface OwnedUiDialog {
  readonly id: OwnedUiEntityId;
  readonly title: string;
  readonly kind: "choice" | "editor" | "settings" | "confirmation";
  readonly payload: unknown;
}

export interface OwnedUiOverlay {
  readonly id: OwnedUiEntityId;
  readonly componentSlotId: OwnedUiEntityId;
  readonly placement: "bottom" | "center";
  readonly modal: boolean;
  readonly payload: unknown;
}

export interface OwnedUiTranscriptImageReference {
  readonly assetId: OwnedUiEntityId;
  readonly mimeType: string;
  readonly byteLength: number;
  readonly source: "user" | "tool-result";
}

export interface OwnedUiTranscriptBlock {
  readonly id: OwnedUiEntityId;
  readonly kind: OwnedUiTranscriptBlockKind;
  readonly status: OwnedUiBlockStatus;
  readonly revision: number;
  readonly title: string | null;
  readonly text: string;
  readonly payload: unknown;
  /** Bounded opaque references; image bytes remain in the session-scoped engine asset store. */
  readonly imageReferences?: readonly OwnedUiTranscriptImageReference[];
}

export type OwnedUiSlotId =
  | "theme"
  | "transcript-block"
  | "tool-card"
  | "editor"
  | "status"
  | "command"
  | "selector"
  | "dialog"
  | "overlay"
  | "layout";

export interface OwnedUiCustomization {
  readonly id: OwnedUiEntityId;
  readonly slot: OwnedUiSlotId;
  readonly version: number;
  readonly precedence: number;
  readonly label: string;
  readonly payload: unknown;
}

export interface OwnedUiDiagnostics {
  readonly sequence: number;
  readonly code: string;
  readonly severity: OwnedUiSeverity;
  readonly message: string;
  readonly recoverable: boolean;
}

export interface OwnedUiSessionViewModel {
  readonly contractVersion: typeof OWNED_UI_CONTRACT_VERSION;
  readonly sessionId: OwnedUiSessionId;
  readonly revision: number;
  readonly lifecycle: OwnedUiLifecycle;
  readonly transcript: readonly OwnedUiTranscriptBlock[];
  readonly editor: OwnedUiEditorState;
  readonly status: OwnedUiStatusView;
  readonly terminal: OwnedUiTerminalSurface;
  readonly activeModel: OwnedUiModelInfo | null;
  readonly thinkingLevel: OwnedUiThinkingLevel;
  readonly activeCommandIds: readonly OwnedUiCorrelationId[];
  readonly dialog: OwnedUiDialog | null;
  readonly overlay: OwnedUiOverlay | null;
  readonly customizations: readonly OwnedUiCustomization[];
  readonly diagnostics: readonly OwnedUiDiagnostics[];
}

export type OwnedUiCommand =
  | {
    readonly type: "prompt";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly text: string;
    readonly images?: readonly OwnedUiImageAttachment[];
  }
  | {
    readonly type: "steer" | "follow-up";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly text: string;
    readonly images?: readonly OwnedUiImageAttachment[];
  }
  | { readonly type: "abort" | "retry" | "compact" | "shutdown"; readonly correlationId: OwnedUiCorrelationId; readonly sessionId: OwnedUiSessionId }
  | {
    readonly type: "set-model";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly model: OwnedUiModelInfo;
  }
  | {
    readonly type: "set-thinking-level";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly thinkingLevel: OwnedUiThinkingLevel;
  }
  | { readonly type: "new-session"; readonly correlationId: OwnedUiCorrelationId; readonly sessionId: OwnedUiSessionId }
  | {
    readonly type: "resume-session";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly sessionPath: string;
  }
  | {
    readonly type: "set-setting";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly key: string;
    readonly value: unknown;
  }
  | {
    readonly type: "apply-customization";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly customization: OwnedUiCustomization;
  }
  | {
    readonly type: "remove-customization";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly customizationId: OwnedUiEntityId;
  }
  | {
    readonly type: "resize-surface";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly surface: OwnedUiTerminalSurface;
  };

export type OwnedUiCommandOutcome =
  | "accepted"
  | "rejected"
  | "completed"
  | "failed"
  | "timed-out"
  | "cancelled";

export type OwnedUiEvent =
  | {
    readonly type: "session-lifecycle";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly lifecycle: OwnedUiLifecycle;
    readonly reason: string | null;
  }
  | {
    readonly type: "session-view";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly view: OwnedUiSessionViewModel;
  }
  | {
    readonly type: "transcript-block";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly block: OwnedUiTranscriptBlock;
  }
  | {
    /** One completed assistant reply; never a tool row or transcript rebuild. */
    readonly type: "assistant-message-completed";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
  }
  | {
    /** A fresh agent run has started, used by follow-mode surfaces. */
    readonly type: "agent-run-started";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
  }
  | {
    /** The final settlement of one run, after authoritative transcript reconciliation. */
    readonly type: "agent-run-settled";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly sessionGeneration: number;
    readonly runSequence: number;
    readonly model: OwnedUiModelInfo | null;
    readonly assistantMessageCount: number;
    readonly successful: boolean;
  }
  | {
    readonly type: "editor-state";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly editor: OwnedUiEditorState;
  }
  | {
    readonly type: "status";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly status: OwnedUiStatusView;
  }
  | {
    readonly type: "dialog";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly dialog: OwnedUiDialog | null;
  }
  | {
    readonly type: "overlay";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly overlay: OwnedUiOverlay | null;
  }
  | {
    readonly type: "command-outcome";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly correlationId: OwnedUiCorrelationId;
    readonly outcome: OwnedUiCommandOutcome;
    readonly diagnostic: string | null;
  }
  | {
    readonly type: "customization";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly customizations: readonly OwnedUiCustomization[];
  }
  | {
    readonly type: "terminal-surface";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly surface: OwnedUiTerminalSurface;
  }
  | {
    readonly type: "diagnostic";
    readonly sessionId: OwnedUiSessionId;
    readonly sequence: number;
    readonly diagnostic: OwnedUiDiagnostics;
  };

export interface OwnedUiSnapshot {
  readonly contractVersion: typeof OWNED_UI_CONTRACT_VERSION;
  readonly snapshotId: OwnedUiEntityId;
  readonly sessionId: OwnedUiSessionId;
  readonly sequence: number;
  readonly view: OwnedUiSessionViewModel;
}
