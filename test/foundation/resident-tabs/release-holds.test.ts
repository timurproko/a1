import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readResidentReleaseHolds } from "../../../src/foundation/resident-tabs/release-holds.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function dataDir(records: boolean): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "a1-resident-holds-"));
  roots.push(root);
  if (records) {
    await mkdir(join(root, "tabs", "profile"), { recursive: true });
    await writeFile(join(root, "tabs", "profile", "registry.json"), "{}");
  }
  return root;
}

const verified = async () => undefined;
const rejected = async () => { throw new Error("tampered"); };

describe("resident release holds", () => {
  it("holds nothing and runs nothing when no resident records exist", async () => {
    let ran = 0;
    const report = await readResidentReleaseHolds({
      dataDir: await dataDir(false), releaseRoots: ["/release"], verify: verified,
      run: async () => { ran++; return { code: 0, stdout: "" }; },
    });
    expect(report).toEqual({ complete: true, releaseRoots: [], uncertain: [] });
    expect(ran).toBe(0);
  });

  it("asks the first verified installed terminal host and returns its report", async () => {
    const root = await dataDir(true);
    const checked: string[] = [];
    const calls: string[][] = [];
    const report = await readResidentReleaseHolds({
      dataDir: root, releaseRoots: ["/old", "/new"], platform: "linux", architecture: "x64",
      verify: async executable => { checked.push(executable); if (executable.includes("old")) throw new Error("missing"); },
      run: async (executable, arguments_) => {
        calls.push([executable, ...arguments_]);
        return { code: 0, stdout: JSON.stringify({ schema: "a1-resident-release-holds-v1", complete: true, releaseRoots: ["/new"], uncertain: [] }) };
      },
    });
    expect(report).toEqual({ complete: true, releaseRoots: ["/new"], uncertain: [] });
    expect(checked).toHaveLength(2);
    expect(calls).toEqual([[checked[1], "release-holds", "--data-dir", root]]);
  });

  it("is incomplete without a verified host, on a failed inspection, or on a malformed report", async () => {
    const root = await dataDir(true);
    await expect(readResidentReleaseHolds({ dataDir: root, releaseRoots: ["/r"], verify: rejected }))
      .resolves.toMatchObject({ complete: false, releaseRoots: [] });
    await expect(readResidentReleaseHolds({ dataDir: root, releaseRoots: ["/r"], verify: verified, run: async () => { throw new Error("timeout"); } }))
      .resolves.toMatchObject({ complete: false });
    await expect(readResidentReleaseHolds({ dataDir: root, releaseRoots: ["/r"], verify: verified, run: async () => ({ code: 0, stdout: "{\"complete\":true}" }) }))
      .resolves.toMatchObject({ complete: false });
    await expect(readResidentReleaseHolds({ dataDir: root, releaseRoots: ["/r"], verify: verified, run: async () => ({ code: 1, stdout: "" }) }))
      .resolves.toMatchObject({ complete: false });
  });
});
