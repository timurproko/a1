import { mkdir, readFile, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SupervisorClient } from "../../src/protocol/client.js";
import { resolveAddOnePaths } from "../../src/supervisor/paths.js";
import { preserveFailure } from "../../src/test-harness/artifacts.js";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { OuterPtyRunner, type NormalizedFrame } from "../../src/test-harness/pty-runner.js";
import { WALKING_SKELETON_SCENARIO } from "../../src/test-harness/scenario.js";
import type { OrderedEvent } from "../../src/domain/index.js";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const cli = resolve(repository, "bin/addone.js");
const preludeLauncherSource = await readFile(resolve(repository, "dist/src/test-harness/fixtures/prelude-launcher.js"), "utf8");
const preludeLauncher = resolve(repository, "artifacts/runtime-fixtures/prelude-launcher.mjs");
await mkdir(resolve(repository, "artifacts/runtime-fixtures"), { recursive: true });
await writeFile(preludeLauncher, preludeLauncherSource);

describe("release-gating Native Pi fullscreen parity", () => {
  it("matches direct fixture rendering and gives the supervised fullscreen PTY complete input control", async () => {
    const directContext = await createScenarioContext(`${WALKING_SKELETON_SCENARIO.id}-direct`);
    const context = await createScenarioContext(WALKING_SKELETON_SCENARIO.id);
    context.environment.ADDONE_NATIVE_PI_ARGUMENTS = JSON.stringify(["--tui-mode", "fullscreen"]);
    const assertions: { name: string; passed: boolean; detail?: string }[] = [];
    const events: OrderedEvent[] = [];
    const runners: OuterPtyRunner[] = [];
    let observer: SupervisorClient | null = null;
    const direct = new OuterPtyRunner(directContext, 90, 28);
    try {
      direct.launch(platform() === "win32" ? resolve(directContext.fixtureBin, "pi.cmd") : resolve(directContext.fixtureBin, "pi"), ["--tui-mode", "fullscreen"]);
      const directFrame = await direct.waitFor("READY>", 5_000, "direct-fixture");
      const directNavigation = await exerciseWheelAndHistory(direct);
      direct.keyboard("exit 0\r");
      await direct.waitForExit();

      const first = new OuterPtyRunner(context, 90, 28);
      runners.push(first);
      first.launch(process.execPath, [cli]);
      const nested = await first.waitFor("READY>", 15_000, "automatic-fullscreen");
      expect(first.rawLog).not.toContain("ADDONE");
      expect(nested.lines.join("\n")).not.toContain("[ + ]");
      expect(nested.lines.join("\n")).not.toContain("Native Pi 1");
      expect(nested.modes.mouseTracking).toBe("any");
      expectParity(directFrame, nested);
      assertions.push({ name: "launch publishes no AddOne intro and hands off directly to the chrome-free Pi surface", passed: true });

      observer = new SupervisorClient();
      await observer.connect(resolveAddOnePaths(context.environment).endpoint);
      observer.on("event", event => events.push(event));

      first.keyboard("hello π\r");
      await first.waitFor("hello π", 5_000, "utf8-input");
      first.keyboard("\x03");
      await first.waitFor("CTRL-C CLEARED", 5_000, "ctrl-c-forwarded");
      first.keyboard("\x1b[200~pasted π\x1b[201~");
      await first.waitFor("pasted π", 5_000, "bracketed-paste");
      first.keyboard("\x1b[I");
      first.mouse(20, 10);
      first.wheel(20, 10, "down");
      await first.waitFor("\\u001b[<65;20;10M", 5_000, "mouse-wheel");
      assertions.push({ name: "UTF-8, Ctrl+C, paste, focus, mouse, and wheel bytes reach Pi", passed: true });

      const wrappedNavigation = await exerciseWheelAndHistory(first);
      expectParity(directNavigation.wheel, wrappedNavigation.wheel);
      expectParity(directNavigation.arrow, wrappedNavigation.arrow);
      assertions.push({ name: "wheel scroll and explicit Up-key history navigation remain distinct", passed: true });

      first.resize(72, 22);
      await first.waitFor("RESIZED:72x22", 5_000, "full-viewport-resize");
      assertions.push({ name: "outer dimensions reach child without chrome subtraction", passed: true });

      first.keyboard("alternate\r");
      await first.waitFor("ALTERNATE SCREEN", 5_000, "alternate-screen");
      await first.waitFor("ALTERNATE RESTORED", 5_000, "alternate-restored");
      first.keyboard("rapid\r");
      await first.waitFor("RAPID:3", 5_000, "rapid-coalesced");
      first.keyboard("synchronized\r");
      await first.waitFor("SYNC:COMMITTED", 5_000, "synchronized-committed");
      expect(first.rawLog).not.toContain("SYNC:PARTIAL");
      await new Promise(resolve => setTimeout(resolve, 50));
      const beforeCrossTurnFrames = countHostFrames(await readFile(context.uiLog, "utf8"));
      first.keyboard("cross-turn-frame\r");
      await first.waitFor("CROSS-TURN:COMMITTED", 5_000, "cross-turn-frame");
      await new Promise(resolve => setTimeout(resolve, 50));
      const afterCrossTurnFrames = countHostFrames(await readFile(context.uiLog, "utf8"));
      expect(afterCrossTurnFrames - beforeCrossTurnFrames).toBe(1);
      assertions.push({ name: "next-I/O-turn cursor epilogue remains in one committed host frame", passed: true });
      first.keyboard("queries\r");
      await first.waitFor("QUERY-RESPONSE:", 5_000, "terminal-query-responses");
      await new Promise(resolve => setTimeout(resolve, 100));
      const idleLength = first.rawLog.length;
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(first.rawLog.length).toBe(idleLength);
      assertions.push({ name: "alternate screen restores and idle terminal is not periodically repainted", passed: true });

      await first.stopUi();
      const second = new OuterPtyRunner(context, 72, 22);
      runners.push(second);
      second.launch(process.execPath, [cli]);
      const restored = await second.waitFor("HISTORY VIEW", 8_000, "resident-snapshot");
      expect(restored.lines.join("\n")).not.toContain("[ + ]");
      second.keyboard("after reconnect\r");
      await second.waitFor("after reconnect", 5_000, "stream-after-snapshot");
      assertions.push({ name: "reconnect paints styled resident snapshot and continues the ordered stream", passed: true });

      second.keyboard("exit 7\r");
      const outcome = await second.waitForExit();
      expect(outcome.exitCode).toBe(7);
      assertions.push({ name: "child exit flushes output and becomes foreground UI outcome", passed: true });

      const [childLog, uiLog] = await Promise.all([
        readFile(context.childLog, "utf8"),
        readFile(context.uiLog, "utf8"),
      ]);
      expectSequenceIntegrity(uiLog);
      expect((childLog.match(/paint size=/g) ?? []).length).toBe(1);
      expect(childLog).toContain("resize=72x22");
      expect(childLog).toContain("inputHex=03");
      expect(childLog).toContain("1b5b3c36353b32303b31304d");
      assertions.push({ name: "UI restart retained one child and byte-level evidence", passed: true });
    } catch (error) {
      await preserveFailure(context, {
        scenario: WALKING_SKELETON_SCENARIO,
        frames: [...direct.frames, ...runners.flatMap(runner => runner.frames)],
        timeline: [...direct.timeline, ...runners.flatMap(runner => runner.timeline)],
        supervisorEvents: events,
        assertions,
        outerLog: `--- DIRECT ---\n${direct.rawLog}\n--- ADDONE ---\n${runners.map(runner => runner.rawLog).join("\n--- UI RESTART ---\n")}`,
      }, error);
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${context.artifacts}`, { cause: error });
    } finally {
      observer?.close();
      await direct.cleanup();
      await runners.at(-1)?.cleanup();
    }
  }, 30_000);

  it("restores pre-launch terminal content after the simulated repeated Ctrl+C quit flow", async () => {
    const directContext = await createScenarioContext("CTRL-C-RESTORE-direct");
    const wrappedContext = await createScenarioContext("CTRL-C-RESTORE-wrapped");
    wrappedContext.environment.ADDONE_NATIVE_PI_ARGUMENTS = JSON.stringify(["--tui-mode", "fullscreen"]);
    directContext.environment.ADDONE_POST_EXIT_SHELL_PROBE = "1";
    wrappedContext.environment.ADDONE_POST_EXIT_SHELL_PROBE = "1";
    const direct = new OuterPtyRunner(directContext, 90, 28);
    const wrapped = new OuterPtyRunner(wrappedContext, 90, 28);
    const marker = "PRE-LAUNCH TERMINAL CONTENT";
    try {
      const directCommand = platform() === "win32" ? resolve(directContext.fixtureBin, "pi.cmd") : resolve(directContext.fixtureBin, "pi");
      direct.launch(process.execPath, [preludeLauncher, marker, directCommand, "--tui-mode", "fullscreen"]);
      await direct.waitFor("READY>", 5_000, "direct-ctrl-c-ready");
      direct.keyboard("\x03");
      await direct.waitFor("CTRL-C CLEARED", 5_000, "direct-ctrl-c-cleared");
      direct.keyboard("\x03");
      const directRestored = await direct.waitFor(marker, 2_000, "direct-pre-launch-restored");
      const directShell = await exerciseParentShell(direct);
      await direct.waitForExit();

      wrapped.launch(process.execPath, [preludeLauncher, marker, process.execPath, cli]);
      await wrapped.waitFor("READY>", 15_000, "wrapped-ctrl-c-ready");
      wrapped.keyboard("\x03");
      await wrapped.waitFor("CTRL-C CLEARED", 5_000, "wrapped-ctrl-c-cleared");
      wrapped.keyboard("\x03");
      const wrappedRestored = await wrapped.waitFor(marker, 2_000, "wrapped-pre-launch-restored");
      const wrappedShell = await exerciseParentShell(wrapped);
      await wrapped.waitForExit();

      expect(directRestored.activeScreen).toBe("normal");
      expect(wrappedRestored.activeScreen).toBe("normal");
      expect(directRestored.lines.join("\n")).toContain(marker);
      expect(wrappedRestored.lines.join("\n")).toContain(marker);
      expect(wrappedRestored.lines.map(line => line.trimEnd())).toEqual(directRestored.lines.map(line => line.trimEnd()));
      expect(wrappedRestored.lines.join("\n")).not.toMatch(/>;\d+(?:;\d+){3,}/);
      expect(directShell.lines.join("\n")).toContain("PARENT-SHELL-EXEC:\"echo PARENT-SHELL-PROBE-OK\"");
      expect(wrappedShell.lines.join("\n")).toContain("PARENT-SHELL-EXEC:\"echo PARENT-SHELL-PROBE-OK\"");
    } finally {
      await direct.cleanup();
      await wrapped.cleanup();
    }
  }, 30_000);

  it("restores the host and parent line editor when the child crashes with virtual modes active", async () => {
    const context = await createScenarioContext("CRASH-RESTORE-wrapped");
    context.environment.ADDONE_NATIVE_PI_ARGUMENTS = JSON.stringify(["--tui-mode", "fullscreen"]);
    context.environment.ADDONE_POST_EXIT_SHELL_PROBE = "1";
    const runner = new OuterPtyRunner(context, 90, 28);
    const marker = "CRASH PRE-LAUNCH TERMINAL CONTENT";
    try {
      runner.launch(process.execPath, [preludeLauncher, marker, process.execPath, cli]);
      await runner.waitFor("READY>", 15_000, "crash-ready");
      runner.keyboard("crash\r");
      await runner.waitFor(marker, 5_000, "crash-pre-launch-restored");
      const shell = await exerciseParentShell(runner);
      expect(shell.lines.join("\n")).not.toMatch(/>;\d+(?:;\d+){3,}/);
      expect((await runner.waitForExit()).exitCode).toBe(9);
    } finally {
      await runner.cleanup();
    }
  }, 30_000);

  it("keeps vanilla selection attached to scrolling content and exposes normal host scrollback without repaint flicker", async () => {
    const directContext = await createScenarioContext("VANILLA-SCROLL-SELECTION-direct");
    const wrappedContext = await createScenarioContext("VANILLA-SCROLL-SELECTION-wrapped");
    directContext.environment.ADDONE_FIXTURE_VANILLA = "1";
    wrappedContext.environment.ADDONE_FIXTURE_VANILLA = "1";
    directContext.environment.ADDONE_POST_EXIT_SHELL_PROBE = "1";
    wrappedContext.environment.ADDONE_POST_EXIT_SHELL_PROBE = "1";
    wrappedContext.environment.ADDONE_NATIVE_PI_ARGUMENTS = "[]";
    const direct = new OuterPtyRunner(directContext, 90, 16);
    const wrapped = new OuterPtyRunner(wrappedContext, 90, 16);
    try {
      const fixture = platform() === "win32" ? resolve(directContext.fixtureBin, "pi.cmd") : resolve(directContext.fixtureBin, "pi");
      direct.launch(process.execPath, [preludeLauncher, "CLOSURE PRELUDE", fixture]);
      await direct.waitFor("READY>", 5_000, "vanilla-direct-ready");
      direct.keyboard("stream\r");
      const directAnchor = await direct.waitFor("STREAM:2", 5_000, "vanilla-direct-anchor");
      const directAnchorRow = directAnchor.lines.findIndex(line => line.includes("STREAM:1"));
      expect(direct.selectHostText(directAnchorRow)).toBe(true);
      const directSelectedAt = direct.hostSelectionRow();
      const directFinal = await direct.waitFor("STREAM:DONE", 8_000, "vanilla-direct-streamed");
      const directSelectedAfter = direct.hostSelectionRow();

      wrapped.launch(process.execPath, [preludeLauncher, "CLOSURE PRELUDE", process.execPath, cli]);
      await wrapped.waitFor("READY>", 15_000, "vanilla-wrapped-ready");
      const wrappedHandoffOutput = wrapped.rawLog.slice(wrapped.rawLog.indexOf("CLOSURE PRELUDE") + "CLOSURE PRELUDE".length);
      expect(wrappedHandoffOutput).not.toContain("\x1b[2J");
      expect(wrapped.rawLog.indexOf("CLOSURE PRELUDE")).toBeLessThan(wrapped.rawLog.indexOf("PI FIXTURE"));
      const wrappedOutputBeforeStream = wrapped.rawLog.length;
      wrapped.keyboard("stream\r");
      const wrappedAnchor = await wrapped.waitFor("STREAM:2", 5_000, "vanilla-wrapped-anchor");
      const wrappedAnchorRow = wrappedAnchor.lines.findIndex(line => line.includes("STREAM:1"));
      expect(wrapped.selectHostText(wrappedAnchorRow)).toBe(true);
      const wrappedSelectedAt = wrapped.hostSelectionRow();
      const wrappedFinal = await wrapped.waitFor("STREAM:DONE", 8_000, "vanilla-wrapped-streamed");
      const wrappedSelectedAfter = wrapped.hostSelectionRow();
      const wrappedStreamOutput = wrapped.rawLog.slice(wrappedOutputBeforeStream);

      expect(directFinal.activeScreen).toBe("normal");
      expect(wrappedFinal.activeScreen).toBe("normal");
      expect(directFinal.scrollbackLines).toBeGreaterThan(0);
      expect(wrappedFinal.scrollbackLines).toBeGreaterThan(0);
      expect(directSelectedAt).not.toBeNull();
      expect(wrappedSelectedAt).not.toBeNull();
      expect(directSelectedAfter).toBeLessThan(directSelectedAt as number);
      expect(wrappedSelectedAfter).toBeLessThan(wrappedSelectedAt as number);
      expect(wrappedStreamOutput).not.toContain("\x1b[2J");
      expect(wrappedStreamOutput).not.toContain("Copied!");

      direct.keyboard("stable-stream\r");
      wrapped.keyboard("stable-stream\r");
      const [directStable, wrappedStable] = await Promise.all([
        direct.waitFor("STATUS:DONE", 8_000, "vanilla-direct-stable-stream"),
        wrapped.waitFor("STATUS:DONE", 8_000, "vanilla-wrapped-stable-stream"),
      ]);
      expect(directStable.lines.join("\n")).toContain("STATUS:DONE");
      expect(wrappedStable.lines.join("\n")).toContain("STATUS:DONE");
      expectAtomicHostTransactions(await readFile(wrappedContext.uiLog, "utf8"));

      direct.keyboard("closure-exit\r");
      wrapped.keyboard("closure-exit\r");
      const [directClosure, wrappedClosure] = await Promise.all([
        direct.waitFor("PARENT-SHELL>", 5_000, "direct-closure-layout"),
        wrapped.waitFor("PARENT-SHELL>", 5_000, "wrapped-closure-layout"),
      ]);
      expect(closureSpacing(directClosure)).toEqual({ beforeResume: 1, afterResume: 1 });
      expect(closureSpacing(wrappedClosure)).toEqual(closureSpacing(directClosure));
      const [directShell, wrappedShell] = await Promise.all([exerciseParentShell(direct), exerciseParentShell(wrapped)]);
      expect(wrappedShell.lines.map(line => line.trimEnd())).toEqual(directShell.lines.map(line => line.trimEnd()));
      await direct.waitForExit();
      await wrapped.waitForExit();
    } finally {
      await direct.cleanup();
      await wrapped.cleanup();
    }
  }, 30_000);
});

function closureSpacing(frame: NormalizedFrame): { beforeResume: number; afterResume: number } {
  const lines = frame.lines.map(line => line.trimEnd());
  const resume = lines.findIndex(line => line.includes("To resume this session:"));
  const prompt = lines.findIndex((line, index) => index > resume && line.includes("PARENT-SHELL>"));
  if (resume < 0 || prompt < 0) throw new Error(`closure markers missing:\n${lines.join("\n")}`);
  let prior = resume - 1;
  while (prior >= 0 && lines[prior] === "") prior--;
  return { beforeResume: resume - prior - 1, afterResume: prompt - resume - 1 };
}

async function exerciseParentShell(runner: OuterPtyRunner): Promise<NormalizedFrame> {
  await runner.waitFor("PARENT-SHELL>", 5_000, "parent-shell-ready");
  runner.keyboard("echo PARENT-SHELL-PROBE!x\x1b[D\x7f\x1b[3~-OK\x1b[D\x1b[C\r");
  return await runner.waitFor("PARENT-SHELL-EXEC:\"echo PARENT-SHELL-PROBE-OK\"", 5_000, "parent-shell-functional");
}

async function exerciseWheelAndHistory(runner: OuterPtyRunner): Promise<{ wheel: NormalizedFrame; arrow: NormalizedFrame }> {
  runner.keyboard("history\r");
  const bottom = await runner.waitFor("HISTORY VIEW:bottom", 5_000, "history-bottom");
  expect(bottom.modes.mouseTracking).not.toBe("none");
  runner.wheel(20, 10, "up");
  await runner.waitFor("HISTORY VIEW:older", 5_000, "history-wheel");
  const wheel = runner.capture("history-wheel-stable");
  expect(wheel.lines.join("\n")).toContain("EDITOR:");
  expect(wheel.lines.join("\n")).not.toContain("EDITOR:previous message");
  runner.arrow("up");
  await runner.waitFor("EDITOR:previous message", 5_000, "history-arrow");
  return { wheel, arrow: runner.capture("history-arrow-stable") };
}

function countHostFrames(log: string): number {
  return [...log.matchAll(/host-frame revision=/g)].length;
}

function expectAtomicHostTransactions(log: string): void {
  const scrollingFrames = [...log.matchAll(/host-frame revision=(\d+) spans=(\d+) scrollRows=([1-9]\d*) synchronized=true/g)];
  expect(scrollingFrames.length).toBeGreaterThan(0);
  expect(scrollingFrames.some(match => Number(match[2]) > 0)).toBe(true);
}

function expectSequenceIntegrity(log: string): void {
  for (const match of log.matchAll(/event revision=(\d+) expected=(\d+)/g)) expect(match[1]).toBe(match[2]);
  for (const match of log.matchAll(/output sequence=(\d+) expected=(\d+)/g)) expect(match[1]).toBe(match[2]);
  expect(log).not.toContain("slow client exceeded");
}

function expectParity(direct: NormalizedFrame, wrapped: NormalizedFrame): void {
  expect(wrapped.lines.slice(0, 4).map(line => line.trimEnd())).toEqual(direct.lines.slice(0, 4).map(line => line.trimEnd()));
  expect(wrapped.cells.slice(0, 3)).toEqual(direct.cells.slice(0, 3));
  expect(wrapped.cursor).toEqual(direct.cursor);
  expect(wrapped.activeScreen).toBe(direct.activeScreen);
}
