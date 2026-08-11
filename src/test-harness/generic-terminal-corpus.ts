export interface TerminalWorkloadWrite {
  readonly atMs: number;
  readonly sourceCommitId: string;
  readonly part: string;
  readonly data: string;
}

export interface TerminalWorkloadAction {
  readonly atMs: number;
  readonly type: "input" | "resize";
  readonly data?: string;
  readonly columns?: number;
  readonly rows?: number;
}

export interface TerminalWorkloadCase {
  readonly id: string;
  readonly description: string;
  readonly dimensions: { readonly columns: number; readonly rows: number };
  readonly coverage: readonly string[];
  readonly writes: readonly TerminalWorkloadWrite[];
  readonly actions: readonly TerminalWorkloadAction[];
  readonly settleMs: number;
}

export const GENERIC_TERMINAL_WORKLOAD_CORPUS: readonly TerminalWorkloadCase[] = [
  {
    id: "GENERIC-SYNC-MULTI-WRITE",
    description: "One synchronized frame split across content, footer, boundary, and cursor epilogue writes.",
    dimensions: { columns: 40, rows: 8 },
    coverage: ["synchronized-output", "multi-write-frame", "cursor-epilogue", "footer"],
    writes: [
      { atMs: 0, sourceCommitId: "sync-1", part: "begin-content", data: "\x1b[?2026h\x1b[1;1Hgenerated row" },
      { atMs: 0, sourceCommitId: "sync-1", part: "footer", data: "\x1b[8;1HSTATUS:READY" },
      { atMs: 0, sourceCommitId: "sync-1", part: "commit", data: "\x1b[?2026l" },
      { atMs: 0, sourceCommitId: "sync-1", part: "cursor-epilogue", data: "\x1b[1;14H\x1b[5 q\x1b[?25h" },
    ], actions: [], settleMs: 30,
  },
  {
    id: "GENERIC-UNSYNC-MULTI-WRITE",
    description: "One unsynchronized I/O-turn frame emitted as adjacent writes.",
    dimensions: { columns: 40, rows: 8 },
    coverage: ["unsynchronized-output", "multi-write-frame", "progress", "cursor-epilogue"],
    writes: [
      { atMs: 0, sourceCommitId: "unsync-1", part: "label", data: "\x1b[2;1HPROGRESS:" },
      { atMs: 0, sourceCommitId: "unsync-1", part: "value", data: "100%" },
      { atMs: 0, sourceCommitId: "unsync-1", part: "cursor-epilogue", data: "\x1b[2;14H" },
    ], actions: [], settleMs: 30,
  },
  {
    id: "GENERIC-SHELL-SCROLL",
    description: "Primary-screen shell-style line output that advances native scrollback.",
    dimensions: { columns: 32, rows: 5 },
    coverage: ["normal-screen", "shell-scrolling", "scrollback"],
    writes: Array.from({ length: 12 }, (_, index) => ({
      atMs: index * 2, sourceCommitId: `shell-${index + 1}`, part: "line", data: `${index === 0 ? "" : "\r\n"}shell line ${index + 1}`,
    })), actions: [], settleMs: 40,
  },
  {
    id: "GENERIC-GENERATED-STATUS",
    description: "Generated text scrolls while progress, status, and footer rows change atomically.",
    dimensions: { columns: 40, rows: 8 },
    coverage: ["generated-text", "scroll", "progress", "status", "footer", "erase"],
    writes: Array.from({ length: 6 }, (_, index) => ({
      atMs: index * 4, sourceCommitId: `generated-${index + 1}`, part: "atomic-frame",
      data: `\x1b[?2026h\x1b[8;1H\r\ngenerated ${index + 1}\x1b[7;1H\x1b[2KPROGRESS ${index + 1}/6\x1b[8;1H\x1b[2KFOOTER\x1b[?2026l`,
    })), actions: [], settleMs: 50,
  },
  {
    id: "GENERIC-UNICODE-STYLES",
    description: "Wide Unicode and indexed/truecolor styled cells.",
    dimensions: { columns: 40, rows: 8 },
    coverage: ["unicode", "wide-cells", "indexed-color", "truecolor", "attributes"],
    writes: [{
      atMs: 0, sourceCommitId: "styles-1", part: "matrix",
      data: "\x1b[1;1H\x1b[1;3;4;38;5;33;48;2;10;20;30m界 café π\x1b[0m",
    }], actions: [], settleMs: 30,
  },
  {
    id: "GENERIC-ALTERNATE-SCREEN",
    description: "Application-owned alternate-screen entry, updates, and return.",
    dimensions: { columns: 40, rows: 8 },
    coverage: ["alternate-screen", "screen-operation", "cursor"],
    writes: [
      { atMs: 0, sourceCommitId: "alt-enter", part: "enter", data: "\x1b[?1049h\x1b[2J\x1b[HALTERNATE" },
      { atMs: 8, sourceCommitId: "alt-update", part: "update", data: "\x1b[2;1HFRAME 2\x1b[?25l" },
      { atMs: 16, sourceCommitId: "alt-leave", part: "leave", data: "\x1b[?25h\x1b[?1049l" },
    ], actions: [], settleMs: 40,
  },
  {
    id: "GENERIC-RESIZE",
    description: "Content and cursor updates around a complete terminal resize.",
    dimensions: { columns: 40, rows: 8 },
    coverage: ["resize", "resynchronization", "ordering"],
    writes: [
      { atMs: 0, sourceCommitId: "resize-before", part: "before", data: "\x1b[1;1HBEFORE RESIZE" },
      { atMs: 20, sourceCommitId: "resize-after", part: "after", data: "\x1b[1;1HAFTER RESIZE\x1b[2;1H32x6" },
    ], actions: [{ atMs: 10, type: "resize", columns: 32, rows: 6 }], settleMs: 50,
  },
  {
    id: "GENERIC-SUSTAINED-BACKPRESSURE",
    description: "Sustained output exceeds ordinary host write buffering without unbounded state.",
    dimensions: { columns: 80, rows: 12 },
    coverage: ["sustained-output", "backpressure", "bounded-memory", "scroll"],
    writes: Array.from({ length: 128 }, (_, index) => ({
      atMs: Math.floor(index / 8), sourceCommitId: `burst-turn-${Math.floor(index / 8) + 1}`, part: `line-${index % 8 + 1}`,
      data: `\r\n${String(index + 1).padStart(3, "0")}:${"x".repeat(72)}`,
    })), actions: [], settleMs: 80,
  },
] as const;

export function terminalWorkloadById(id: string): TerminalWorkloadCase {
  const workload = GENERIC_TERMINAL_WORKLOAD_CORPUS.find(candidate => candidate.id === id);
  if (!workload) throw new Error(`unknown generic terminal workload '${id}'`);
  return workload;
}
