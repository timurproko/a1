import { describe, expect, it } from "vitest";
import { runTerminalHostMaintenance, type MaintenanceOptions } from "../../../src/foundation/resident-tabs/maintenance.js";

const base: MaintenanceOptions = {
  action: "list",
  profileRoot: "/profile",
  dataDir: "/data",
  runtimeDir: "/runtime",
  releaseRoots: ["/active"],
  environment: {},
  platform: "linux",
  architecture: "x64",
  verify: async () => undefined,
};

const report = (fields: Record<string, unknown>) => JSON.stringify({ schema: "a1-tabs-maintenance-v1", command: "list", ...fields });

describe("terminal-host maintenance runner", () => {
  it("passes the exact maintenance form to the verified installed host", async () => {
    const calls: string[][] = [];
    const result = await runTerminalHostMaintenance({
      ...base,
      action: "stop",
      tabId: "tab-1",
      run: async (executable, arguments_) => { calls.push([executable, ...arguments_]); return { code: 0, stdout: report({ host: "running", result: { accepted: true } }) }; },
    });
    expect(result).toMatchObject({ host: "running", exitCode: 0 });
    expect(calls[0]?.slice(1)).toEqual(["tabs", "stop", "tab-1", "--profile", "/profile", "--data-dir", "/data", "--runtime-dir", "/runtime"]);
    expect(calls[0]?.[0]).toMatch(/active[\\/]dist[\\/]native[\\/]linux-x64[\\/]terminal-host$/u);
  });

  it("retries once with the recorded cohort's own verified host after a generation mismatch", async () => {
    const calls: string[] = [];
    const result = await runTerminalHostMaintenance({
      ...base,
      action: "host-stop",
      run: async executable => {
        calls.push(executable);
        return executable.includes("cohort")
          ? { code: 0, stdout: report({ command: "host-stop", host: "stopped" }) }
          : { code: 4, stdout: report({ command: "host-stop", host: "incompatible", releaseRoot: "/cohort" }) };
      },
    });
    expect(result).toMatchObject({ host: "stopped", exitCode: 0 });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatch(/cohort/u);
  });

  it("never runs an unverified host, including an unverifiable cohort binary", async () => {
    let ran = 0;
    await expect(runTerminalHostMaintenance({ ...base, verify: async () => { throw new Error("tampered"); }, run: async () => { ran++; return { code: 0, stdout: "" }; } }))
      .resolves.toMatchObject({ host: "unavailable", exitCode: 3 });
    expect(ran).toBe(0);
    const result = await runTerminalHostMaintenance({
      ...base,
      verify: async executable => { if (executable.includes("cohort")) throw new Error("tampered"); },
      run: async () => { ran++; return { code: 4, stdout: report({ host: "incompatible", releaseRoot: "/cohort" }) }; },
    });
    expect(result).toMatchObject({ host: "incompatible", exitCode: 4 });
    expect(ran).toBe(1);
  });

  it("reports a malformed or failed exchange as unavailable", async () => {
    await expect(runTerminalHostMaintenance({ ...base, run: async () => ({ code: 0, stdout: "not json" }) }))
      .resolves.toMatchObject({ host: "unavailable" });
    await expect(runTerminalHostMaintenance({ ...base, run: async () => { throw new Error("timed out"); } }))
      .resolves.toMatchObject({ host: "unavailable" });
  });
});
