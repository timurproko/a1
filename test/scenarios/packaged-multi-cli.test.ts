import { rm, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { preparePackagedCandidate } from "../../src/test-harness/packaged-candidate.js";
import { OuterPtyRunner, type NormalizedFrame } from "../../src/test-harness/pty-runner.js";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const workloads = [
  { id: "GENERIC-SYNC-MULTI-WRITE", marker: "STATUS:READY" },
  { id: "GENERIC-SHELL-SCROLL", marker: "shell line 12" },
  { id: "GENERIC-UNICODE-STYLES", marker: "界 café π" },
] as const;

describe("packaged application-agnostic multi-CLI parity", () => {
  it("runs Node and the platform shell through the same packaged terminal pipeline", async () => {
    const preparation = await createScenarioContext("packaged-multi-cli-prepare");
    const candidate = await preparePackagedCandidate({
      packageRoot: repository,
      piExecutable: process.execPath,
      artifacts: preparation.artifacts,
      environment: preparation.environment,
    });
    const fixture = resolve(candidate.packageRoot, "dist/src/test-harness/fixtures/terminal-workload.js");
    const verdicts: unknown[] = [];
    try {
      for (const workload of workloads) {
        for (const launcher of ["node", "shell"] as const) {
          const context = await createScenarioContext(`packaged-${launcher}-${workload.id.toLowerCase()}`);
          const isolated = { ...context.environment };
          Object.assign(context.environment, candidate.environment, isolated, {
            ADDONE_NATIVE_PI_READINESS_MS: "5_000",
            ADDONE_TERMINAL_WORKLOAD: workload.id,
            ADDONE_TERMINAL_WORKLOAD_TRACE: resolve(context.artifacts, `${launcher}-workload-trace.jsonl`),
          });
          const launch = launcher === "node" ? nodeLaunch(fixture) : shellLaunch(fixture);
          context.environment.ADDONE_NATIVE_PI_EXECUTABLE = launch.executable;
          context.environment.ADDONE_NATIVE_PI_ARGUMENTS = JSON.stringify(launch.arguments);
          const direct = new OuterPtyRunner(context, 40, 8);
          const hosted = new OuterPtyRunner(context, 40, 8);
          try {
            direct.launch(launch.executable, launch.arguments);
            const directFrame = await direct.waitFor(workload.marker, 8_000, `${launcher}-direct-${workload.id}`);
            await direct.waitForExit(5_000);
            await writeFile(context.terminalSizePath, JSON.stringify({ columns: 40, rows: 8 }));

            hosted.launch(process.execPath, [candidate.cli]);
            const hostedFrame = await hosted.waitFor(workload.marker, 15_000, `${launcher}-hosted-${workload.id}`);
            await hosted.waitForExit(8_000);
            expectStableParity(directFrame, hostedFrame);
            verdicts.push({ workloadId: workload.id, launcher, passed: true, executable: launch.executable, arguments: launch.arguments });
          } finally {
            await direct.cleanup();
            await hosted.cleanup();
          }
        }
      }
      await writeFile(resolve(preparation.artifacts, "packaged-multi-cli-verdict.json"), JSON.stringify({
        schema: "addone-packaged-multi-cli-verdict-v1",
        platform: process.platform,
        architecture: process.arch,
        passed: true,
        workloads: verdicts,
      }, null, 2));
    } finally {
      await rm(candidate.root, { recursive: true, force: true });
    }
  }, 120_000);
});

function nodeLaunch(fixture: string): { executable: string; arguments: string[] } {
  return { executable: process.execPath, arguments: [fixture] };
}

function shellLaunch(fixture: string): { executable: string; arguments: string[] } {
  if (platform() === "win32") {
    const executable = resolve(process.env.SystemRoot ?? "C:/Windows", "System32/WindowsPowerShell/v1.0/powershell.exe");
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
    return { executable, arguments: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", `& ${quote(process.execPath)} ${quote(fixture)}`] };
  }
  const executable = process.env.SHELL ?? "/bin/sh";
  return { executable, arguments: ["-c", `exec "${process.execPath}" "${fixture}"`] };
}

function expectStableParity(direct: NormalizedFrame, hosted: NormalizedFrame): void {
  expect(hosted.lines.map(line => line.trimEnd())).toEqual(direct.lines.map(line => line.trimEnd()));
  expect(hosted.cells).toEqual(direct.cells);
  expect(hosted.cursor).toEqual(direct.cursor);
  expect(hosted.activeScreen).toBe(direct.activeScreen);
  // The AddOne host deliberately owns focus/paste capture, so physical outer
  // mode bits may differ while child virtual state and observable cells match.
  expect(hosted.modes.mouseTracking).toBe(direct.modes.mouseTracking);
}
