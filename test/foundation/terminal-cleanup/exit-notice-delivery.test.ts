import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverExitNotice } from "../../../src/foundation/terminal-cleanup/index.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function noticePath(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "a1-exit-notice-")); roots.push(root);
  return join(root, "instance.notice");
}

describe("launcher exit-notice delivery", () => {
  it("does nothing after a clean exit removed the notice", async () => {
    const write = vi.fn(), restore = vi.fn();
    expect(deliverExitNotice(await noticePath(), write, restore)).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });

  it("restores the terminal, prints an armed notice as plain text, and consumes it", async () => {
    const path = await noticePath();
    await writeFile(path, "a1 was stopped unexpectedly.\nTo resume this session: a1 --session 01a1\u001b[31m\n");
    const write = vi.fn(), restore = vi.fn();
    expect(deliverExitNotice(path, write, restore)).toBe(true);
    expect(restore).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledExactlyOnceWith("\na1 was stopped unexpectedly.\nTo resume this session: a1 --session 01a1[31m\n");
    expect(existsSync(path)).toBe(false);
    expect(deliverExitNotice(path, write, restore)).toBe(false);
  });

  it("ignores an oversized or empty notice without printing", async () => {
    const path = await noticePath();
    await writeFile(path, "x".repeat(5000));
    const write = vi.fn();
    expect(deliverExitNotice(path, write, () => {})).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(existsSync(path)).toBe(false);
  });
});
