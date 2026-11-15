import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPublishedSmokeRunner } from "../../scripts/release/published-smoke-processes.mjs";
import type { ProcessSnapshot } from "../../scripts/development/checkout-process-inspection.mjs";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })));
});
async function fixture() {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "a1-smoke-process-")));
  roots.push(root);
  return root;
}
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const row = (pid: number, parent: number, start: string, argv: string[] = []): ProcessSnapshot => ({ pid, parent, start, argv, executable: process.execPath });

describe("published smoke process ownership", () => {
  it("collects asynchronous command output and rejects oversized success output", async () => {
    const root = await fixture();
    const runner = createPublishedSmokeRunner(root);
    try {
      const result = await runner.run(process.execPath, ["-e", "console.log('finished')"], { cwd: root, env: process.env, timeout: 5_000 });
      expect(result).toMatchObject({ status: 0, stdout: "finished\n", stderr: "" });
      const overflow = await runner.run(process.execPath, ["-e", "process.stdout.write('x'.repeat(200000))"], { cwd: root, env: process.env, timeout: 5_000 });
      expect(overflow.error?.message).toContain("output limit");
      expect(overflow.stdout.length).toBeLessThanOrEqual(128_000);
    } finally { await runner.close(); }
  });

  it("stops detached recovery owners and relative descendants but protects caller ancestry, unrelated paths, and stale parent IDs", async () => {
    const root = await fixture();
    let rows = [
      row(1, 0, "1"), row(2, 1, "2", [process.execPath, resolve(root, "caller.mjs")]),
      row(3, 2, "3", [process.execPath, resolve(root, "update-data", "update-recovery", "recovery.js")]),
      row(4, 3, "4", [process.execPath, "relative-lifecycle.js"]),
      row(5, 3, "1", [process.execPath, "older-unrelated.js"]),
      row(6, 1, "6", [process.execPath, `${root}-other/script.js`]),
    ];
    const stopped: number[] = [];
    const runner = createPublishedSmokeRunner(root, {
      self: 2, list: async () => rows, pause: async () => {},
      terminate: async record => { stopped.push(record.pid); rows = rows.filter(candidate => candidate.pid !== record.pid); },
    });
    await runner.close();
    expect(stopped).toEqual([3, 4]);
    expect(rows.map(record => record.pid)).toEqual([1, 2, 5, 6]);
  });

  it("inventories the same fixture-owned processes settlement would stop without stopping them", async () => {
    const root = await fixture();
    const rows = [
      row(1, 0, "1"), row(2, 1, "2", [process.execPath, resolve(root, "caller.mjs")]),
      row(3, 2, "3", [process.execPath, resolve(root, "update-data", "update-recovery", "recovery.js")]),
      row(4, 3, "4", [process.execPath, "relative-npm-cli.js", "install", "--global"]),
      row(6, 1, "6", [process.execPath, `${root}-other/script.js`]),
    ];
    const stopped: number[] = [];
    const runner = createPublishedSmokeRunner(root, { self: 2, list: async () => rows, terminate: async record => { stopped.push(record.pid); } });
    const inventory = await runner.inventory!();
    expect(inventory.map(record => [record.pid, record.parent, record.argv.at(-1)])).toEqual([[3, 2, resolve(root, "update-data", "update-recovery", "recovery.js")], [4, 3, "--global"]]);
    expect(stopped).toEqual([]);
  });

  it("refuses a changed process identity before termination", async () => {
    const root = await fixture();
    let reads = 0;
    const stopped: number[] = [];
    const runner = createPublishedSmokeRunner(root, {
      self: 2,
      list: async () => [row(2, 1, "2"), row(3, 1, ++reads === 1 ? "3" : "4", [process.execPath, resolve(root, "recovery.js")])],
      terminate: async record => { stopped.push(record.pid); },
    });
    await expect(runner.close()).rejects.toThrow("identity changed");
    expect(stopped).toEqual([]);
  });

  it("fails closed when process inspection cannot identify the caller", async () => {
    const root = await fixture();
    const runner = createPublishedSmokeRunner(root, { list: async () => [] });
    await expect(runner.close()).rejects.toThrow("identify its caller");
  });

  it.runIf(process.platform === "win32")("settles a timed-out public cmd shim, detached recovery owner, and relative npm descendant before removing the fixture", async () => {
    const root = await fixture();
    const records = resolve(root, "update-data", "update-recovery");
    await mkdir(records, { recursive: true });
    await writeFile(resolve(root, "relative-npm.mjs"), "setInterval(() => {}, 1000);\n");
    await writeFile(resolve(root, "guardian.mjs"), `
      import { spawn } from 'node:child_process';
      import { writeFileSync } from 'node:fs';
      const npm = spawn(process.execPath, ['relative-npm.mjs'], { stdio: 'ignore', windowsHide: true });
      writeFileSync(${JSON.stringify(resolve(records, "owner.json"))}, JSON.stringify({pid:process.pid,npmPid:npm.pid,parentPid:process.ppid}));
      setInterval(() => {}, 1000);
    `);
    await writeFile(resolve(root, "updater.mjs"), `
      import { spawn } from 'node:child_process';
      spawn(process.execPath, [${JSON.stringify(resolve(root, "guardian.mjs"))}], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      setInterval(() => {}, 1000);
    `);
    const launcher = resolve(root, "a1.cmd");
    await writeFile(launcher, `@echo off\r\n"${process.execPath}" "${resolve(root, "updater.mjs")}"\r\n`);
    const runner = createPublishedSmokeRunner(root);
    let pids: number[] = [];
    try {
      const result = await runner.run(launcher, ["update"], { cwd: root, env: process.env, timeout: 5_000 });
      expect(result.status).toBeNull();
      expect(result.error).toMatchObject({ code: "ETIMEDOUT" });
      const owner = JSON.parse(await readFile(resolve(records, "owner.json"), "utf8")) as { pid: number; npmPid: number; parentPid: number };
      pids = [owner.pid, owner.npmPid, owner.parentPid];
      expect(pids.every(alive)).toBe(true);
      await runner.close();
      expect(pids.some(alive)).toBe(false);
      await rm(root, { recursive: true, force: true });
    } finally {
      // Security: reuse creation-time-verified cleanup if an assertion interrupts the first pass.
      await runner.close();
    }
  }, 60_000);
});
