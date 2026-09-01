import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runRenderingMatrix, type RenderingMatrixResult } from "../../test/support/rendering/rendering-matrix.js";

const options = parseArguments(process.argv.slice(2));
const reports = options.phase === "baseline"
  ? [await readBaselineEvidence()]
  : await runRepeatedCurrentEvidence(options.repeat);
const report = reports[0]!;
const rendered = options.format === "summary" ? renderSummary(report) : `${JSON.stringify(report, null, 2)}\n`;
if (options.output === undefined) process.stdout.write(rendered);
else {
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, rendered, "utf8");
  process.stdout.write(`${output}\n`);
}

async function runRepeatedCurrentEvidence(repeat: number): Promise<readonly unknown[]> {
  const reports: unknown[] = [];
  for (let index = 0; index < repeat; index += 1) reports.push(await runCurrentEvidence());
  const canonical = JSON.stringify(reports[0]);
  for (let index = 1; index < reports.length; index += 1) {
    if (JSON.stringify(reports[index]) !== canonical) {
      throw new Error(`rendering evidence invocation ${index + 1} disagrees with invocation 1`);
    }
  }
  return reports;
}

async function runCurrentEvidence(): Promise<unknown> {
  // Concurrency: serialize matrices as well as their producers. Cold tsx workers contend on Windows
  // when reports launch multiple matrices together, which previously caused false timeouts.
  const parity = await runRenderingMatrix("streamed-prose");
  const long = await runRenderingMatrix("long-transcript-follow");
  const boundary = await runRenderingMatrix("fit-overflow-boundary");
  return {
    schema: "a1-rendering-stability-evidence-v1",
    phase: "current",
    provenance: {
      source: "current-worktree",
      immutable: false,
      findings: "derived-from-captured-checkpoints",
    },
    producers: ["bare-a1", "a1-pi", "pinned-pi"],
    comparisons: {
      default: parity.defaultMode.map(entry => ({
        producer: entry.producer,
        requestedMode: entry.requestedMode,
        effectiveMode: entry.effectiveMode,
      })),
      modeMatchedFullscreen: parity.fullscreenMode.map(entry => ({
        producer: entry.producer,
        requestedMode: entry.requestedMode,
        effectiveMode: entry.effectiveMode,
      })),
      comparisonSemanticParity: parity.comparisonSemanticParity,
    },
    longTranscriptFinding: {
      ...long.findings,
      streamDamageCheckpoints: streamDamageCheckpoints(long),
    },
    fitOverflowFinding: {
      dockGeometry: boundary.findings.dockGeometry,
      safeShiftCheckpoints: boundary.findings.safeShiftCheckpoints,
    },
  };
}

async function readBaselineEvidence(): Promise<unknown> {
  const fixture = fileURLToPath(new URL("../../test/fixtures/rendering/baseline-rendering-stability.json", import.meta.url));
  return JSON.parse(await readFile(fixture, "utf8"));
}

function streamDamageCheckpoints(matrix: RenderingMatrixResult) {
  const bare = matrix.fullscreenMode.find(entry => entry.producer === "bare-a1");
  return (bare?.checkpoints ?? [])
    .filter(checkpoint => checkpoint.name.includes("chunk") && checkpoint.paint.rowClears > 1)
    .map(checkpoint => ({
      name: checkpoint.name,
      rowClears: checkpoint.paint.rowClears,
      addressedRowWrites: checkpoint.paint.addressedRowWrites,
      fullScreenClears: checkpoint.paint.fullScreenClears,
      bytes: checkpoint.paint.bytes,
      damageDecision: checkpoint.damageDecision,
    }));
}

function renderSummary(value: unknown): string {
  if (typeof value !== "object" || value === null) throw new TypeError("rendering evidence summary requires an object");
  const report = value as {
    phase?: unknown;
    comparisons?: { comparisonSemanticParity?: unknown };
    longTranscriptFinding?: {
      bareA1MaximumRowClearsPerStreamCheckpoint?: unknown;
      bareA1UnexpectedFullScreenClears?: unknown;
      streamDamageCheckpoints?: readonly { readonly name?: unknown; readonly damageDecision?: { readonly reason?: unknown } }[];
      broadStreamCheckpoints?: readonly { readonly name?: unknown }[];
    };
  };
  const checkpoints = report.longTranscriptFinding?.streamDamageCheckpoints
    ?? report.longTranscriptFinding?.broadStreamCheckpoints
    ?? [];
  return [
    `Rendering stability evidence (${String(report.phase ?? "unknown")})`,
    `Comparison semantic parity: ${JSON.stringify(report.comparisons?.comparisonSemanticParity ?? null)}`,
    `Maximum bare-A1 stream row clears: ${String(report.longTranscriptFinding?.bareA1MaximumRowClearsPerStreamCheckpoint ?? "unknown")}`,
    `Unexpected bare-A1 full-screen clears: ${String(report.longTranscriptFinding?.bareA1UnexpectedFullScreenClears ?? "unknown")}`,
    `Stream checkpoints: ${checkpoints.map(checkpoint => `${String(checkpoint.name)}:${String(checkpoint.damageDecision?.reason ?? "baseline-broad-repaint")}`).join(", ")}`,
    "",
  ].join("\n");
}

function parseArguments(arguments_: readonly string[]): {
  readonly phase: "baseline" | "current";
  readonly format: "json" | "summary";
  readonly output?: string;
  readonly repeat: number;
} {
  let phase: "baseline" | "current" = "current";
  let format: "json" | "summary" = "json";
  let output: string | undefined;
  let repeat = 1;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--phase") {
      const value = arguments_[index + 1];
      if (value !== "baseline" && value !== "current" && value !== "candidate") {
        throw new Error("--phase must be baseline or current");
      }
      phase = value === "candidate" ? "current" : value;
      index += 1;
    } else if (argument === "--format") {
      const value = arguments_[index + 1];
      if (value !== "json" && value !== "summary") throw new Error("--format must be json or summary");
      format = value;
      index += 1;
    } else if (argument === "--output") {
      output = arguments_[index + 1];
      if (!output) throw new Error("--output requires a path");
      index += 1;
    } else if (argument === "--repeat") {
      const value = Number.parseInt(arguments_[index + 1] ?? "", 10);
      if (!Number.isSafeInteger(value) || value < 1 || value > 5) throw new Error("--repeat must be between 1 and 5");
      repeat = value;
      index += 1;
    } else throw new Error(`unknown argument: ${argument}`);
  }
  if (phase === "baseline" && repeat !== 1) throw new Error("immutable baseline evidence does not need repetition");
  return { phase, format, ...(output === undefined ? {} : { output }), repeat };
}
