import { describe, expect, it } from "vitest";
import { cleanupPreflight } from "../../scripts/governance/local-cleanup-preflight.mjs";

const process = { pid: 42, parent: 1, start: "creation-identity", executable: "private executable", script: "checkout/bin/ui.js", protected: false };

describe("cleanup local preflight", () => {
  it("reports dirty content and running development processes together without exposing command lines", async () => {
    const result = await cleanupPreflight({}, { path: "checkout" }, {
      inspect: async () => ({ clean: false, reason: "worktree-content", paths: ["session.html"] }),
      inspectProcesses: async () => [{ ...process, command: "private command line" }],
    });
    expect(result.reason).toBe("worktree-content");
    expect(result.blockers).toEqual([{ reason: "worktree-content", paths: ["session.html"] }, { reason: "development-processes-running", pids: [42] }]);
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("reports unavailable process inspection alongside existing content blockers", async () => {
    const result = await cleanupPreflight({}, { path: "checkout" }, {
      inspect: async () => ({ clean: false, reason: "worktree-content", paths: ["session.html"] }),
      inspectProcesses: async () => { throw new Error("private inspector failure"); },
    });
    expect(result.blockers.map(row => row.reason)).toEqual(["worktree-content", "development-process-inspection-unavailable"]);
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("blocks a checkout a live session has attached and treats a failed attachment check as unverifiable", async () => {
    const clean = { inspect: async () => ({ clean: true }), inspectProcesses: async () => [] };
    const attached = await cleanupPreflight({}, { path: "checkout" }, { ...clean, inspectAttachment: async () => ({ reason: "attached-session" }) });
    expect(attached).toMatchObject({ clean: false, reason: "attached-session", blockers: [{ reason: "attached-session" }] });
    const failed = await cleanupPreflight({}, { path: "checkout" }, { ...clean, inspectAttachment: async () => { throw new Error("private"); } });
    expect(failed.blockers).toEqual([{ reason: "attached-session-unverifiable" }]);
    const free = await cleanupPreflight({}, { path: "checkout" }, { ...clean, inspectAttachment: async () => null });
    expect(free).toMatchObject({ clean: true, blockers: [] });
  });

  it("protects caller-associated processes and retains structural inspection failures", async () => {
    const result = await cleanupPreflight({}, { path: "checkout" }, {
      inspect: async () => { throw Object.assign(new Error("private details"), { cleanupCode: "hidden-index-content" }); },
      inspectProcesses: async () => [{ ...process, protected: true }],
    });
    expect(result.blockers.map(row => row.reason)).toEqual(["hidden-index-content", "development-process-protected"]);
    expect(result.clean).toBe(false);
  });
});
