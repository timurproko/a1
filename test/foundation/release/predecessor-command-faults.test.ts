import crossSpawn from "cross-spawn";
import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PREDECESSOR_OUTPUT_LIMIT, runPredecessorCommand } from "../../support/predecessor-command.js";

// Security: fault injection never addresses a real PID; both native termination routes are disabled.
vi.mock("cross-spawn", () => ({ default: vi.fn() }));
vi.mock("node:child_process", async importActual => ({ ...await importActual<typeof import("node:child_process")>(), spawn: vi.fn() }));

function fakeChild() {
  return Object.assign(new EventEmitter(), {
    pid: 99999999, exitCode: null as number | null, signalCode: null,
    stdout: new PassThrough(), stderr: new PassThrough(), unref: vi.fn(),
  });
}
let child: ReturnType<typeof fakeChild>;
beforeEach(() => {
  child = fakeChild();
  vi.mocked(crossSpawn).mockReturnValue(child as unknown as ChildProcess);
  vi.spyOn(process, "kill").mockImplementation(() => { throw new Error("forced native cleanup failure"); });
  vi.mocked(spawn).mockImplementation(() => { throw new Error("forced native cleanup failure"); });
});
afterEach(() => { child.stdout.destroy(); child.stderr.destroy(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const run = (signal?: AbortSignal) => runPredecessorCommand({ executable: process.execPath, arguments: [], cwd: process.cwd(), phase: "fault-fixture", ...(signal ? { signal } : {}) });

it("does not settle on exit before captured streams close", async () => {
  let settled = false;
  const pending = run().then(value => { settled = true; return value; });
  child.exitCode = 0; child.emit("exit", 0, null);
  await Promise.resolve();
  expect(settled).toBe(false);
  child.stdout.write("last output");
  child.emit("close", 0, null);
  expect((await pending).stdout).toBe("last output");
  expect(child.listenerCount("close")).toBe(0);
  expect(child.stdout.listenerCount("data")).toBe(0);
});

it("retains the primary overflow error when native cleanup fails", async () => {
  const pending = run();
  child.stdout.write(Buffer.alloc(PREDECESSOR_OUTPUT_LIMIT + 1));
  await expect(pending).rejects.toMatchObject({ evidence: { error: "OUTPUT_LIMIT", cleanupError: "CLEANUP_FAILED" } });
  expect(child.unref).toHaveBeenCalledOnce();
  expect(child.listenerCount("error")).toBe(0);
  expect(child.stderr.listenerCount("error")).toBe(0);
});

it("refuses retired PID cleanup rather than claiming descendants were stopped", async () => {
  const controller = new AbortController();
  const pending = run(controller.signal);
  child.exitCode = 0; controller.abort();
  await expect(pending).rejects.toMatchObject({ evidence: { error: "ABORTED", cleanupError: "CLEANUP_FAILED" } });
  expect(process.kill).not.toHaveBeenCalled();
  expect(spawn).not.toHaveBeenCalled();
});
