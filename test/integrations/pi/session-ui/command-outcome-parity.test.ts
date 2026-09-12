import { execFile, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { COMMAND_OUTCOME_CASES, type CommandOutcomeCase } from "./command-outcome-cases.js";

const execute = promisify(execFile);
const homes: string[] = [];
afterEach(async () => { for (const home of homes.splice(0)) await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
interface Capture {
  readonly id: string;
  readonly activeBindings: Readonly<Record<string, readonly string[]>> | null;
  readonly rows: readonly string[];
  readonly progressRows: readonly (readonly string[])[];
  readonly surfaceOpen: boolean;
  readonly surfaceRows: readonly string[];
  readonly calls: readonly string[];
  readonly active: boolean;
  readonly fatalExit: number | null;
  readonly remainingExports: number;
  readonly exceptionReferenceRows?: readonly string[];
}
async function home(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "a1-command-outcomes-")); homes.push(directory); return directory;
}
async function capture(producer: "pinned" | "owned", directory: string, mode: string, cases: readonly CommandOutcomeCase[], timeout = 60_000): Promise<readonly Capture[]> {
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"].includes(key.toUpperCase())));
  const { stdout, stderr } = await execute(process.execPath, [
    "--import", "tsx", resolve("test/integrations/pi/session-ui/command-outcome-worker.mjs"), producer, directory, mode, JSON.stringify(cases),
  ], {
    cwd: process.cwd(), timeout, maxBuffer: 12 * 1024 * 1024,
    env: { ...environment, HOME: directory, USERPROFILE: directory, FORCE_COLOR: "0", PI_OFFLINE: "1", PI_TELEMETRY: "0", PI_SKIP_VERSION_CHECK: "1" },
  });
  expect(stderr).toBe("");
  const frames = JSON.parse(stdout) as Capture[];
  expect(frames).toHaveLength(8 * cases.length);
  expect(new Set(frames.map(frame => frame.id)).size).toBe(frames.length);
  return frames;
}
function verify(actual: Capture, expected: Capture): void {
  expect(actual.id).toBe(expected.id);
  expect(actual.activeBindings, `${actual.id} active editor bindings`).toEqual(expected.activeBindings);
  const missingExecutable = expected.id.includes("/share/missing/");
  expect(actual.rows, actual.id).toEqual(missingExecutable ? expected.exceptionReferenceRows : expected.rows);
  expect(actual.progressRows, `${actual.id} before catalog completion`).toEqual(expected.progressRows);
  expect(actual.surfaceOpen, `${actual.id} input ownership`).toBe(expected.surfaceOpen);
  expect(actual.surfaceRows, `${actual.id} selector messages`).toEqual(expected.surfaceRows);
  const fatal = /\/(new|resume|import)\/(failure|non-error)\//.test(expected.id);
  expect(expected.fatalExit, expected.id).toBe(fatal ? 1 : null);
  expect(actual.fatalExit, actual.id).toBeNull();
  expect(actual.remainingExports, actual.id).toBe(0);
  expect(expected.remainingExports, expected.id).toBe(0);
  const quit = expected.id.includes("/quit/");
  expect(actual.active, actual.id).toBe(!quit);
  expect(expected.active, expected.id).toBe(!fatal && !quit);
  expect(actual.rows.every(row => !row.includes("\n") && !row.includes("\r")), actual.id).toBe(true);
}

describe("independent command outcome parity", () => {
  it.each(["truecolor", "256color"])("matches real command outputs in %s with only the two named exceptions", async mode => {
    const directory = await home();
    const expected = await capture("pinned", directory, mode, COMMAND_OUTCOME_CASES);
    const actual = await capture("owned", directory, mode, COMMAND_OUTCOME_CASES);
    const mismatches = expected.filter((frame, index) => JSON.stringify(actual[index]?.rows) !== JSON.stringify(frame.exceptionReferenceRows ?? frame.rows)).map(frame => frame.id);
    expect(mismatches, "command message differences").toEqual([]);
    for (const [index, frame] of expected.entries()) verify(actual[index]!, frame);
    for (const frame of [...actual, ...expected].filter(value => /\/share\/(missing|unauthenticated|permission)\//.test(value.id))) {
      expect(frame.calls, frame.id).toEqual(["auth"]);
    }
  }, 120_000);

  it("fails on malformed producer input and terminates a nonresponsive producer", async () => {
    const directory = await home();
    await expect(capture("pinned", directory, "invalid-mode", [])).rejects.toThrow("Invalid outcome producer arguments");
    await expect(capture("pinned", directory, "timeout-probe", [], 500)).rejects.toMatchObject({ killed: true });
  }, 10_000);

  it("uses the native missing-executable shape and refuses to widen the wording exception", async () => {
    const directory = await home();
    const native = spawnSync(join(directory, "nonexistent-gh-executable"), []);
    expect(native.status).toBeNull();
    expect(native.error).toMatchObject({ code: "ENOENT" });
    const cases = COMMAND_OUTCOME_CASES.filter(entry => entry.command === "share" && ["missing", "unauthenticated", "permission"].includes(entry.condition));
    const expected = await capture("pinned", directory, "truecolor", cases);
    const actual = await capture("owned", directory, "truecolor", cases);
    const missingIndex = expected.findIndex(frame => frame.id.endsWith("/share/missing/80"));
    const absent = actual[missingIndex]!;
    const pinnedAbsent = expected[missingIndex]!;
    verify(absent, pinnedAbsent);
    expect(pinnedAbsent.rows.join("\n")).toContain("GitHub CLI is not logged in.");
    expect(absent.rows.join("\n")).toContain("GitHub CLI (gh) is not installed.");
    expect(() => verify({ ...absent, rows: pinnedAbsent.rows }, pinnedAbsent)).toThrow();
    expect(() => verify({ ...absent, rows: absent.rows.map(row => row.replace("installed.", "installed!")) }, pinnedAbsent)).toThrow();
    for (const condition of ["unauthenticated", "permission"]) {
      const reference = expected.find(frame => frame.id.endsWith(`/share/${condition}/80`))!;
      expect(() => verify({ ...absent, id: reference.id }, reference)).toThrow();
    }
  }, 120_000);
});
