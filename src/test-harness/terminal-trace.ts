export type TerminalPipelineStage =
  | "source-write"
  | "synchronized-commit"
  | "cursor-epilogue"
  | "pty-read"
  | "virtual-transaction"
  | "supervisor-event"
  | "host-write"
  | "outer-frame";

export interface TerminalPipelineTraceEvent {
  readonly stage: TerminalPipelineStage;
  readonly atMs: number;
  readonly sequence: number;
  readonly sourceCommitId: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

export interface TerminalFrameAmplification {
  readonly sourceCommitId: string;
  readonly sourceWriteCount: number;
  readonly ptyReadCount: number;
  readonly virtualTransactionCount: number;
  readonly hostWriteCount: number;
  readonly outerFrameCount: number;
  readonly firstSourceAtMs: number;
  readonly finalFrameAtMs: number;
  readonly latencyMs: number;
}

export interface TerminalTraceAnalysis {
  readonly requiredStagesPresent: boolean;
  readonly missingStages: readonly TerminalPipelineStage[];
  readonly commits: readonly TerminalFrameAmplification[];
  readonly amplifiedCommitIds: readonly string[];
}

const REQUIRED_STAGES: readonly TerminalPipelineStage[] = [
  "source-write",
  "synchronized-commit",
  "cursor-epilogue",
  "pty-read",
  "virtual-transaction",
  "supervisor-event",
  "host-write",
  "outer-frame",
];

/**
 * Correlates source commits through the terminal pipeline. A commit is visibly
 * amplified when the hosted path exposes more than one committed outer frame.
 */
export function analyzeTerminalPipelineTrace(events: readonly TerminalPipelineTraceEvent[]): TerminalTraceAnalysis {
  const present = new Set(events.map(event => event.stage));
  const missingStages = REQUIRED_STAGES.filter(stage => !present.has(stage));
  const commitIds = [...new Set(events.map(event => event.sourceCommitId))];
  const commits = commitIds.map(sourceCommitId => {
    const correlated = events.filter(event => event.sourceCommitId === sourceCommitId);
    const count = (stage: TerminalPipelineStage) => correlated.filter(event => event.stage === stage).length;
    const sourceTimes = correlated.filter(event => event.stage === "source-write").map(event => event.atMs);
    const frameTimes = correlated.filter(event => event.stage === "outer-frame").map(event => event.atMs);
    const firstSourceAtMs = sourceTimes.length > 0 ? Math.min(...sourceTimes) : 0;
    const finalFrameAtMs = frameTimes.length > 0 ? Math.max(...frameTimes) : firstSourceAtMs;
    return {
      sourceCommitId,
      sourceWriteCount: count("source-write"),
      ptyReadCount: count("pty-read"),
      virtualTransactionCount: count("virtual-transaction"),
      hostWriteCount: count("host-write"),
      outerFrameCount: count("outer-frame"),
      firstSourceAtMs,
      finalFrameAtMs,
      latencyMs: Math.max(0, finalFrameAtMs - firstSourceAtMs),
    };
  });
  return {
    requiredStagesPresent: missingStages.length === 0,
    missingStages,
    commits,
    amplifiedCommitIds: commits.filter(commit => commit.outerFrameCount > 1).map(commit => commit.sourceCommitId),
  };
}
