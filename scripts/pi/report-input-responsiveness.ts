import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { analyzeInputPhaseEvidence } from "../../test/support/input-responsiveness/input-phase-evidence.js";
import { runInputProducer, type InputProducerResult } from "../../test/support/input-responsiveness/input-producer.js";
import { INPUT_RESPONSIVENESS_WORKLOADS } from "../../test/support/input-responsiveness/input-workloads.js";

const options = parseArguments(process.argv.slice(2));
const workloadIds = options.full
  ? INPUT_RESPONSIVENESS_WORKLOADS.map(workload => workload.id)
  : ["smoke-current-state", "smoke-menu-stream", "full-empty-transcript", "full-long-transcript"];
const workloads = [];
for (const workloadId of workloadIds) {
  const workload = INPUT_RESPONSIVENESS_WORKLOADS.find(candidate => candidate.id === workloadId)!;
  const results: InputProducerResult[] = [];
  for (const [producer, variant] of [
    ["bare-a1", "baseline"],
    ["bare-a1", "candidate"],
    ["a1-pi", "candidate"],
    ["pinned-pi", "candidate"],
  ] as const) {
    results.push(await runInputProducer({
      producer,
      variant,
      workloadId,
      state: { cwd: process.cwd(), columns: workload.columns, rows: workload.rows, theme: "dark" },
    }));
  }
  workloads.push({
    id: workloadId,
    expectedInputRevisions: workload.expectedInputRevisions,
    semanticParity: sameFinalSemantics(results[1]!, results[2]!) && sameFinalSemantics(results[2]!, results[3]!),
    producers: results.map(result => summarize(
      result,
      workload.expectedInputRevisions,
      workload.expectedPresentedRevision ?? workload.expectedInputRevisions,
    )),
  });
}
const report = {
  schema: "a1-input-responsiveness-evidence-v1",
  provenance: {
    baseline: "current source with coordination and viewport reuse disabled through evidence-only seams",
    candidate: "current source with production bare-A1 composition",
    comparison: "isolated a1-pi and source-traceable pinned-Pi component producers",
    wallClock: "diagnostic-only monotonic milliseconds",
  },
  workloads,
};
const rendered = options.summary ? renderSummary(report) : `${JSON.stringify(report, null, 2)}\n`;
if (options.output === undefined) process.stdout.write(rendered);
else {
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, rendered, "utf8");
  process.stdout.write(`${output}\n`);
}

function summarize(result: InputProducerResult, expectedRevision: number, expectedPresentedRevision: number) {
  const phases = analyzeInputPhaseEvidence(result.phases, expectedRevision, { expectedPresentedRevision });
  return {
    producer: result.producer,
    variant: result.variant,
    structure: {
      receivedRevisions: phases.receivedRevisions,
      appliedRevisions: phases.appliedRevisions,
      presentedRevisions: phases.presentedRevisions,
      inputDrivenFrames: phases.inputDrivenFrames,
      staleFrames: phases.staleFrames,
      finalBacklog: phases.finalBacklog,
      maximumDeliveryBacklog: phases.maximumPendingDepth,
      maximumPendingPresentations: phases.maximumPendingPresentationDepth,
      dockOnlyFrames: result.checkpoints.filter(checkpoint => checkpoint.viewportCause === "dock-input").length,
      stableTranscriptBlockRenders: result.checkpoints
        .filter(checkpoint => checkpoint.viewportCause === "dock-input")
        .reduce((total, checkpoint) => total + (checkpoint.transcriptBlockRenders ?? 0), 0),
      terminalWrites: result.checkpoints.reduce((total, checkpoint) => total + checkpoint.writeEnd - checkpoint.writeStart, 0),
      terminalBytes: result.checkpoints.reduce((total, checkpoint) => total + result.writes
        .slice(checkpoint.writeStart, checkpoint.writeEnd)
        .reduce((bytes, write) => bytes + Buffer.byteLength(write.data), 0), 0),
      fullscreenClears: result.checkpoints.reduce((total, checkpoint) => total + result.writes
        .slice(checkpoint.writeStart, checkpoint.writeEnd)
        .filter(write => write.data.includes("\u001b[2J")).length, 0),
    },
    diagnostics: {
      firstStateInputToWriteMs: phases.firstStateInputToWriteMs,
      finalStateInputToWriteMs: phases.finalStateInputToWriteMs,
      semanticMs: phases.phaseDurationsMs.semantic,
      compositionMs: phases.phaseDurationsMs.composition,
      writeMs: phases.phaseDurationsMs.write,
    },
    checkpoints: result.checkpoints.map(checkpoint => ({
      name: checkpoint.name,
      text: checkpoint.text,
      actions: checkpoint.actions,
      selected: checkpoint.selected,
      viewportCause: checkpoint.viewportCause,
      viewportCompositions: checkpoint.viewportCompositions,
      transcriptBlockRenders: checkpoint.transcriptBlockRenders,
    })),
  };
}

function sameFinalSemantics(left: InputProducerResult, right: InputProducerResult): boolean {
  const select = (result: InputProducerResult) => result.checkpoints.map(checkpoint => ({
    name: checkpoint.name,
    text: checkpoint.text,
    actions: checkpoint.actions,
    selected: checkpoint.selected,
  }));
  return JSON.stringify(select(left)) === JSON.stringify(select(right));
}

function renderSummary(report: { readonly workloads: readonly { readonly id: string; readonly semanticParity: boolean; readonly producers: readonly ReturnType<typeof summarize>[] }[] }): string {
  const rows = ["Input responsiveness evidence"];
  for (const workload of report.workloads) {
    rows.push(`${workload.id}: semantic parity=${workload.semanticParity}`);
    for (const producer of workload.producers) {
      rows.push(`  ${producer.producer}/${producer.variant}: frames=${producer.structure.inputDrivenFrames}, dock-only=${producer.structure.dockOnlyFrames}, backlog=${producer.structure.finalBacklog}, first=${String(producer.diagnostics.firstStateInputToWriteMs)}ms, final=${String(producer.diagnostics.finalStateInputToWriteMs)}ms`);
    }
  }
  return `${rows.join("\n")}\n`;
}

function parseArguments(args: readonly string[]): { readonly output?: string; readonly summary: boolean; readonly full: boolean } {
  let output: string | undefined;
  let summary = false;
  let full = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--output") {
      output = args[index + 1];
      if (!output) throw new Error("--output requires a path");
      index += 1;
    } else if (argument === "--summary") summary = true;
    else if (argument === "--full") full = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return { ...(output === undefined ? {} : { output }), summary, full };
}
