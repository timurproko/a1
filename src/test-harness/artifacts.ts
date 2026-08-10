import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OrderedEvent } from "../domain/index.js";
import type { ScenarioContext } from "./context.js";
import type { NormalizedFrame, TimelineEntry } from "./pty-runner.js";

export interface ScenarioEvidence {
  readonly scenario: unknown;
  readonly frames: readonly NormalizedFrame[];
  readonly timeline: readonly TimelineEntry[];
  readonly supervisorEvents: readonly OrderedEvent[];
  readonly assertions: readonly { name: string; passed: boolean; detail?: string }[];
  readonly outerLog: string;
}

export async function preserveFailure(context: ScenarioContext, evidence: ScenarioEvidence, error: unknown): Promise<void> {
  await mkdir(context.artifacts, { recursive: true });
  const childLog = await readFile(context.childLog, "utf8").catch(() => "");
  const supervisorLog = await readFile(join(context.runtimeDir, "supervisor.log"), "utf8").catch(() => "");
  const summary = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error);
  const writes = {
    "scenario.json": JSON.stringify(evidence.scenario, null, 2),
    "frames.json": JSON.stringify(evidence.frames, null, 2),
    "input-timeline.json": JSON.stringify(evidence.timeline, null, 2),
    "supervisor-events.json": JSON.stringify(evidence.supervisorEvents, null, 2),
    "assertions.json": JSON.stringify(evidence.assertions, null, 2),
    "outer.log": evidence.outerLog,
    "supervisor.log": supervisorLog,
    "child.log": childLog,
    "final-surface.txt": evidence.frames.at(-1)?.lines.join("\n") ?? "",
    "failure-summary.txt": summary,
  };
  await Promise.all(Object.entries(writes).map(([name, content]) => writeFile(join(context.artifacts, name), content)));
}
