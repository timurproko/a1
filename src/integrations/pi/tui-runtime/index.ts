export type {
  PiTuiComponentPort,
  PiTuiInputDiagnosticsEvent,
  PiTuiInputDiagnosticsPhase,
  PiTuiInputListener,
  PiTuiInputListenerResult,
  PiTuiLayoutEntry,
  PiTuiLayoutNode,
  PiTuiOverlayAnchor,
  PiTuiOverlayHandle,
  PiTuiOverlayMargin,
  PiTuiOverlayOptions,
  PiTuiOverlayUnfocusOptions,
  PiTuiPointerSurface,
  PiTuiPreInputListener,
  PiTuiRuntimeAdapterOptions,
  PiTuiRuntimeState,
  PiTuiScrollState,
  PiTuiSizeValue,
  PiTuiStopOptions,
  PiTuiTerminalPort,
  PiTuiViewport,
} from "./contracts.js";
export { samePointerSurfaces } from "./overlay-geometry.js";
export { DamageAwareTerminalAdapter, PINNED_PI_TUI_DAMAGE_GRAMMAR } from "./damage-aware-terminal.js";
export type {
  DamageAwareTerminalOptions,
  PiTuiDamageDecision,
  PiTuiDamageDecisionReason,
  PiTuiDamageFrameDescriptor,
  PiTuiDamageFrameSafety,
} from "./damage-aware-terminal.js";
export { InputPresentationCoordinator, classifyPiTuiInput } from "./input-presentation-coordinator.js";
export type {
  InputPresentationCoordinatorOptions,
  PiTuiInputCoordinationDecision,
  PiTuiInputCoordinationScheduler,
  PiTuiInputCoordinationTrace,
  PiTuiInputSurfaceKind,
} from "./input-presentation-coordinator.js";
export { PiTuiRuntimeAdapter, PiTuiRuntimeError } from "./adapter.js";
export type { PiTuiRuntimeErrorStage } from "./adapter.js";
export { createPiPresentationRuntime, createPiTerminalBridge } from "./presentation-adapter.js";
