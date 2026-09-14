import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PREDECESSOR_OUTPUT_LIMIT, runPredecessorCommand, type PredecessorCommand } from "../../support/predecessor-command.js";

const run = (code: string, options: Partial<PredecessorCommand> = {}) => runPredecessorCommand({
  executable: process.execPath, arguments: ["-e", code], cwd: process.cwd(), phase: "fixture", ...options,
});

describe("bounded predecessor command outcomes", () => {
  it("drains split UTF-8 and both output streams before resolving", async () => {
    const result = await run(`const b = Buffer.from('a🙂z'); process.stdout.write(b.subarray(0,3)); setImmediate(() => {
      process.stdout.write(b.subarray(3)); process.stderr.write('last-stderr'); });`);
    expect(result.stdout).toBe("a🙂z");
    expect(result.stderr).toBe("last-stderr");
    expect(result.evidence).toMatchObject({ stdoutBytes: 6, stderrBytes: 11, exitCode: 0, error: null, cleanupError: null });
  });

  it("accepts the exact retained output bound", async () => {
    const result = await run(`process.stdout.write(Buffer.alloc(${PREDECESSOR_OUTPUT_LIMIT}, 120));`);
    expect(Buffer.byteLength(result.stdout)).toBe(PREDECESSOR_OUTPUT_LIMIT);
  });

  it.each(["stdout", "stderr"])("rejects %s overflow rather than succeeding with truncated evidence", async stream => {
    await expect(run(`process.${stream}.write(Buffer.alloc(${PREDECESSOR_OUTPUT_LIMIT + 1}, 120));`))
      .rejects.toMatchObject({ evidence: { error: "OUTPUT_LIMIT" } });
  });

  it("bounds combined stdout and stderr, not just each stream", async () => {
    await expect(run(`process.stdout.write(Buffer.alloc(${PREDECESSOR_OUTPUT_LIMIT / 2}, 120)); process.stderr.write(Buffer.alloc(${PREDECESSOR_OUTPUT_LIMIT / 2 + 1}, 121));`))
      .rejects.toMatchObject({ evidence: { error: "OUTPUT_LIMIT" } });
  });

  it("rejects a nonzero exit without disclosing captured content", async () => {
    const error = await run("process.stderr.write('SYNTHETIC_SECRET'); process.stdout.write('PRIVATE_PAYLOAD'); process.exitCode=7;", { version: "0.1.8-dev.390" }).catch(error => error);
    expect(error.evidence).toMatchObject({ phase: "fixture", version: "0.1.8-dev.390", executable: "node", exitCode: 7, error: "EXIT" });
    expect(error.message).not.toMatch(/SYNTHETIC_SECRET|PRIVATE_PAYLOAD/);
    expect(error.message.length).toBeLessThan(2048);
  });

  it("rejects missing executables and signal termination", async () => {
    await expect(run("", { executable: "nonexistent-predecessor-command-402", arguments: [] })).rejects.toMatchObject({ evidence: { error: "ENOENT" } });
    await expect(run("process.kill(process.pid, 'SIGTERM');")).rejects.toThrow("predecessor command failed");
  });

  it("refuses to spawn for an already-aborted operation", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(run("", { signal: controller.signal, executable: "nonexistent-predecessor-command-402" }))
      .rejects.toMatchObject({ evidence: { error: "ABORTED", stdoutBytes: 0, stderrBytes: 0 } });
  });

  it("preserves argument boundaries and cwd with spaces while sanitizing npm configuration", async () => {
    const cwd = await mkdtemp(resolve(tmpdir(), "predecessor space "));
    try {
      const values = ["space value", "a&b", 'quoted"value'];
      const result = await run("", { cwd,
        arguments: ["-e", "process.stdout.write(JSON.stringify({args:process.argv.slice(1),cwd:process.cwd(),bad:Object.keys(process.env).filter(k=>k.toLowerCase().startsWith('npm_config_')),keep:process.env.FIXTURE_KEEP}));", ...values],
        environment: { ...process.env, npm_config_prefix: "unowned-prefix", NPM_CONFIG_CACHE: "unowned-cache", FIXTURE_KEEP: "keep" },
      });
      expect(JSON.parse(result.stdout)).toEqual({ args: values, cwd, bad: [], keep: "keep" });
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});
