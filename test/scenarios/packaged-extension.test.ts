import { access, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { preserveFailure } from "../../src/test-harness/artifacts.js";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { preparePackagedCandidate } from "../../src/test-harness/packaged-candidate.js";
import { OuterPtyRunner, type NormalizedFrame } from "../../src/test-harness/pty-runner.js";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const preludeLauncherSource = await readFile(resolve(repository, "dist/src/test-harness/fixtures/prelude-launcher.js"), "utf8");
const preludeLauncher = resolve(repository, "artifacts/runtime-fixtures/prelude-launcher.mjs");
await mkdir(resolve(repository, "artifacts/runtime-fixtures"), { recursive: true });
await writeFile(preludeLauncher, preludeLauncherSource);

describe("release-gating representative Native Pi extension parity", () => {
  it("preserves a public custom component, editor, theme, overlay, mouse action, and graceful shutdown", async () => {
    const context = await createScenarioContext("packaged-extension");
    const candidate = await preparePackagedCandidate({
      packageRoot: repository,
      piExecutable: await findPiExecutable(),
      artifacts: context.artifacts,
      environment: context.environment,
    });
    const extension = await realpath(resolve(candidate.packageRoot, "dist/src/test-harness/fixtures/pi/baseline-extension.js"));
    const piArguments = ["--tui-mode", "fullscreen", ...candidate.pi.arguments, "--extension", extension];
    Object.assign(context.environment, candidate.environment, {
      ADDONE_NATIVE_PI_READINESS_MS: "15_000",
      ADDONE_NATIVE_PI_ARGUMENTS: JSON.stringify(piArguments),
      ADDONE_POST_EXIT_SHELL_PROBE: "1",
    });
    const recorder = resolve(candidate.packageRoot, "dist/src/test-harness/fixtures/terminal-write-recorder.js");
    context.environment.NODE_OPTIONS = [context.environment.NODE_OPTIONS, `--import=${pathToFileURL(recorder).href}`].filter(Boolean).join(" ");
    delete context.environment.NO_COLOR;

    const direct = new OuterPtyRunner(context, 90, 28);
    const wrapped = new OuterPtyRunner(context, 90, 28);
    try {
      const marker = "PACKAGED EXTENSION PRE-LAUNCH CONTENT";
      direct.launch(process.execPath, [preludeLauncher, marker, candidate.pi.executable, ...piArguments]);
      const directFrame = await exerciseExtension(direct);
      const directShell = await exerciseParentShell(direct);
      expect((await direct.waitForExit(8_000)).exitCode).toBe(0);

      wrapped.launch(process.execPath, [preludeLauncher, marker, process.execPath, candidate.cli]);
      const wrappedFrame = await exerciseExtension(wrapped);
      const wrappedShell = await exerciseParentShell(wrapped);
      expect((await wrapped.waitForExit(8_000)).exitCode).toBe(0);

      expectParity(directFrame, wrappedFrame);
      expect(directFrame.lines.join("\n")).toContain("EXTENSION CUSTOM COMPONENT");
      expect(directFrame.lines.join("\n")).toContain("EXTENSION INPUT");
      expect(wrappedFrame.lines.join("\n")).toContain("EXTENSION CUSTOM COMPONENT");
      expect(wrappedFrame.lines.join("\n")).toContain("EXTENSION INPUT");
      expect(direct.normalBufferText()).toContain(marker);
      expect(wrapped.normalBufferText()).toContain(marker);
      expect(directShell.lines.join("\n")).toContain("PARENT-SHELL-EXEC");
      expect(wrappedShell.lines.join("\n")).toContain("PARENT-SHELL-EXEC");
    } catch (error) {
      await preserveFailure(context, {
        scenario: { id: "PACKAGED-EXTENSION-001", extension, pi: candidate.pi },
        frames: [...direct.frames, ...wrapped.frames],
        timeline: [...direct.timeline, ...wrapped.timeline],
        supervisorEvents: [],
        assertions: [],
        outerLog: `--- DIRECT ---\n${direct.rawLog}\n--- ADDONE ---\n${wrapped.rawLog}`,
      }, error);
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${context.artifacts}`, { cause: error });
    } finally {
      await direct.cleanup();
      await wrapped.cleanup();
    }
  }, 120_000);
});

async function exerciseExtension(runner: OuterPtyRunner): Promise<NormalizedFrame> {
  await runner.waitFor("escape interrupt", 30_000, "extension-pi-ready");
  runner.paste("/baseline");
  runner.keyboard("\r");
  await runner.waitFor("EXTENSION OVERLAY", 8_000, "extension-overlay");
  runner.keyboard("\r");
  await runner.waitFor("EXTENSION-RESULT:ENTER", 8_000, "extension-result");
  runner.keyboard("\x15EXTENSION INPUT");
  await runner.waitFor("EXTENSION INPUT", 5_000, "extension-editor-input");
  runner.mouse(20, 12, 0, false);
  runner.mouse(20, 12, 0, true);
  const frame = await stableFrame(runner, "extension-component-theme-editor-mouse");
  runner.keyboard("\x15");
  runner.paste("/quit");
  runner.keyboard("\r");
  return frame;
}

async function exerciseParentShell(runner: OuterPtyRunner): Promise<NormalizedFrame> {
  await runner.waitFor("PARENT-SHELL>", 8_000, "extension-parent-shell");
  runner.keyboard("echo EXTENSION-SHELL-OK\r");
  return await runner.waitFor("PARENT-SHELL-EXEC:\"echo EXTENSION-SHELL-OK\"", 5_000, "extension-shell-functional");
}

async function stableFrame(runner: OuterPtyRunner, name: string): Promise<NormalizedFrame> {
  await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  return runner.capture(name);
}

function expectParity(direct: NormalizedFrame, wrapped: NormalizedFrame): void {
  expect(wrapped.lines.map(line => line.trimEnd())).toEqual(direct.lines.map(line => line.trimEnd()));
  expect(wrapped.cursor.visible).toBe(direct.cursor.visible);
  expect(wrapped.activeScreen).toBe(direct.activeScreen);
  expect(wrapped.modes).toEqual(direct.modes);
}

async function findPiExecutable(): Promise<string> {
  if (process.env.ADDONE_REAL_PI_EXECUTABLE) {
    await access(process.env.ADDONE_REAL_PI_EXECUTABLE);
    return process.env.ADDONE_REAL_PI_EXECUTABLE;
  }
  const names = process.platform === "win32" ? ["pi.cmd", "pi.exe", "pi"] : ["pi"];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    for (const name of names) {
      const candidate = resolve(directory, name);
      if (await access(candidate).then(() => true).catch(() => false)) return candidate;
    }
  }
  throw new Error("release gate requires ADDONE_REAL_PI_EXECUTABLE pointing to an exactly installed Pi runtime");
}
