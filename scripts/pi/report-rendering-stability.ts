import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runRenderingMatrix, type RenderingMatrixResult } from "../../test/support/rendering/rendering-matrix.js";

const options = parseArguments(process.argv.slice(2));
const [parity, long] = await Promise.all([
  runRenderingMatrix("streamed-prose"),
  runRenderingMatrix("long-transcript-follow"),
]);
const report = {
  schema: "a1-rendering-stability-evidence-v1",
  phase: options.phase,
  producers: ["bare-a1", "a1-pi", "pinned-pi"],
  comparisons: {
    default: parity.defaultMode.map(entry => ({ producer: entry.producer, requestedMode: entry.requestedMode, effectiveMode: entry.effectiveMode })),
    modeMatchedFullscreen: parity.fullscreenMode.map(entry => ({ producer: entry.producer, requestedMode: entry.requestedMode, effectiveMode: entry.effectiveMode })),
    comparisonSemanticParity: parity.comparisonSemanticParity,
  },
  longTranscriptFinding: {
    ...long.findings,
    broadStreamCheckpoints: broadStreamCheckpoints(long),
  },
  transientOwnershipFinding: {
    source: "src/integrations/pi/session-ui/session-shell-root.ts",
    behavior: "queued and working rows move from dockRows to document.rows when fit changes to overflow",
    consequence: "detached transcript scrolling can scroll transient chrome away and changes document/dock ownership at the boundary",
  },
};
const json = `${JSON.stringify(report, null, 2)}\n`;
if (options.output === undefined) process.stdout.write(json);
else {
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, json, "utf8");
  process.stdout.write(`${output}\n`);
}

function broadStreamCheckpoints(matrix: RenderingMatrixResult) {
  const bare = matrix.fullscreenMode.find(entry => entry.producer === "bare-a1");
  return (bare?.checkpoints ?? [])
    .filter(checkpoint => checkpoint.name.includes("chunk") && checkpoint.paint.rowClears > 1)
    .map(checkpoint => ({
      name: checkpoint.name,
      rowClears: checkpoint.paint.rowClears,
      addressedRowWrites: checkpoint.paint.addressedRowWrites,
      fullScreenClears: checkpoint.paint.fullScreenClears,
      bytes: checkpoint.paint.bytes,
    }));
}

function parseArguments(arguments_: readonly string[]): { readonly phase: "baseline" | "candidate"; readonly output?: string } {
  let phase: "baseline" | "candidate" = "candidate";
  let output: string | undefined;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--phase") {
      const value = arguments_[index + 1];
      if (value !== "baseline" && value !== "candidate") throw new Error("--phase must be baseline or candidate");
      phase = value;
      index += 1;
    } else if (argument === "--output") {
      output = arguments_[index + 1];
      if (!output) throw new Error("--output requires a path");
      index += 1;
    } else throw new Error(`unknown argument: ${argument}`);
  }
  return { phase, ...(output === undefined ? {} : { output }) };
}
