import { ChildProcess } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { executeAbortableFile } from "../../../../src/integrations/pi/engine/abortable-exec-file.js";

describe("abortable subprocess execution", () => {
  it("never asks Node to terminate a child before spawn assigns a positive pid", async () => {
    const observedPids: Array<number | undefined> = [];
    const originalKill = ChildProcess.prototype.kill;
    const kill = vi.spyOn(ChildProcess.prototype, "kill").mockImplementation(function (this: ChildProcess, signal) {
      observedPids.push(this.pid);
      return originalKill.call(this, signal);
    });
    try {
      for (let index = 0; index < 20; index += 1) {
        const controller = new AbortController();
        const result = executeAbortableFile(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
          cwd: join(process.cwd(), `missing-abortable-child-cwd-${index}`),
          signal: controller.signal,
          timeoutMs: 100,
          maxBufferBytes: 1024,
        });
        controller.abort();
        await expect(result).resolves.toBeNull();
      }
    } finally {
      kill.mockRestore();
    }
    expect(observedPids.every(pid => Number.isSafeInteger(pid) && (pid as number) > 0)).toBe(true);
  });

  it("terminates only the positive pid of a spawned child on abort", async () => {
    const observedPids: Array<number | undefined> = [];
    const originalKill = ChildProcess.prototype.kill;
    const kill = vi.spyOn(ChildProcess.prototype, "kill").mockImplementation(function (this: ChildProcess, signal) {
      observedPids.push(this.pid);
      return originalKill.call(this, signal);
    });
    try {
      const controller = new AbortController();
      const result = executeAbortableFile(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
        cwd: process.cwd(),
        signal: controller.signal,
        timeoutMs: 5_000,
        maxBufferBytes: 1024,
      });
      setTimeout(() => controller.abort(), 100);
      await expect(result).resolves.toBeNull();
    } finally {
      kill.mockRestore();
    }
    expect(observedPids.length).toBeGreaterThan(0);
    expect(observedPids.every(pid => Number.isSafeInteger(pid) && (pid as number) > 0)).toBe(true);
  });
});
