import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChildProcess, spawn } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveNpmCli, runNpm } from "../../scripts/development/dependency-process.mjs";
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const child = Object.assign(new EventEmitter(), { pid: 424242, stdout: new PassThrough() });
  const spawnProcess = vi.fn(() => child) as unknown as typeof spawn;
  const terminate = vi.fn(async (_child: ChildProcess) => {});
  return { child, spawnProcess, terminate, options: { cwd: "/fixture with spaces", npmCli: "/fixture with spaces/npm-cli.js", spawnProcess, terminate } };
}

describe("dependency-free npm transport", () => {
  it("selects the npm JS CLI and rejects unsupported execpath instead of invoking a shell", () => {
    const root = mkdtempSync(join(tmpdir(), "npm-cli-fixture-")); roots.push(root);
    const cli = join(root, "npm-cli.js"); writeFileSync(cli, "throw Error('Do not execute');");
    expect(resolveNpmCli({ npm_execpath: cli })).toBe(cli);
    expect(() => resolveNpmCli({ npm_execpath: join(root, "npm.cmd") })).toThrow(/supported npm CLI/);
  });
  it("uses literal arguments, inherited installer progress and the selected checkout", async () => {
    const f = fixture(), pending = runNpm(["ci", "--include=dev"], f.options);
    expect(f.spawnProcess).toHaveBeenCalledWith(process.execPath, [f.options.npmCli, "ci", "--include=dev"], expect.objectContaining({ cwd: f.options.cwd, shell: false, stdio: "inherit" }));
    f.child.emit("close", 17, null); expect(await pending).toEqual({ code: 17, stdout: "" }); expect(f.terminate).not.toHaveBeenCalled();
  });
  it("captures only the bounded dependency report", async () => {
    const f = fixture(), pending = runNpm(["ls", "--json"], { ...f.options, capture: true });
    f.child.stdout.write('{"name":"fixture"}'); f.child.emit("close", 0, null);
    expect(await pending).toEqual({ code: 0, stdout: '{"name":"fixture"}' });
  });
  it("settles the owned installer before reporting cancellation", async () => {
    const f = fixture(), controller = new AbortController(); let settle!: () => void;
    f.terminate.mockImplementation(async () => await new Promise<void>(resolve => { settle = resolve; }));
    const pending = runNpm(["ci"], { ...f.options, signal: controller.signal }); controller.abort();
    await Promise.resolve(); expect(f.terminate).toHaveBeenCalledOnce(); f.child.emit("close", 1, null);
    let finished = false; void pending.catch(() => { finished = true; }); await Promise.resolve(); expect(finished).toBe(false);
    settle(); await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
  it("reports unverified settlement without releasing authority or waiting forever for close", async () => {
    const f = fixture(), controller = new AbortController(); f.terminate.mockRejectedValue(new Error("Unknown process tree"));
    const pending = runNpm(["ci"], { ...f.options, signal: controller.signal }); controller.abort();
    await expect(pending).rejects.toMatchObject({ settled: false, message: expect.stringContaining("lock retained") });
  });
  it("bounds an unresponsive npm child and rejects pre-cancelled setup without spawning", async () => {
    const f = fixture(); f.terminate.mockImplementation(async () => { f.child.emit("close", 1, null); });
    await expect(runNpm(["ci"], { ...f.options, timeoutMs: 1 })).rejects.toThrow(/timed out/);
    const controller = new AbortController(); controller.abort(); const before = vi.mocked(f.spawnProcess).mock.calls.length;
    await expect(runNpm(["ci"], { ...f.options, signal: controller.signal })).rejects.toBeDefined();
    expect(vi.mocked(f.spawnProcess).mock.calls.length).toBe(before);
  });
});
