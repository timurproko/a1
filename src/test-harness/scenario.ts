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
  description: "Launch AddOne, create Native Pi tabs by keyboard and mouse, exercise nested PTY input/resize/exit, and reconnect the UI.",
  initialDimensions: { columns: 90, rows: 28 },
  actions: [
    { type: "wait-for", text: "AddOne", deadlineMs: 8_000, frame: "shell-after-intro" },
    { type: "keyboard", data: "\r" },
    { type: "wait-for", text: "PI FIXTURE", deadlineMs: 8_000, frame: "keyboard-created" },
    { type: "keyboard", data: "hello fixture\r" },
    { type: "wait-for", text: "INPUT", deadlineMs: 5_000, frame: "input-echo" },
    { type: "resize", columns: 72, rows: 22 },
    { type: "wait-for", text: "RESIZED", deadlineMs: 5_000, frame: "child-resized" },
    { type: "restart-ui" },
    { type: "wait-for", text: "PI FIXTURE", deadlineMs: 8_000, frame: "resident-after-ui-restart" },
    { type: "keyboard", data: "exit 7\r" },
    { type: "wait-for", text: "FINAL SURFACE", deadlineMs: 5_000, frame: "child-final-output" },
    { type: "wait-for", text: "exited (7)", deadlineMs: 5_000, frame: "retained-final-surface" },
    { type: "keyboard", data: "\t" },
    { type: "mouse", column: 4, row: 1 },
    { type: "wait-for", text: "Native Pi 2", deadlineMs: 8_000, frame: "mouse-created" }
  ]
};
