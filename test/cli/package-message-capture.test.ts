import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { PackageMessageCapture } from "../support/package-message-capture.js";

it("does not restart a failed producer and awaits owned process disposal", async () => {
  const root = await mkdtemp(join(tmpdir(), "package-capture-failure-"));
  const captures = new PackageMessageCapture();
  try {
    await expect(captures.capture("pinned", root, [{ id: "invalid", pinnedArgs: ["not-a-package-command"] }], 0)).rejects.toThrow("package capture closed");
    expect(captures.producerLaunches).toBe(1);
    await expect(captures.capture("pinned", root, [{ id: "valid", pinnedArgs: ["list"] }], 0)).rejects.toThrow("package capture closed");
    expect(captures.producerLaunches).toBe(1);
  } finally {
    await captures.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
