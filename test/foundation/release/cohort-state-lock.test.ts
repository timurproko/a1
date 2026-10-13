import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CohortStateStore } from "../../../src/foundation/release/index.js";

vi.mock("node:fs/promises", async importOriginal => ({ ...await importOriginal<typeof fs>() }));
const roots: string[] = [];
const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
afterEach(async () => {
  vi.restoreAllMocks();
  Object.defineProperty(process, "platform", platform);
  await Promise.all(roots.splice(0).map(path => fs.rm(path, { recursive: true, force: true })));
});

/** Fail the first lock-file open with `code`, as Windows does while another holder is still deleting it. */
async function storeWithLockFailure(code: string, target: NodeJS.Platform) {
  const root = await fs.mkdtemp(resolve(tmpdir(), "a1-cohort-lock-"));
  roots.push(root);
  Object.defineProperty(process, "platform", { ...platform, value: target });
  const open = fs.open;
  let injected = 0;
  vi.spyOn(fs, "open").mockImplementation(async (path, ...rest) => {
    if (String(path).endsWith(".lock") && injected === 0) {
      injected += 1;
      throw Object.assign(new Error(`injected ${code}`), { code });
    }
    return await open(path, ...rest);
  });
  return { store: new CohortStateStore(root), injected: () => injected };
}

describe("cohort state lock contention", () => {
  it.each(["EPERM", "EACCES"])("retries a Windows %s from a lock file that is still being released", async code => {
    const { store, injected } = await storeWithLockFailure(code, "win32");

    const state = await store.update(current => current);

    expect(injected()).toBe(1);
    expect(state.revision).toBe(1);
  });

  it("keeps EPERM fatal outside Windows", async () => {
    const { store } = await storeWithLockFailure("EPERM", "linux");

    await expect(store.update(current => current)).rejects.toMatchObject({ code: "EPERM" });
  });
});
