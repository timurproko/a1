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

describe("release-gating packaged real Pi parity", () => {
  it("proves editor readiness, wheel/history separation, and repeated-Ctrl+C cleanup through immutable packaged content", async () => {
    const context = await createScenarioContext("packaged-real-pi");
    const piExecutable = await findPiExecutable();
    const candidate = await preparePackagedCandidate({ packageRoot: repository, piExecutable, artifacts: context.artifacts, environment: context.environment });
    Object.assign(context.environment, candidate.environment, {
      ADDONE_POST_EXIT_SHELL_PROBE: "1",
    });
    delete context.environment.ADDONE_NATIVE_PI_READINESS_MS;
    const recorder = resolve(candidate.packageRoot, "dist/src/test-harness/fixtures/terminal-write-recorder.js");
    context.environment.NODE_OPTIONS = [context.environment.NODE_OPTIONS, `--import=${pathToFileURL(recorder).href}`].filter(Boolean).join(" ");
    delete context.environment.NO_COLOR;

    const direct = new OuterPtyRunner(context, 90, 28);
    const wrapped = new OuterPtyRunner(context, 90, 28);
    const assertions: { name: string; passed: boolean; detail?: string }[] = [];
    try {
      const preLaunchMarker = "PACKAGED REAL-PI PRE-LAUNCH CONTENT";
      direct.launch(process.execPath, [preludeLauncher, preLaunchMarker, candidate.pi.executable, ...candidate.pi.arguments]);
      await direct.waitFor("escape interrupt", 15_000, "direct-ready-visible");
      const directReady = await stableFrame(direct, "direct-ready");
      assertRecognizablePi(directReady);
      const directTyped = await typeEditorOpenSettingsAndNavigate(direct);
      const directShell = await exerciseParentShell(direct);
      const directExit = await direct.waitForExit(8_000);
      expect(directExit.exitCode).toBe(0);

      await writeFile(context.terminalSizePath, JSON.stringify({ columns: 90, rows: 28 }));
      wrapped.launch(process.execPath, [preludeLauncher, preLaunchMarker, process.execPath, candidate.cli]);
      await wrapped.waitFor("escape interrupt", 30_000, "wrapped-ready-visible");
      const wrappedHandoffOutput = wrapped.rawLog.slice(wrapped.rawLog.indexOf(preLaunchMarker) + preLaunchMarker.length);
      expect(wrappedHandoffOutput).not.toContain("\x1b[2J");
      const wrappedReady = await stableFrame(wrapped, "wrapped-ready");
      assertRecognizablePi(wrappedReady);
      expectCheckpointParity(directReady, wrappedReady);
      expectNoDuplicatePiStatusRows(directReady);
      expectNoDuplicatePiStatusRows(wrappedReady);
      assertions.push({ name: "direct and packaged AddOne reach recognizable Pi readiness with one status/footer pair", passed: true });

      const wrappedTyped = await typeEditorOpenSettingsAndNavigate(wrapped);
      const wrappedShell = await exerciseParentShell(wrapped);
      const wrappedExit = await wrapped.waitForExit(8_000);
      expect(wrappedExit.exitCode).toBe(0);
      const wrappedNormalBuffer = wrapped.normalBufferText();
      expect(wrappedNormalBuffer).not.toMatch(/>;\d+(?:;\d+){3,}/);
      expect(directShell.lines.join("\n")).toContain("PARENT-SHELL-EXEC:\"echo PARENT-SHELL-PROBE-OK\"");
      expect(wrappedShell.lines.join("\n")).toContain("PARENT-SHELL-EXEC:\"echo PARENT-SHELL-PROBE-OK\"");
      expect(wrappedShell.cursor.style).toBe(directShell.cursor.style);
      expect(wrappedShell.cursor.style).toBe("default");
      assertions.push({ name: "repeated Ctrl+C restores a functional parent line editor", passed: true });

      expectCheckpointParity(directTyped.typed, wrappedTyped.typed);
      expectCheckpointParity(directTyped.pasted, wrappedTyped.pasted);
      expectCheckpointParity(directTyped.settings, wrappedTyped.settings);
      expect(directTyped.mouseTracking).toBe("none");
      expect(wrappedTyped.mouseTracking).toBe("none");
      expect(directTyped.hostSelection).toBe(true);
      expect(wrappedTyped.hostSelection).toBe(true);
      expect(directTyped.selectionCtrlC.lines.join("\n")).toContain("release parity");
      expect(wrappedTyped.selectionCtrlC.lines.join("\n")).toContain("release parity");
      expect(direct.rawLog).not.toContain("Copied!");
      expect(wrapped.rawLog).not.toContain("Copied!");
      expect(directTyped.wheelRows).toBe(3);
      expect(wrappedTyped.wheelRows).toBe(3);
      expect(directTyped.scrollbackLines).toBeGreaterThan(0);
      expect(wrappedTyped.scrollbackLines).toBeGreaterThan(0);
      const wrappedUiLog = await readFile(context.uiLog, "utf8");
      const scrollDamage = [...wrappedUiLog.matchAll(/spans=(\d+) scrollRows=([1-9]\d*)/g)];
      expect(scrollDamage.length).toBeGreaterThan(0);
      expect(scrollDamage.some(match => Number(match[1]) <= Number(match[2]) + 1)).toBe(true);
      expectAtomicHostScrollTransactions(wrappedUiLog);
      assertions.push({ name: "Pi content, footer, status, and cursor updates are committed as atomic host frames", passed: true });
      // Hosted input retains the accepted flicker-free transport contract: up
      // to 32 ms adaptive quiescence, one public xterm parse turn, and ordered
      // supervisor/host serialization. Compare against direct Pi with that
      // measured overhead while retaining an absolute interactive ceiling.
      const hostedInputLatencyLimitMs = Math.max(100, directTyped.inputLatencyMs + 60);
      expect(wrappedTyped.inputLatencyMs).toBeLessThanOrEqual(hostedInputLatencyLimitMs);
      expect(directTyped.wheel.viewportOffset - directTyped.beforeWheel.viewportOffset).toBe(3);
      expect(wrappedTyped.wheel.viewportOffset - wrappedTyped.beforeWheel.viewportOffset).toBe(3);
      expect(directTyped.arrow.lines.join("\n")).toContain("ADDONE_HISTORY_PROBE");
      expect(wrappedTyped.arrow.lines.join("\n")).toContain("ADDONE_HISTORY_PROBE");
      assertions.push({ name: "vanilla selection, selection-aware Ctrl+C, rapid input, three-row wheel scrolling, and explicit arrow history remain equivalent", passed: true });

      const endpoint = JSON.parse(await readFile(resolve(context.runtimeDir, "supervisor.json"), "utf8")) as { releaseId: string; releaseRoot: string; pid: number };
      expect((await realpath(endpoint.releaseRoot)).toLowerCase()).toContain((await realpath(resolve(context.dataDir, "releases"))).toLowerCase());
      expect(endpoint.releaseId).toContain(candidate.packageVersion);
      await writeFile(resolve(context.artifacts, "process-release-inventory.json"), JSON.stringify({
        bootstrap: { path: candidate.cli, packageRoot: candidate.packageRoot },
        supervisor: endpoint,
        nativePi: candidate.pi,
      }, null, 2));
      await writeFile(resolve(context.artifacts, "verdict.json"), JSON.stringify({
        scenario: "PACKAGED-REAL-PI-001",
        passed: true,
        assertions,
        candidate: { version: candidate.packageVersion, digest: candidate.packageContentDigest },
        pi: candidate.pi,
      }, null, 2));
    } catch (error) {
      const evidence = {
        scenario: { id: "PACKAGED-REAL-PI-001", purpose: "physical wheel, child-protocol isolation, repeated Ctrl+C, and functional parent-shell restoration" },
        frames: [...direct.frames, ...wrapped.frames],
        timeline: [...direct.timeline, ...wrapped.timeline],
        supervisorEvents: [],
        assertions,
        outerLog: `--- DIRECT ---\n${direct.rawLog}\n--- ADDONE ---\n${wrapped.rawLog}`,
        processInventory: [{ pi: candidate.pi, packageRoot: candidate.packageRoot, cli: candidate.cli }],
      };
      await preserveFailure(context, evidence, error);
      await writeFile(resolve(context.artifacts, "verdict.json"), JSON.stringify({
        scenario: "PACKAGED-REAL-PI-001",
        passed: false,
        assertions,
        error: error instanceof Error ? error.message : String(error),
        evidence: ["terminal-protocol.jsonl", "host-console-modes.jsonl", "input-timeline.json", "frames.json", "outer.log", "ui.log", "supervisor-events.json", "process-inventory.json", "platform.json"],
      }, null, 2));
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${context.artifacts}`, { cause: error });
    } finally {
      await direct.cleanup();
      await wrapped.cleanup();
    }
  }, 120_000);

});

async function typeEditorOpenSettingsAndNavigate(runner: OuterPtyRunner): Promise<{ typed: NormalizedFrame; selectionCtrlC: NormalizedFrame; pasted: NormalizedFrame; settings: NormalizedFrame; beforeWheel: NormalizedFrame; wheel: NormalizedFrame; arrow: NormalizedFrame; mouseTracking: string; hostSelection: boolean; inputLatencyMs: number; wheelRows: number; scrollbackLines: number }> {
  const inputLatencyMs = await measureMedianEditorLatency(runner);
  runner.keyboard("release parity");
  await runner.waitFor("release parity", 5_000, "editor-text-visible", 5);
  const typed = await stableFrame(runner, "editor-text");
  const hostSelection = runner.selectHostText();
  runner.keyboard("\x03");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 50));
  const selectionCtrlC = runner.capture("selection-cleared-by-host-ctrl-c");
  runner.paste(" + pasted π");
  runner.focus(false);
  runner.focus(true);
  await runner.waitFor("release parity + pasted π", 5_000, "paste-visible");
  const pasted = await stableFrame(runner, "editor-paste");
  runner.keyboard("\x15");
  runner.keyboard("/settings\r");
  await runner.waitFor("Auto-compact", 5_000, "native-settings-visible");
  const settings = await stableFrame(runner, "native-settings");
  runner.keyboard("\x1b");
  await runner.waitFor("0.0%", 5_000, "editor-restored");
  const historyProbe = "!!echo ADDONE_HISTORY_PROBE";
  runner.keyboard(`${historyProbe}\r`);
  await runner.waitFor("ADDONE_HISTORY_PROBE", 5_000, "history-probe-executed");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 300));
  runner.resize(90, 12);
  await new Promise(resolvePromise => setTimeout(resolvePromise, 200));
  const beforeWheel = runner.capture("before-physical-wheel");
  expectNoDuplicatePiStatusRows(beforeWheel);
  const wheelAction = runner.wheel(20, 3, "up");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 200));
  const wheel = runner.capture("transcript-wheel");
  runner.wheel(20, 3, "down");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 200));
  const returnedToEditor = runner.capture("returned-to-editor-after-wheel");
  const historyOccurrences = occurrences(returnedToEditor.lines.join("\n"), historyProbe);
  runner.arrow("up");
  const arrow = await waitForOccurrences(runner, historyProbe, historyOccurrences + 1, 5_000, "editor-history-up");
  runner.keyboard("\x15");
  runner.keyboard("\x03");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 50));
  runner.keyboard("\x03");
  return { typed, selectionCtrlC, pasted, settings, beforeWheel, wheel, arrow, mouseTracking: beforeWheel.modes.mouseTracking, hostSelection, inputLatencyMs, wheelRows: wheelAction.rows, scrollbackLines: beforeWheel.scrollbackLines };
}

function expectAtomicHostScrollTransactions(log: string): void {
  const scrollingFrames = [...log.matchAll(/host-frame revision=(\d+) spans=(\d+) scrollRows=([1-9]\d*) synchronized=true/g)];
  expect(scrollingFrames.length).toBeGreaterThan(0);
  expect(scrollingFrames.some(match => Number(match[2]) > 0)).toBe(true);
}

async function measureMedianEditorLatency(runner: OuterPtyRunner): Promise<number> {
  const latencies: number[] = [];
  let visible = "";
  for (const character of "zxqvkj") {
    visible += character;
    latencies.push(await runner.measureKeyboardVisibility(character, visible));
    runner.capture("editor-latency-probe");
  }
  runner.keyboard("\x15");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 50));
  latencies.sort((left, right) => left - right);
  return latencies[Math.floor(latencies.length / 2)] ?? Number.POSITIVE_INFINITY;
}

async function exerciseParentShell(runner: OuterPtyRunner): Promise<NormalizedFrame> {
  await runner.waitFor("PARENT-SHELL>", 5_000, "parent-shell-ready");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  runner.keyboard("echo PARENT-SHELL-PROBE!x\x1b[D\x7f\x1b[3~-OK\x1b[D\x1b[C\r");
  return await runner.waitFor("PARENT-SHELL-EXEC:\"echo PARENT-SHELL-PROBE-OK\"", 5_000, "parent-shell-functional");
}

async function waitForOccurrences(runner: OuterPtyRunner, text: string, minimum: number, deadlineMs: number, name: string): Promise<NormalizedFrame> {
  const deadline = performance.now() + deadlineMs;
  while (performance.now() < deadline) {
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
    const frame = runner.capture(name);
    if (occurrences(frame.lines.join("\n"), text) >= minimum) return frame;
    runner.frames.pop();
  }
  throw new Error(`${JSON.stringify(text)} did not appear ${minimum} times before the deadline`);
}

function occurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

async function stableFrame(runner: OuterPtyRunner, name: string): Promise<NormalizedFrame> {
  await new Promise(resolvePromise => setTimeout(resolvePromise, 200));
  return runner.capture(name);
}

function assertRecognizablePi(frame: NormalizedFrame): void {
  const text = frame.lines.join("\n");
  expect(text).toMatch(/pi v\d/i);
  expect(text).toMatch(/escape interrupt/i);
  expect(text).toMatch(/0\.0%|tokens?|model/i);
}
function expectNoDuplicatePiStatusRows(frame: NormalizedFrame): void {
  const lines = frame.lines.map(line => line.trimEnd());
  const statusRows = lines.filter(line => /(?:\$\d+\.\d{3}.*)?\d+\.\d%\/\d+.*(?:gpt-|unknown)/i.test(line));
  expect(statusRows).toHaveLength(1);
  const statusIndex = lines.indexOf(statusRows[0] ?? "");
  const cwd = statusIndex > 0 ? lines[statusIndex - 1] : "";
  if (cwd) expect(lines.filter(line => line === cwd)).toHaveLength(1);
}
function expectCheckpointParity(direct: NormalizedFrame, wrapped: NormalizedFrame): void {
  const directOrigin = direct.lines.findIndex(line => /pi v\d/i.test(line));
  const wrappedOrigin = wrapped.lines.findIndex(line => /pi v\d/i.test(line));
  if (directOrigin >= 0 && wrappedOrigin >= 0) {
    const rows = Math.min(direct.lines.length - directOrigin, wrapped.lines.length - wrappedOrigin);
    expect(wrapped.lines.slice(wrappedOrigin, wrappedOrigin + rows).map(line => line.trimEnd()))
      .toEqual(direct.lines.slice(directOrigin, directOrigin + rows).map(line => line.trimEnd()));
    expect(normalizeInvisibleCellStyles(wrapped.cells.slice(wrappedOrigin, wrappedOrigin + rows)))
      .toEqual(normalizeInvisibleCellStyles(direct.cells.slice(directOrigin, directOrigin + rows)));
  } else {
    expect(wrapped.lines.map(line => line.trimEnd())).toEqual(direct.lines.map(line => line.trimEnd()));
    expect(normalizeInvisibleCellStyles(wrapped.cells)).toEqual(normalizeInvisibleCellStyles(direct.cells));
  }
  expect(wrapped.cursor.visible).toBe(direct.cursor.visible);
  if (direct.cursor.visible || wrapped.cursor.visible) {
    expect(wrapped.cursor.column).toBe(direct.cursor.column);
    expect(wrapped.cursor.row - Math.max(0, wrappedOrigin)).toBe(direct.cursor.row - Math.max(0, directOrigin));
  }
  expect(wrapped.modes).toEqual(direct.modes);
}
function normalizeInvisibleCellStyles(cells: NormalizedFrame["cells"]): unknown {
  return cells.map(row => row.map(cell => cell.character === " " && cell.background.mode === "default"
    ? { ...cell, foreground: { mode: "default", value: -1 } }
    : cell));
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
