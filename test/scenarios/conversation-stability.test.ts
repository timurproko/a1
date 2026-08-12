import Headless from "@xterm/headless";
import { readFile } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { OuterPtyRunner, type OuterOutputChunk } from "../../src/test-harness/pty-runner.js";

const { Terminal } = Headless;
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const cli = resolve(repository, "bin/addone.js");

interface RecordedHostWrite {
  readonly stage?: string;
  readonly role?: string;
  readonly kind?: string;
  readonly synchronized?: boolean;
  readonly dataBase64?: string;
}

interface ReplayedConversation {
  readonly changedFrameCount: number;
  readonly statuses: readonly string[];
  readonly finalLines: readonly string[];
}

describe("50-question conversation repaint stability", () => {
  it("matches direct rendering while keeping transcript, status bar, and input anchored", async () => {
    const directContext = await createScenarioContext("CONVERSATION-50-direct");
    const context = await createScenarioContext("CONVERSATION-50-wrapped");
    for (const environment of [directContext.environment, context.environment]) environment.ADDONE_FIXTURE_VANILLA = "1";
    context.environment.ADDONE_NATIVE_PI_ARGUMENTS = "[]";
    const direct = new OuterPtyRunner(directContext, 90, 28);
    const wrapped = new OuterPtyRunner(context, 90, 28);
    try {
      const fixture = platform() === "win32" ? resolve(directContext.fixtureBin, "pi.cmd") : resolve(directContext.fixtureBin, "pi");
      direct.launch(fixture, []);
      wrapped.launch(process.execPath, [cli]);
      await Promise.all([exerciseFiftyQuestions(direct, 5_000), exerciseFiftyQuestions(wrapped, 15_000)]);

      const [directReplay, wrappedReplay] = await Promise.all([
        replayConversationChunks(direct.outputChunks, "direct"),
        replayConversationChunks(wrapped.outputChunks, "wrapped"),
      ]);
      const wrappedStatuses = collapseAdjacent(wrappedReplay.statuses);
      expect(wrappedStatuses[0]).toBe(" STATUS READY");
      expect(wrappedStatuses.at(-1)).toBe(" STATUS 50 QUESTIONS COMPLETE");
      expect(wrappedStatuses.every(status => /^ STATUS (?:READY|QUESTION \d{2} ACCEPTED|THINKING \d{2} \.\.\.|GENERATING \d{2}|50 QUESTIONS COMPLETE)$/.test(status))).toBe(true);
      expect(wrappedReplay.changedFrameCount).toBeGreaterThanOrEqual(100);
      expect(wrappedReplay.changedFrameCount).toBeLessThanOrEqual(Math.ceil(directReplay.changedFrameCount * 1.2));
      expect(wrappedReplay.finalLines.map(line => line.trimEnd())).toEqual(directReplay.finalLines.map(line => line.trimEnd()));

      const writes = await recordedHostWrites(context.terminalProtocolEvidence);
      const terminal = new Terminal({ cols: 90, rows: 28, scrollback: 1_000, allowProposedApi: true });
      let conversationStarted = false;
      let conversationTransactionCount = 0;
      for (const write of writes) {
        const data = Buffer.from(write.dataBase64 ?? "", "base64").toString("utf8");
        await new Promise<void>(resolveWrite => terminal.write(data, resolveWrite));
        const lines = viewportLines(terminal, 28);
        if (lines.join("\n").includes("SIMULATED CONVERSATION")) conversationStarted = true;
        if (!conversationStarted || write.kind === "lifecycle") continue;
        if (write.kind === "transaction") {
          conversationTransactionCount += 1;
          expect(hasPrintableCellPayload(data), "cursor/mode-only frame exposed before conversation cells").toBe(true);
        }
        expectAnchored(lines);
        expect(data).not.toContain("\x1b[2J");
        if (write.kind === "transaction" || write.kind === "snapshot") {
          expect(data.match(/\x1b\[\?2026h/g) ?? []).toHaveLength(1);
          expect(data.match(/\x1b\[\?2026l/g) ?? []).toHaveLength(1);
        }
      }
      expect(conversationTransactionCount).toBe(201);
    } finally {
      await direct.cleanup();
      await wrapped.cleanup();
    }
  }, 60_000);
});

async function exerciseFiftyQuestions(runner: OuterPtyRunner, readinessMs: number): Promise<void> {
  await runner.waitFor("READY>", readinessMs, "conversation-ready");
  runner.keyboard("conversation-stress\r");
  await runner.waitFor("SIMULATED CONVERSATION", 5_000, "conversation-started");
  for (let turn = 1; turn <= 50; turn++) {
    if (turn > 1) await new Promise(resolve => setTimeout(resolve, 60));
    const label = String(turn).padStart(2, "0");
    runner.keyboard(`Question ${label}: explain repaint stability\r`);
    await runner.waitFor(`ANSWER ${label} COMPLETE`, 5_000, `question-${label}-answer`);
    const expectedStatus = turn === 50 ? "50 QUESTIONS COMPLETE" : "READY";
    const frame = await runner.waitFor(`STATUS ${expectedStatus}`, 5_000, `question-${label}-settled`);
    expectAnchored(frame.lines, expectedStatus);
  }
}

async function replayConversationChunks(chunks: readonly OuterOutputChunk[], path: string): Promise<ReplayedConversation> {
  const terminal = new Terminal({ cols: 90, rows: 28, scrollback: 1_000, allowProposedApi: true });
  let started = false;
  let previous = "";
  const statuses: string[] = [];
  let changedFrameCount = 0;
  for (const chunk of chunks) {
    await new Promise<void>(resolveWrite => terminal.write(chunk.data, resolveWrite));
    const lines = viewportLines(terminal, 28);
    if (lines.join("\n").includes("SIMULATED CONVERSATION")) started = true;
    if (!started) continue;
    const anchored = isAnchored(lines);
    if (path === "wrapped") expectAnchored(lines, undefined, path);
    if (!anchored) continue;
    const digest = lines.join("\n");
    if (digest === previous) continue;
    previous = digest;
    changedFrameCount += 1;
    statuses.push(lines[26]?.trimEnd() ?? "");
  }
  return { changedFrameCount, statuses, finalLines: viewportLines(terminal, 28) };
}

function collapseAdjacent(values: readonly string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

function isAnchored(lines: readonly string[]): boolean {
  return lines[26]?.startsWith(" STATUS ") === true && lines[27]?.startsWith("INPUT>") === true;
}

function expectAnchored(lines: readonly string[], expectedStatus?: string, path = "checkpoint"): void {
  expect(lines[26]?.trimEnd(), `${path}: status row jumped`).toMatch(/^ STATUS /);
  expect(lines[27]?.trimEnd(), `${path}: input row jumped`).toMatch(/^INPUT>/);
  expect(lines.findIndex(line => line.startsWith(" STATUS "))).toBe(26);
  expect(lines.findIndex(line => line.startsWith("INPUT>"))).toBe(27);
  if (expectedStatus) expect(lines[26]).toContain(expectedStatus);
}

async function recordedHostWrites(path: string): Promise<RecordedHostWrite[]> {
  return (await readFile(path, "utf8"))
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line) as RecordedHostWrite)
    .filter(event => event.role === "ui" && event.stage === "host-write");
}

function hasPrintableCellPayload(data: string): boolean {
  const text = data
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1bP.*?\x1b\\/gs, "")
    .replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
    .replace(/\x1b./g, "");
  return /[^\x00-\x20\x7f]/u.test(text);
}

function viewportLines(terminal: InstanceType<typeof Terminal>, rows: number): string[] {
  const buffer = terminal.buffer.active;
  return Array.from({ length: rows }, (_, row) => buffer.getLine(buffer.viewportY + row)?.translateToString(true) ?? "");
}
