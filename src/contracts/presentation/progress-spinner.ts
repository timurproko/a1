/** Owned indeterminate-progress styles; Current delegates to the pinned loader's dot frames. */
export type ProgressSpinnerStyle = "none" | "current" | "circle" | "diamond" | "square";

/** Profile-scoped live spinner choice, borrowed by owned status and operation components. */
export interface ProgressSpinnerSource {
  readonly snapshot: () => ProgressSpinnerStyle;
  readonly onChange: (listener: () => void) => () => void;
}
