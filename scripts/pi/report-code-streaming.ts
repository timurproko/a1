import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { evaluateRenderingBudgets } from "../../test/support/rendering/rendering-budgets.js";
import { runRenderingMatrix } from "../../test/support/rendering/rendering-matrix.js";

/** Captures a bounded, reproducible code/path baseline without storing terminal or prompt payloads. */
async function capture() {
  const workloads = [];
  for (const id of ["streamed-code-block", "link-bearing-prose", "tall-live-tail"]) {
    const matrix = await runRenderingMatrix(id);
    workloads.push({
      id,
      geometry: matrix.geometry,
      budget: evaluateRenderingBudgets(matrix),
      parity: matrix.comparisonSemanticParity,
      synchronizedReplayParity: matrix.synchronizedReplayParity,
      producers: [...matrix.defaultMode, ...matrix.fullscreenMode].map(producer => ({
        producer: producer.producer,
        mode: producer.requestedMode,
        effectiveMode: producer.effectiveMode,
        checkpoints: producer.checkpoints.filter(checkpoint => /^(initial|code-|link-tail-|tall-tail-)/.test(checkpoint.name)).map(checkpoint => ({
          name: checkpoint.name,
          fullScreenClears: checkpoint.paint.fullScreenClears,
          rowClears: checkpoint.paint.rowClears,
          addressedRows: checkpoint.paint.addressedRowWrites,
          decision: checkpoint.damageDecision ?? null,
          cells: createHash("sha256").update(JSON.stringify(checkpoint.cellFrame)).digest("hex"),
        })),
      })),
    });
  }
  return workloads;
}

const args = process.argv.slice(2);
let phase = "current";
let output: string | undefined;
let repeat = 1;
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (flag === "--phase" && (value === "baseline" || value === "current")) phase = value;
  else if (flag === "--output" && value) output = resolve(value);
  else if (flag === "--repeat" && value && /^[1-3]$/.test(value)) repeat = Number(value);
  else throw new Error("usage: --phase baseline|current --repeat 1|2|3 --output <path>");
}
const productionDiff = execFileSync("git", ["diff", "HEAD", "--name-only", "--", "src"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
if (phase === "baseline" && productionDiff.length > 0) throw new Error("baseline capture requires unchanged production sources");
const reports = [];
for (let index = 0; index < repeat; index++) reports.push(await capture());
if (reports.some(report => JSON.stringify(report) !== JSON.stringify(reports[0]))) {
  for (let index = 1; index < reports.length; index++) {
    for (let workload = 0; workload < reports[0]!.length; workload++) {
      const first = reports[0]![workload]!;
      const next = reports[index]![workload]!;
      for (let producer = 0; producer < first.producers.length; producer++) {
        const previous = first.producers[producer]!;
        for (let point = 0; point < previous.checkpoints.length; point++) {
          const a = previous.checkpoints[point]!;
          const b = next.producers[producer]!.checkpoints[point];
          if (JSON.stringify(a) !== JSON.stringify(b)) process.stderr.write(`${first.id}/${previous.producer}/${previous.mode}: ${JSON.stringify(a)} != ${JSON.stringify(b)}\n`);
        }
      }
    }
  }
  throw new Error("repeated code-streaming evidence disagrees");
}
const report = {
  schema: "code-streaming-evidence-v1",
  phase,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionDiff,
  repeatedCaptures: repeat,
  workloads: reports[0]!,
};
const json = `${JSON.stringify(report, null, 2)}\n`;
if (output) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, json, "utf8");
  process.stdout.write(`${output}\n`);
} else process.stdout.write(json);
for (const workload of report.workloads) {
  process.stderr.write(`${workload.id}: ${workload.budget.passed ? "PASS" : "FAIL"} (${workload.budget.violations.length} violations)\n`);
}
if (phase === "current" && report.workloads.some(workload => !workload.budget.passed)) process.exitCode = 1;
