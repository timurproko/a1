import { describe, expect, it } from "vitest";
import { runBoundedHostCommand } from "../../../src/foundation/resident-tabs/bounded-host-command.js";
import { MAX_MAINTENANCE_REPORT_BYTES } from "../../../src/foundation/resident-tabs/maintenance.js";
import { MAX_RELEASE_HOLD_REPORT_BYTES } from "../../../src/foundation/resident-tabs/release-holds.js";

const node = process.execPath;

describe("bounded terminal-host command", () => {
  it("returns a report within its caps", async () => {
    const result = await runBoundedHostCommand(node, ["-e", "process.stdout.write('{\"ok\":true}')"], { maxStdoutBytes: 1024, timeoutMs: 10_000, label: "fixture" });
    expect(result).toEqual({ code: 0, stdout: "{\"ok\":true}" });
  });

  it.each([
    ["release-hold", MAX_RELEASE_HOLD_REPORT_BYTES],
    ["maintenance", MAX_MAINTENANCE_REPORT_BYTES],
  ])("fails a %s report that pushes past its byte cap without returning a prefix", async (_name, cap) => {
    const script = `process.stdout.write(Buffer.alloc(${cap + 64 * 1024}, 120), () => process.exit(0))`;
    const result = await runBoundedHostCommand(node, ["-e", script], { maxStdoutBytes: cap, timeoutMs: 20_000, label: "fixture" });
    expect(result.code).not.toBe(0);
    expect(result.stdout).toBe("");
  });

  it("kills and rejects a command that outlives its deadline", async () => {
    const started = Date.now();
    await expect(runBoundedHostCommand(node, ["-e", "setTimeout(() => {}, 30_000)"], { maxStdoutBytes: 1024, timeoutMs: 300, label: "fixture exchange" }))
      .rejects.toThrow("fixture exchange timed out");
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});
