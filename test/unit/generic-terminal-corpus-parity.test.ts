import Headless from "@xterm/headless";
import { describe, expect, it } from "vitest";
import type { TerminalModes } from "../../src/domain/index.js";
import { PtyOutputTransactionAssembler, type AssembledPtyOutput, type OutputAssemblerScheduler } from "../../src/drivers/terminal/output-transaction-assembler.js";
import { ResidentTerminalState } from "../../src/drivers/terminal/resident-terminal-state.js";
import { GENERIC_TERMINAL_WORKLOAD_CORPUS, type TerminalWorkloadCase } from "../../src/test-harness/generic-terminal-corpus.js";
import { compareTerminalParity, type CommittedTerminalFrame, type TerminalParityObservation } from "../../src/test-harness/generic-terminal-parity.js";

const { Terminal } = Headless;
const modes: TerminalModes = {
  applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false,
  bracketedPaste: false, focusReporting: false, mouseTracking: "none", mouseProtocol: "x10",
  synchronizedOutput: false, wraparound: true, keyboardProtocol: "legacy", modifyOtherKeys: 0,
  kittyKeyboardFlags: 0, win32InputMode: false,
};
class ManualScheduler implements OutputAssemblerScheduler {
  callbacks: (() => void)[] = [];
  scheduleEndOfIoTurn(callback: () => void): { cancel(): void } {
    let active = true;
    this.callbacks.push(() => { if (active) callback(); });
    return { cancel: () => { active = false; } };
  }
  flush(): void { for (const callback of this.callbacks.splice(0)) callback(); }
}
function write(terminal: InstanceType<typeof Terminal>, data: string): Promise<void> {
  return new Promise(resolve => terminal.write(data, resolve));
}

describe("deterministic generic terminal corpus parity", () => {
  for (const workload of GENERIC_TERMINAL_WORKLOAD_CORPUS) {
    it(`matches direct and transaction-assembled state for ${workload.id}`, async () => {
      const { direct, hosted } = await execute(workload);
      const verdict = compareTerminalParity(direct, hosted);
      expect(verdict.failures, JSON.stringify(verdict.metrics)).toEqual([]);
      expect(verdict.metrics.maxHostedFramesPerSourceCommit).toBeLessThanOrEqual(1);
    });
  }
});

async function execute(workload: TerminalWorkloadCase): Promise<{ direct: TerminalParityObservation; hosted: TerminalParityObservation }> {
  const directTerminal = new Terminal({ cols: workload.dimensions.columns, rows: workload.dimensions.rows, scrollback: 500, allowProposedApi: true });
  const hostedTerminal = new Terminal({ cols: workload.dimensions.columns, rows: workload.dimensions.rows, scrollback: 500, allowProposedApi: true });
  const directState = new ResidentTerminalState(directTerminal);
  const hostedState = new ResidentTerminalState(hostedTerminal);
  const directFrames: CommittedTerminalFrame[] = [];
  const hostedFrames: CommittedTerminalFrame[] = [];
  const scheduler = new ManualScheduler();
  const batches: AssembledPtyOutput[] = [];
  const assembler = new PtyOutputTransactionAssembler(batch => batches.push(batch), { scheduler, maxBufferedBytes: 2 * 1024 * 1024 });
  let directRevision = 0;
  let hostedRevision = 0;
  let directSequence = 0;
  let appliedAction = 0;
  const groups = groupCommits(workload);

  for (const group of groups) {
    while (appliedAction < workload.actions.length && workload.actions[appliedAction]!.atMs <= group.atMs) {
      const action = workload.actions[appliedAction++]!;
      if (action.type === "resize") {
        directTerminal.resize(action.columns!, action.rows!);
        hostedTerminal.resize(action.columns!, action.rows!);
      }
    }
    for (const output of group.data) {
      await write(directTerminal, output);
      directSequence += 1;
      assembler.push(output);
    }
    scheduler.flush();
    scheduler.flush();
    expect(batches).toHaveLength(1);
    const batch = batches.shift()!;
    await write(hostedTerminal, batch.data);
    const metadata = { cursorVisible: true, cursorStyle: "default" as const, cursorBlinking: true, modes };
    directFrames.push({
      sourceCommitId: group.sourceCommitId, committedAtMs: group.atMs,
      surface: directState.capture(directSequence, ++directRevision, false, metadata), complete: true,
    });
    hostedFrames.push({
      sourceCommitId: group.sourceCommitId, committedAtMs: group.atMs,
      surface: hostedState.capture(batch.sourceSequence.end, ++hostedRevision, false, metadata),
      complete: !batch.requiresResynchronization,
    });
  }
  assembler.dispose();
  const sourceBytes = workload.writes.reduce((total, output) => total + Buffer.byteLength(output.data), 0);
  const observation = (frames: readonly CommittedTerminalFrame[], hostBytes: number): TerminalParityObservation => ({
    frames, inputToFrameLatencyMs: [], sourceBytes, hostBytes, idleHostWriteCount: 0, finalRestorationPassed: true,
  });
  return { direct: observation(directFrames, sourceBytes), hosted: observation(hostedFrames, sourceBytes * 2) };
}

function groupCommits(workload: TerminalWorkloadCase): { sourceCommitId: string; atMs: number; data: string[] }[] {
  const groups: { sourceCommitId: string; atMs: number; data: string[] }[] = [];
  for (const output of workload.writes) {
    const last = groups.at(-1);
    if (last?.sourceCommitId === output.sourceCommitId) last.data.push(output.data);
    else groups.push({ sourceCommitId: output.sourceCommitId, atMs: output.atMs, data: [output.data] });
  }
  return groups;
}
