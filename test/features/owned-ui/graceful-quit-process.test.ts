import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("owned UI graceful quit process boundary", () => {
  it.each(["slash", "chord"] as const)("restores the terminal and returns to the parent after %s quit", async route => {
    const home = await mkdtemp(resolve(tmpdir(), `a1-graceful-quit-${route}-`));
    roots.push(home);
    const execution = await runFixture(route, home);
    expect(execution.exitCode, execution.stderr).toBe(0);
    const result = JSON.parse(execution.stdout.trim().split(/\r?\n/u).at(-1) ?? "null") as {
      route: string;
      exitCode: number;
      terminalActive: boolean;
      runtimeState: string;
      backendDisposed: boolean;
      altScreenRestored: boolean;
      mouseReportingDisabled: boolean;
      parentShellContinuation: string;
      retainedExtensionHandle: boolean;
    };
    expect(result).toEqual({
      route,
      exitCode: 0,
      terminalActive: false,
      runtimeState: "stopped",
      backendDisposed: true,
      altScreenRestored: true,
      mouseReportingDisabled: true,
      parentShellContinuation: "parent-shell-ready",
      retainedExtensionHandle: true,
    });
  }, 15_000);
});

async function runFixture(route: "slash" | "chord", home: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await new Promise(resolvePromise => {
    execFile(process.execPath, [
      "--import", "tsx",
      resolve("test/fixtures/owned-ui-graceful-quit.ts"),
      route,
      home,
    ], {
      cwd: process.cwd(),
      env: { ...process.env, PI_OFFLINE: "1" },
      timeout: 10_000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      const exitCode = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolvePromise({ exitCode, stdout, stderr });
    });
  });
}
