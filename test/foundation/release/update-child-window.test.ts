import type { SpawnOptions } from "node:child_process";
import { describe, expect, it, vi } from "vitest";

const observed = vi.hoisted(() => ({ options: [] as SpawnOptions[] }));

vi.mock("cross-spawn", async () => {
  const { EventEmitter } = await import("node:events");
  const { PassThrough } = await import("node:stream");
  return {
    default: vi.fn((_command: string, _arguments: readonly string[], options: SpawnOptions) => {
      observed.options.push(options);
      const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() });
      queueMicrotask(() => {
        child.stdout.end();
        child.stderr.end();
        child.emit("close", 0);
      });
      return child;
    }),
  };
});

const { createNpmProcessRunner } = await import("../../../src/foundation/release/update.js");

describe("Windows update child processes", () => {
  it("captures diagnostics without creating a child console window", async () => {
    const runner = createNpmProcessRunner("win32");

    await expect(runner("npm", ["root", "--global"], { captureStdout: true }))
      .resolves.toEqual({ code: 0, stdout: "", stderr: "" });
    expect(observed.options).toEqual([expect.objectContaining({
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })]);
  });
});
