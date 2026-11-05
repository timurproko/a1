import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertResidentContinuity, inspectResidentContinuity } from "../../../src/foundation/resident-tabs/continuity.js";
import { assertResidentContinuity as assertPublicContinuity } from "../../../src/foundation/resident-tabs/index.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const context = { releaseRoot: "/candidate", dataDir: "/data", profileRoot: "/profile", runtimeDir: "/runtime", environment: {} };

describe("resident client activation continuity", () => {
  it("exposes lazy inspection through the public owner boundary with caller-owned paths", async () => {
    const inspect = vi.fn(async () => "verified");
    await expect(assertPublicContinuity({ ...context, inspect })).resolves.toBeUndefined();
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(inspect).toHaveBeenNthCalledWith(1,context);
    expect(inspect).toHaveBeenNthCalledWith(2,context);
  });
  it("does not require a native host when no runtime or recovery records exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "continuity-empty-")); roots.push(root);
    await expect(inspectResidentContinuity({ ...context, dataDir: root })).resolves.toBe("empty");
  });
  it.each(["tabs", "resident-workspaces"])("refuses undeclared candidate contracts before executing a host with %s records", async directory => {
    const root = await mkdtemp(join(tmpdir(), "continuity-unsupported-")); roots.push(root);
    const releaseRoot = join(root, "candidate"), dataDir = join(root, "data");
    await mkdir(releaseRoot, { recursive: true }); await mkdir(join(dataDir, directory, "record"), { recursive: true });
    await writeFile(join(releaseRoot, "package.json"), JSON.stringify({ residentControlContracts: ["resident-control-v2"] }));
    await expect(inspectResidentContinuity({ ...context, releaseRoot, dataDir })).rejects.toThrow("stable resident control and workspace contracts");
    expect(await readdir(dataDir)).toEqual([directory]);
  });
  it("requires a stable authenticated source contract set rather than an idle status", async () => {
    const inspect = vi.fn(async () => "authenticated-source-a:epoch-7");
    await expect(assertResidentContinuity({ ...context, inspect })).resolves.toBeUndefined();
    expect(inspect).toHaveBeenCalledTimes(2);
  });
  it("revalidates a newly observed source instead of accepting a stale topology", async () => {
    const inspect = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("a+b").mockResolvedValueOnce("a+b");
    await expect(assertResidentContinuity({ ...context, inspect })).resolves.toBeUndefined();
    expect(inspect).toHaveBeenCalledTimes(3);
  });
  it("refuses an unstable source set without changing the selected client", async () => {
    const inspect = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("a+b").mockResolvedValueOnce("a+c");
    await expect(assertResidentContinuity({ ...context, inspect })).rejects.toThrow("Resident workspace changed during update readiness");
  });
  it("propagates unsupported or unverifiable mandatory control without an optimistic result", async () => {
    const inspect = vi.fn(async () => { throw new Error("unsupported source API"); });
    await expect(assertResidentContinuity({ ...context, inspect })).rejects.toThrow("unsupported source API");
    expect(inspect).toHaveBeenCalledTimes(1);
  });
});
