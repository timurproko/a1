import type {
  TerminalRuntimeState,
  TerminalViewport,
  TerminalScrollState,
  TerminalPointerSurface,
  TerminalComponentPort,
  TerminalPort,
  TerminalSizeValue,
  TerminalOverlayAnchor,
  TerminalOverlayMargin,
  TerminalOverlayOptions,
  TerminalOverlayUnfocusOptions,
  TerminalOverlayHandle,
  TerminalInputListenerResult,
  TerminalInputListener,
  TerminalPreInputListener,
  TerminalLayoutEntry,
  TerminalLayoutNode,
  TerminalInputDiagnosticsPhase,
  TerminalInputDiagnosticsEvent,
  TerminalRuntimeOptions,
  TerminalStopOptions,
} from "../../../contracts/presentation/index.js";

// Invariant: the runtime contract is the neutral terminal vocabulary; these are the adapter's names for it.
export type PiTuiRuntimeState = TerminalRuntimeState;
export type PiTuiViewport = TerminalViewport;
export type PiTuiScrollState = TerminalScrollState;
export type PiTuiPointerSurface = TerminalPointerSurface;
export type PiTuiComponentPort = TerminalComponentPort;
export type PiTuiTerminalPort = TerminalPort;
export type PiTuiSizeValue = TerminalSizeValue;
export type PiTuiOverlayAnchor = TerminalOverlayAnchor;
export type PiTuiOverlayMargin = TerminalOverlayMargin;
export type PiTuiOverlayOptions = TerminalOverlayOptions;
export type PiTuiOverlayUnfocusOptions = TerminalOverlayUnfocusOptions;
export type PiTuiOverlayHandle = TerminalOverlayHandle;
export type PiTuiInputListenerResult = TerminalInputListenerResult;
export type PiTuiInputListener = TerminalInputListener;
export type PiTuiPreInputListener = TerminalPreInputListener;
export type PiTuiLayoutEntry = TerminalLayoutEntry;
export type PiTuiLayoutNode = TerminalLayoutNode;
export type PiTuiInputDiagnosticsPhase = TerminalInputDiagnosticsPhase;
export type PiTuiInputDiagnosticsEvent = TerminalInputDiagnosticsEvent;
export type PiTuiRuntimeAdapterOptions = TerminalRuntimeOptions;
export type PiTuiStopOptions = TerminalStopOptions;
