/**
 * Process liveness behind session-control records. Unix trusts a permission refusal; Windows must
 * confirm it against the process table because process and thread ids share one number space.
 */
import { describe, expect, it } from "vitest";
import { inspectLiveProcess, PID_LIVENESS_IDENTITY } from "../../../src/foundation/lifecycle/process-liveness.js";

const eperm = () => { throw Object.assign(new Error("denied"), { code: "EPERM" }); };
const esrch = () => { throw Object.assign(new Error("gone"), { code: "ESRCH" }); };

describe("process liveness", () => {
  it("reports this process alive and an impossible pid dead with the real probe", async () => {
    expect(await inspectLiveProcess(process.pid)).toEqual({ pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY });
    expect(await inspectLiveProcess(2_000_000_000)).toBeNull();
    expect(await inspectLiveProcess(0)).toBeNull();
    expect(await inspectLiveProcess(-5)).toBeNull();
  });

  it("treats a permission refusal as alive on Unix", async () => {
    expect(await inspectLiveProcess(4242, { platform: "linux", kill: eperm })).toMatchObject({ pid: 4242 });
    expect(await inspectLiveProcess(4242, { platform: "linux", kill: esrch })).toBeNull();
  });

  it("confirms a Windows permission refusal against the process table", async () => {
    let listed = 0;
    const table = async () => { listed++; return new Set([4242]); };
    expect(await inspectLiveProcess(4242, { platform: "win32", kill: eperm, listProcessIds: table })).toMatchObject({ pid: 4242 });
    // Rationale: a thread id or a handle-held terminated process answers EPERM yet is not a process.
    expect(await inspectLiveProcess(9999, { platform: "win32", kill: eperm, listProcessIds: table })).toBeNull();
    expect(listed).toBe(2);
    // Invariant: a signal success never consults the table, and ESRCH is dead without it.
    expect(await inspectLiveProcess(7, { platform: "win32", kill: () => {}, listProcessIds: table })).toMatchObject({ pid: 7 });
    expect(await inspectLiveProcess(8, { platform: "win32", kill: esrch, listProcessIds: table })).toBeNull();
    expect(listed).toBe(2);
  });

  it("keeps the conservative answer when the Windows process table is unavailable", async () => {
    expect(await inspectLiveProcess(4242, { platform: "win32", kill: eperm, listProcessIds: async () => null })).toMatchObject({ pid: 4242 });
  });

  it.runIf(process.platform === "win32")("reads the real Windows process table for a refused pid", async () => {
    // Platform: pid 4 is the System process; opening it is refused yet it is always listed.
    expect(await inspectLiveProcess(4)).toMatchObject({ pid: 4 });
  });
});
