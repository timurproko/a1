import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { applyTerminalRenderTransaction, type AddOneEvent, type HostTerminalInputEvent, type LogicalTerminalAgent, type OrderedEvent, type SupervisorSnapshot, type TerminalRenderTransaction, type TerminalSurface } from "../domain/index.js";
import { createHostTerminalAdapter, queryHostCursorPosition } from "../host-terminal/index.js";
import { SupervisorClient } from "../protocol/index.js";
import { inspectNativePiReadiness, NATIVE_PI_READINESS_DEADLINE_MS, type NativePiReadinessEvidence } from "./native-pi-readiness.js";
import { drainPendingTerminalInput } from "./terminal-input-cleanup.js";
import { TerminalOwnershipTransaction, terminalExitDisposition } from "./terminal-lifecycle.js";

export interface UiDependencies {
  readonly input: NodeJS.ReadStream;
  readonly output: NodeJS.WriteStream;
  readonly clock: { now(): number };
  readonly cwd: string;
}

export async function runUi(endpoint: string, overrides: Partial<UiDependencies> = {}): Promise<number> {
  const input = overrides.input ?? process.stdin;
  const output = overrides.output ?? process.stdout;
  const clock = overrides.clock ?? { now: () => performance.now() };
  const cwd = overrides.cwd ?? process.cwd();
  const client = new SupervisorClient();
  const log = (message: string) => {
    const path = process.env.ADDONE_UI_LOG;
    if (path) appendFileSync(path, `${new Date().toISOString()} ${message}\n`);
  };
  const hostTerminal = createHostTerminalAdapter(input, output, process.platform, transaction => {
    log(`host-frame revision=${transaction.revision} spans=${transaction.spanCount} scrollRows=${transaction.scrollRows} synchronized=${transaction.synchronized}`);
  }, 0);
  const recordHostMode = (phase: string, mode: number | null) => {
    const path = process.env.ADDONE_HOST_MODE_EVIDENCE;
    if (path) appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), pid: process.pid, phase, mode })}\n`);
  };
  const capturedHostState = hostTerminal.capture();
  recordHostMode("captured-before-ui", capturedHostState.inputMode);
  const initialHostCursorPromise = queryHostCursorPosition(input, output);
  let snapshot = await client.connect(endpoint);
  let stopped = false;
  let startingTerminal = false;
  let handedOff = false;
  let hostScreenActive = true;
  let readinessTimer: NodeJS.Timeout | null = null;
  let stopHostInput = () => {};
  let removeExitCleanup = () => {};
  let readinessStartedAt = 0;
  const readinessDeadlineMs = parsePositiveDuration(process.env.ADDONE_NATIVE_PI_READINESS_MS, NATIVE_PI_READINESS_DEADLINE_MS);
  let lastReadiness: NativePiReadinessEvidence | null = null;
  let resolveStopped: ((code: number) => void) | null = null;
  const stoppedPromise = new Promise<number>(resolve => { resolveStopped = resolve; });

  const dimensions = () => {
    const injected = readInjectedDimensions(process.env.ADDONE_TEST_TERMINAL_SIZE_PATH);
    return {
      columns: Math.max(2, injected?.columns ?? output.columns ?? 80),
      rows: Math.max(1, injected?.rows ?? output.rows ?? 24),
    };
  };
  const selectedAgent = (): LogicalTerminalAgent | null => snapshot.agents.find(agent => agent.id === snapshot.workspace.selectedAgentId) ?? null;

  const restoreHostScreen = () => {
    if (!hostScreenActive) return;
    hostScreenActive = false;
    hostTerminal.restore(capturedHostState);
  };

  const ownership = new TerminalOwnershipTransaction({
    stopInput: () => stopHostInput(),
    commitFinalSurface: () => selectedAgent()?.surface ?? null,
    discardChildModes: surface => { if (surface) log(`discarding-virtual-modes revision=${surface.revision}`); },
    drainInput: async () => {
      await drainPendingTerminalInput(input);
      input.pause();
    },
    restoreHost: () => restoreHostScreen(),
  });

  const paintSnapshot = async (surface: TerminalSurface) => {
    if (stopped) return;
    handedOff = true;
    const initialHostCursor = await initialHostCursorPromise;
    log(`initial-host-cursor row=${initialHostCursor?.row ?? "unknown"} column=${initialHostCursor?.column ?? "unknown"}`);
    hostTerminal.setInitialNormalCursorRow(initialHostCursor?.row ?? 0);
    hostTerminal.renderSnapshot(surface);
    log(`virtual-snapshot-rendered revision=${surface.revision} sequence=${surface.outputSequence} scrollbackBase=${surface.scrollbackBase ?? 0} scrollbackRows=${surface.scrollbackCells?.length ?? 0}`);
  };

  const paintTransaction = (transaction: TerminalRenderTransaction) => {
    if (stopped || !handedOff) return;
    hostTerminal.renderTransaction(transaction);
    const scrollRows = transaction.operations
      .filter((operation): operation is Extract<typeof operation, { type: "scroll" }> => operation.type === "scroll")
      .reduce((total, operation) => total + operation.rows, 0);
    log(`virtual-transaction-rendered base=${transaction.baseRevision} revision=${transaction.revision} source=${transaction.sourceSequence.start}-${transaction.sourceSequence.end} ranges=${transaction.dirtyRanges.length} scrollRows=${scrollRows} boundary=${transaction.atomicBoundary}`);
  };

  const handoffWhenReady = (surface: TerminalSurface) => {
    if (handedOff) return;
    const elapsedMs = Math.max(0, clock.now() - readinessStartedAt);
    lastReadiness = inspectNativePiReadiness(surface, elapsedMs, readinessDeadlineMs);
    log(`readiness status=${lastReadiness.status} visible=${lastReadiness.visibleCharacters} cursorOnly=${lastReadiness.cursorOnly} editor=${lastReadiness.editorMarker ?? "none"} context=${lastReadiness.contextMarker ?? "none"}`);
    if (lastReadiness.status === "failed") {
      failReadiness(lastReadiness);
      return;
    }
    if (lastReadiness.status !== "ready") return;
    if (readinessTimer) clearTimeout(readinessTimer);
    readinessTimer = null;
    void paintSnapshot(surface);
    log(`first-ready-virtual-snapshot revision=${surface.revision} sequence=${surface.outputSequence}`);
  };

  const startReadinessDeadline = () => {
    if (readinessStartedAt === 0) readinessStartedAt = clock.now();
    if (readinessTimer) return;
    readinessTimer = setTimeout(() => {
      if (stopped || handedOff) return;
      const surface = selectedAgent()?.surface;
      if (surface) {
        const evidence = inspectNativePiReadiness(surface, readinessDeadlineMs, readinessDeadlineMs);
        lastReadiness = evidence;
        failReadiness(evidence);
      } else {
        failReadiness({
          status: "failed",
          reason: "Native Pi produced no terminal surface before the readiness deadline",
          visibleCharacters: 0,
          cursorOnly: true,
          editorMarker: null,
          contextMarker: null,
          elapsedMs: readinessDeadlineMs,
          deadlineMs: readinessDeadlineMs,
        });
      }
    }, readinessDeadlineMs);
  };

  const failReadiness = (evidence: NativePiReadinessEvidence) => {
    log(`readiness-failed ${JSON.stringify(evidence)}`);
    const evidencePath = process.env.ADDONE_NATIVE_PI_READINESS_EVIDENCE;
    if (evidencePath) writeFileSync(evidencePath, JSON.stringify({ evidence, agent: selectedAgent() }, null, 2));
    showError(new Error(evidence.reason));
    void shutdown(1);
  };

  const ensureTerminal = async () => {
    if (startingTerminal || stopped) return;
    startingTerminal = true;
    try {
      startReadinessDeadline();
      const resident = selectedAgent();
      if (!handedOff && resident?.surface) handoffWhenReady(resident.surface);
      const result = await client.command({
        type: "ensure-initial-terminal-agent",
        requestId: randomUUID(),
        cwd,
        dimensions: dimensions(),
      });
      if (!result.ok) throw new Error(result.error?.message ?? "failed to start Native Pi");
      const agent = selectedAgent();
      if (!handedOff && agent?.surface) handoffWhenReady(agent.surface);
    } catch (error) {
      showError(error);
      await shutdown(1);
    }
  };

  const applyOrdered = (ordered: OrderedEvent) => {
    log(`event revision=${ordered.revision} expected=${snapshot.revision + 1} type=${ordered.event.type}`);
    if (ordered.revision !== snapshot.revision + 1) {
      void client.command({ type: "resynchronize", requestId: randomUUID() });
      return;
    }
    if (ordered.event.type === "terminal-render-transaction") {
      const transactionEvent = ordered.event;
      const agent = snapshot.agents.find(candidate => candidate.id === transactionEvent.agentId && candidate.currentGeneration.id === transactionEvent.generationId);
      if (!agent?.surface || agent.surface.revision !== transactionEvent.transaction.baseRevision) {
        void client.command({ type: "resynchronize", requestId: randomUUID() });
        return;
      }
    }
    snapshot = applyEvent({ ...snapshot, revision: ordered.revision }, ordered.event);
    if (ordered.event.type === "terminal-surface-updated") {
      if (handedOff) void paintSnapshot(ordered.event.surface);
      else handoffWhenReady(ordered.event.surface);
    }
    if (ordered.event.type === "terminal-render-transaction") {
      if (handedOff) paintTransaction(ordered.event.transaction);
      else {
        const surface = selectedAgent()?.surface;
        if (surface) handoffWhenReady(surface);
      }
    }
    if (ordered.event.type === "generation-exited" && ordered.event.agentId === snapshot.workspace.selectedAgentId) {
      const agent = selectedAgent();
      if (!agent || terminalExitDisposition(agent.profile, false) === "exit-foreground-ui") void shutdown(ordered.event.exitCode ?? 1);
    }
    if (ordered.event.type === "generation-failed" && ordered.event.agentId === snapshot.workspace.selectedAgentId) {
      showError(new Error(ordered.event.message));
      void shutdown(1);
    }
  };

  client.on("snapshot", next => {
    snapshot = next;
    const agent = selectedAgent();
    if (agent?.surface) handoffWhenReady(agent.surface);
  });
  client.on("event", applyOrdered);
  client.on("disconnect", () => { if (!stopped) void shutdown(1); });

  const sendInputEvents = (events: readonly HostTerminalInputEvent[]) => {
    const agent = selectedAgent();
    if (!agent || agent.currentGeneration.state === "exited" || events.length === 0) return;
    void client.command({
      type: "terminal-input-batch",
      requestId: randomUUID(),
      agentId: agent.id,
      generationId: agent.currentGeneration.id,
      events,
    }).then(result => {
      if (!result.ok) showError(new Error(result.error?.message ?? "input failed"));
    }).catch(showError);
  };

  const onResize = () => {
    const agent = selectedAgent();
    if (agent && !["exited", "stopped", "error"].includes(agent.currentGeneration.state)) {
      void client.command({
        type: "terminal-resize",
        requestId: randomUUID(),
        agentId: agent.id,
        generationId: agent.currentGeneration.id,
        dimensions: dimensions(),
      }).then(result => {
        if (!result.ok) showError(new Error(result.error?.message ?? "resize failed"));
      }).catch(showError);
    }
  };

  function showError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    hostTerminal.writeApplicationFrame(`\x1b[?25h\r\n\x1b[31m${message}\x1b[0m\r\n`);
  }

  async function shutdown(code: number): Promise<void> {
    if (stopped) return;
    stopped = true;
    if (readinessTimer) clearTimeout(readinessTimer);
    readinessTimer = null;
    output.off("resize", onResize);
    client.close();
    await ownership.close();
    hostTerminal.restore(capturedHostState);
    removeExitCleanup();
    // Do not synchronously launch a second PowerShell probe after restoration.
    // The Windows adapter has already restored this captured mode; optional
    // evidence collection must not keep the foreground CLI alive after exit.
    recordHostMode("restored-target-after-ui", capturedHostState.inputMode);
    resolveStopped?.(code);
  }

  output.on("resize", onResize);
  hostTerminal.enter();
  removeExitCleanup = hostTerminal.installExitCleanup();
  stopHostInput = hostTerminal.startInput(events => {
    if (handedOff && !stopped) sendInputEvents(events);
  });
  void ensureTerminal();
  return await stoppedPromise;
}

function applyEvent(snapshot: SupervisorSnapshot, event: AddOneEvent): SupervisorSnapshot {
  if (event.type === "agent-created") {
    return {
      ...snapshot,
      agents: [...snapshot.agents, event.agent],
      workspace: { ...snapshot.workspace, agentIds: [...snapshot.workspace.agentIds, event.agent.id] },
    };
  }
  if (event.type === "selection-changed") return { ...snapshot, workspace: { ...snapshot.workspace, selectedAgentId: event.agentId } };
  return {
    ...snapshot,
    agents: snapshot.agents.map(agent => {
      if (agent.id !== event.agentId || agent.currentGeneration.id !== event.generationId) return agent;
      if (event.type === "generation-ready") return { ...agent, currentGeneration: { ...agent.currentGeneration, state: "ready" } };
      if (event.type === "terminal-surface-updated") return { ...agent, surface: event.surface };
      if (event.type === "terminal-render-transaction") return agent.surface ? { ...agent, surface: applyTerminalRenderTransaction(agent.surface, event.transaction) } : agent;
      if (event.type === "generation-exited") return {
        ...agent,
        surface: event.surface ?? agent.surface,
        currentGeneration: { ...agent.currentGeneration, state: "exited", exitCode: event.exitCode, signal: event.signal, exitedAt: new Date().toISOString() },
      };
      return { ...agent, currentGeneration: { ...agent.currentGeneration, state: "error", error: event.message } };
    }),
  };
}

function readInjectedDimensions(path: string | undefined): { columns: number; rows: number } | null {
  if (!path) return null;
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as { columns?: unknown; rows?: unknown };
    return typeof value.columns === "number" && typeof value.rows === "number" ? { columns: value.columns, rows: value.rows } : null;
  } catch {
    return null;
  }
}

function parsePositiveDuration(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
