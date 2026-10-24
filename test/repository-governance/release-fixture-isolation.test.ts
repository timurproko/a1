import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { releaseFixture } from "../support/release-command-fixture.js";

describe("real Git release fixture isolation", () => {
  it("creates independent histories, mutable checkouts, refs, and remote repositories", async () => {
    const disposals: (() => Promise<void>)[] = [];
    try {
      const first = await releaseFixture("0.1.8-dev", undefined, dispose => disposals.push(dispose));
      const second = await releaseFixture("0.2.0-dev", undefined, dispose => disposals.push(dispose));
      expect(first.cwd).not.toBe(second.cwd);
      expect(first.remote).not.toBe(second.remote);
      for (const fixture of [first, second]) {
        expect(fixture.git(["rev-parse", "refs/tags/v0.1.7"])).toBe(fixture.baselineHead);
        expect(fixture.git(["rev-parse", "refs/heads/master"])).toBe(fixture.baselineHead);
        expect(fixture.git(["rev-parse", "HEAD"])).toBe(fixture.initialHead);
      }
      await writeFile(join(first.cwd, "unrelated.txt"), "private mutation");
      first.git(["update-ref", "refs/heads/master", first.initialHead]);
      expect(await readFile(join(second.cwd, "unrelated.txt"), "utf8")).toBe("keep this\n");
      expect(second.git(["rev-parse", "refs/heads/master"])).toBe(second.baselineHead);
    } finally { await Promise.all(disposals.map(dispose => dispose())); }
  }, 30_000);

  it("registers cleanup before a setup failure and releases the failed private repository", async () => {
    let dispose: (() => Promise<void>) | undefined;
    // Rationale: identical baseline/current manifests make the second real commit fail with no changes.
    await expect(releaseFixture("0.1.7", undefined, cleanup => { dispose = cleanup; })).rejects.toThrow();
    expect(dispose).toBeDefined();
    await dispose!();
    // Invariant: the callback is safely repeatable after a partial setup failure.
    await expect(dispose!()).resolves.toBeUndefined();
  }, 30_000);
});
