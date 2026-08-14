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
  | "system";

export type OwnedUiSeverity = "info" | "warning" | "error";

export interface OwnedUiModelInfo {
  readonly providerId: string;
  readonly modelId: string;
  readonly displayName: string;
}

export type OwnedUiThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface OwnedUiTerminalSurface {
  readonly columns: number;
  readonly rows: number;
  readonly focusedRegion: "transcript" | "editor" | "dialog" | "overlay" | "status";
  readonly hardwareCursor: boolean;
}

export interface OwnedUiEditorState {
  readonly text: string;
  readonly queuedSubmissions: readonly string[];
  readonly selection: { readonly start: number; readonly end: number } | null;
  readonly cursorOffset: number;
  readonly historyRevision: number;
  readonly submitEnabled: boolean;
}

export interface OwnedUiStatusView {
  readonly title: string;
  readonly workingMessage: string | null;
  readonly diagnostics: readonly string[];
  readonly badges: readonly string[];
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

export interface OwnedUiTranscriptBlock {
  readonly id: OwnedUiEntityId;
  readonly kind: OwnedUiTranscriptBlockKind;
  readonly status: OwnedUiBlockStatus;
  readonly revision: number;
  readonly title: string | null;
  readonly text: string;
  readonly payload: unknown;
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
  }
  | {
    readonly type: "steer" | "follow-up";
    readonly correlationId: OwnedUiCorrelationId;
    readonly sessionId: OwnedUiSessionId;
    readonly text: string;
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
  | { readonly type: "new-session" | "resume-session"; readonly correlationId: OwnedUiCorrelationId; readonly sessionId: OwnedUiSessionId }
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
