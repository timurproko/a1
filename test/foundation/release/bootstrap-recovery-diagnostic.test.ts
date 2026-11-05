import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runBootstrap } from "../../../src/foundation/release/bootstrap.js";

const fault = vi.hoisted(() => ({ error: new Error("fixture error") }));
vi.mock("../../../src/foundation/release/endpoints.js", async original => ({
  ...await original<typeof import("../../../src/foundation/release/endpoints.js")>(),
  readEndpointMetadata: async () => { throw fault.error; },
  sweepDeadEndpoints: async () => [],
}));
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("bootstrap recovery diagnostics", () => {
  it.each(["SUPERVISOR_RECOVERY_BLOCKED", "SUPERVISOR_RECOVERY_UNAVAILABLE", "SUPERVISOR_RECOVERY_BUSY"])("reports %s as one actionable line without a stack", async code => {
    fault.error = Object.assign(new Error("A1's background service is not responding; retry shortly. Your sessions have been preserved."), { code });
    const { options, write } = await fixture();
    expect(await runBootstrap(options)).toBe(1);
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]![0]).toMatch(/retry shortly.*preserved\.\n$/);
    expect(write.mock.calls[0]![0]).not.toMatch(/\n\s+at |ownership is uncertain|Error:/);
  });

  it("does not hide unrelated failures behind recovery prose", async () => {
    fault.error = new Error("unrelated fixture failure");
    const { options, write } = await fixture();
    await expect(runBootstrap(options)).rejects.toBe(fault.error);
    expect(write).not.toHaveBeenCalled();
  });
});

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-bootstrap-recovery-"));
  roots.push(root);
  const write = vi.fn<(message: string | Uint8Array) => boolean>(() => true);
  return { write, options: { packageRoot: root, environment: { A1_DATA_DIR: root, A1_RUNTIME_DIR: resolve(root, "runtime") }, output: { write }, scheduleMaintenance: async () => {} } };
}
