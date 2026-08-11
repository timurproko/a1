export interface WalkingSkeletonScenario {
  readonly id: "WS-NATIVE-PI-001";
  readonly description: string;
  readonly initialDimensions: { readonly columns: number; readonly rows: number };
  readonly actions: readonly (
    | { readonly type: "wait-for"; readonly text: string; readonly deadlineMs: number; readonly frame: string }
    | { readonly type: "keyboard"; readonly data: string }
    | { readonly type: "mouse"; readonly column: number; readonly row: number }
    | { readonly type: "resize"; readonly columns: number; readonly rows: number }
    | { readonly type: "restart-ui" }
  )[];
}

export const WALKING_SKELETON_SCENARIO: WalkingSkeletonScenario = {
  id: "WS-NATIVE-PI-001",
  description: "Compare direct and AddOne-hosted Native Pi fixtures, then exercise automatic fullscreen handoff, styled output, complete input, resize, reconnect, stability, and exit propagation.",
  initialDimensions: { columns: 90, rows: 28 },
  actions: [
    { type: "wait-for", text: "PI FIXTURE", deadlineMs: 8_000, frame: "automatic-fullscreen" },
    { type: "keyboard", data: "hello π\r" },
    { type: "keyboard", data: "\u0003" },
    { type: "keyboard", data: "\u001b[200~pasted π\u001b[201~" },
    { type: "mouse", column: 20, row: 10 },
    { type: "resize", columns: 72, rows: 22 },
    { type: "wait-for", text: "RESIZED:72x22", deadlineMs: 5_000, frame: "full-viewport-resize" },
    { type: "restart-ui" },
    { type: "wait-for", text: "PI FIXTURE", deadlineMs: 8_000, frame: "resident-snapshot" },
    { type: "keyboard", data: "exit 7\r" },
    { type: "wait-for", text: "FINAL SURFACE", deadlineMs: 5_000, frame: "child-final-output" }
  ]
};
