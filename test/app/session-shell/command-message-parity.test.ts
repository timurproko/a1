import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createValidationPhaseRecorder } from "../../../scripts/release/validation-phase.mjs";
import { COMMAND_MESSAGE_CASES } from "./command-message-fixture.js";

const execute = promisify(execFile);
const homes: string[] = [];
const phases = createValidationPhaseRecorder("command-message-parity");
afterEach(async () => { for (const home of homes.splice(0)) await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
interface Capture { readonly id: string; readonly rows: readonly string[]; readonly surfaceOpen: boolean }

async function capture(producer: "pinned" | "owned", home: string, modes: readonly string[], cases = COMMAND_MESSAGE_CASES): Promise<readonly Capture[]> {
  return phases.run(`${producer}-${modes.join("-")}`, async () => {
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"].includes(key.toUpperCase())));
    const { stdout, stderr } = await execute(process.execPath, [
      "--import", "tsx", resolve("test/app/session-shell/command-message-worker.mjs"), producer, home, JSON.stringify(modes), JSON.stringify(cases), join(tmpdir(), "command-message-logical-agent"),
    ], {
      cwd: process.cwd(), timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
      env: { ...environment, HOME: home, USERPROFILE: home, FORCE_COLOR: "0", PI_OFFLINE: "1", PI_TELEMETRY: "0", PI_SKIP_VERSION_CHECK: "1" },
    });
    expect(stderr).toBe("");
    const captures = JSON.parse(stdout) as Capture[];
    expect(captures).toHaveLength(modes.length * 4 * cases.reduce((total, entry) => total + entry.steps.length * 3, 0));
    return captures;
  });
}

async function home(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), "a1-message-cells-"));
  homes.push(value);
  return value;
}

function assertSameCells(actual: readonly Capture[], expected: readonly Capture[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [index, reference] of expected.entries()) expect(actual[index], reference.id).toEqual(reference);
}

describe("independent pinned command message geometry", () => {
  it("matches complete rows and transitions in both capability modes", async () => {
    const expected = await capture("pinned", await home(), ["truecolor", "256color"]);
    const actual = await capture("owned", await home(), ["truecolor", "256color"]);
    assertSameCells(actual, expected);
    for (const frame of actual) {
      expect(frame.rows.every(row => !row.includes("\n") && !row.includes("\r")), frame.id).toBe(true);
    }
  }, 120_000);

  it("rejects missing rows, wrong severity, punctuation and whitespace instead of normalizing them away", async () => {
    const expected = await capture("pinned", await home(), ["truecolor"], [COMMAND_MESSAGE_CASES[1]!]);
    const frame = expected[0]!;
    for (const rows of [
      frame.rows.slice(1),
      frame.rows.map(row => row.replace("Error:", "Warning:")),
      frame.rows.map(row => row.replace("Error:", "Error")),
      frame.rows.map(row => row.replace("  second", " second")),
      frame.rows.map(row => row.replace(/\u001b\[[0-9;]*m/g, "")),
    ]) {
      expect(() => assertSameCells([{ ...frame, rows }, ...expected.slice(1)], expected)).toThrow();
    }
  }, 120_000);

  it("fails closed when a producer cannot execute its declared input", async () => {
    const root = await home();
    await expect(capture("pinned", root, ["invalid-mode"])).rejects.toThrow("Invalid command-message producer arguments");
  }, 70_000);
});
