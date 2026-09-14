import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dependencyLayerCertificationPath, legacyDependencyLayerCertificationPath, writeDependencyCertification } from "../../../src/foundation/release/dependency-certification.js";

vi.mock("node:fs/promises", async importOriginal => ({ ...await importOriginal<typeof fs>() }));
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(path => fs.rm(path, { recursive: true, force: true })));
});

const identity = { layerId: `dependencies-${"a".repeat(32)}`, contentDigest: "fixture-digest" };
const failure = (code: string) => Object.assign(new Error(`injected ${code}`), { code });

/** Advance only the release backoff clock, yielding to real filesystem work without wall-clock sleeps. */
function releaseClock() {
  let now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void, delay: number) => {
    now += delay;
    return setImmediate(callback) as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
  return () => now;
}

async function fixture() {
  const root = await fs.realpath(await fs.mkdtemp(resolve(tmpdir(), "certification-release-")));
  roots.push(root);
  await writeDependencyCertification(root, identity);
  const path = dependencyLayerCertificationPath(root, identity.layerId);
  const bytes = await fs.readFile(path, "utf8");
  const metadata = await fs.lstat(path, { bigint: true });
  const legacy = legacyDependencyLayerCertificationPath(root, identity.layerId);
  await fs.copyFile(path, legacy);
  await fs.chmod(legacy, 0o400);
  const legacyMetadata = await fs.lstat(legacy, { bigint: true });
  return { root, path, lock: `${path}.lock`, bytes, metadata, legacy, legacyMetadata, publish: () => writeDependencyCertification(root, identity) };
}

async function unchanged(entry: Awaited<ReturnType<typeof fixture>>) {
  expect(await fs.readFile(entry.path, "utf8")).toBe(entry.bytes);
  expect(await fs.readFile(entry.legacy, "utf8")).toBe(entry.bytes);
  for (const [path, before] of [[entry.path, entry.metadata], [entry.legacy, entry.legacyMetadata]] as const) {
    const metadata = await fs.lstat(path, { bigint: true });
    // Invariant: read access may update atime; restart seals bind identity, write metadata, and protection instead.
    for (const key of ["dev", "ino", "size", "mode", "mtimeNs", "ctimeNs", "birthtimeNs"] as const) {
      expect(metadata[key]).toBe(before[key]);
    }
  }
}

describe("dependency certification lease release", () => {
  it.each(["EPERM", "EACCES", "EBUSY"])("retries transient %s retirement and cleanup without rewriting evidence", async code => {
    const entry = await fixture();
    const clock = releaseClock();
    const rename = fs.rename;
    const remove = fs.rm;
    let retirements = 0;
    let cleanups = 0;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(from) === entry.lock && ++retirements <= 2) throw failure(code);
      return rename(from, to);
    });
    vi.spyOn(fs, "rm").mockImplementation(async (path, options) => {
      if (String(path).startsWith(`${entry.lock}.released-`) && ++cleanups <= 2) throw failure(code);
      return remove(path, options);
    });
    await entry.publish();
    expect(retirements).toBe(3);
    expect(cleanups).toBe(3);
    expect(clock()).toBeGreaterThan(0);
    expect(clock()).toBeLessThanOrEqual(1_000);
    await unchanged(entry);
    expect((await fs.readdir(resolve(entry.root, "dependency-certifications"))).filter(name => name.includes(".lock"))).toEqual([]);
  });

  it.each(["retirement", "cleanup"])("bounds persistent %s contention by one shared deadline", async phase => {
    const entry = await fixture();
    const clock = releaseClock();
    const rename = fs.rename;
    const remove = fs.rm;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(from) === entry.lock && (phase === "retirement" || clock() < 600)) throw failure("EPERM");
      return rename(from, to);
    });
    vi.spyOn(fs, "rm").mockImplementation(async (path, options) => {
      if (String(path).startsWith(`${entry.lock}.released-`)) throw failure("EACCES");
      return remove(path, options);
    });
    await expect(entry.publish()).rejects.toThrow(/release.*deadline/i);
    expect(clock()).toBe(1_000);
    await unchanged(entry);
  });

  it("does not retry an unclassified error", async () => {
    const entry = await fixture();
    const clock = releaseClock();
    const rename = fs.rename;
    const error = failure("EIO");
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(from) === entry.lock) throw error;
      return rename(from, to);
    });
    await expect(entry.publish()).rejects.toThrow(/EIO/);
    expect(clock()).toBe(0);
    await unchanged(entry);
  });

  it("retains both publication and release failures", async () => {
    const entry = await fixture();
    await fs.rm(entry.path);
    const rename = fs.rename;
    const publication = failure("ENOSPC");
    const release = failure("EIO");
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(to) === entry.path) throw publication;
      if (String(from) === entry.lock) throw release;
      return rename(from, to);
    });
    await expect(entry.publish()).rejects.toMatchObject({ errors: [publication, expect.objectContaining({ cause: release })] });
  });

  it.each(["missing", "missing-lock", "replacement", "malformed", "linked-lock", "linked-owner"])("refuses %s ownership before retirement", async kind => {
    const entry = await fixture();
    const outside = resolve(entry.root, "outside");
    await fs.mkdir(outside);
    await fs.writeFile(resolve(outside, "owner.json"), "sentinel");
    const rename = fs.rename;
    let retirements = 0;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(from) === entry.lock) retirements += 1;
      await rename(from, to);
      if (String(to) !== entry.lock) return;
      const owner = resolve(entry.lock, "owner.json");
      if (kind === "missing") await fs.rm(owner);
      if (kind === "missing-lock") await fs.rm(entry.lock, { recursive: true });
      if (kind === "replacement") await fs.writeFile(owner, JSON.stringify({ pid: process.pid, token: "other-owner" }));
      if (kind === "malformed") await fs.writeFile(owner, "null");
      if (kind === "linked-lock") {
        await fs.rm(entry.lock, { recursive: true });
        await fs.symlink(outside, entry.lock, process.platform === "win32" ? "junction" : "dir");
      }
      if (kind === "linked-owner") {
        // Platform: a directory link is available without Windows file-symlink privileges and must also be rejected.
        await fs.rm(owner);
        await fs.symlink(outside, owner, process.platform === "win32" ? "junction" : "dir");
      }
    });
    await expect(entry.publish()).rejects.toThrow(/release.*ownership/i);
    expect(retirements).toBe(0);
    expect(await fs.readFile(resolve(outside, "owner.json"), "utf8")).toBe("sentinel");
    await unchanged(entry);
  });

  it("rechecks ownership after contention rather than releasing a replacement", async () => {
    const entry = await fixture();
    releaseClock();
    const rename = fs.rename;
    let retirements = 0;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(from) === entry.lock) {
        retirements += 1;
        await fs.writeFile(resolve(entry.lock, "owner.json"), JSON.stringify({ pid: process.pid, token: "successor" }));
        throw failure("EPERM");
      }
      return rename(from, to);
    });
    await expect(entry.publish()).rejects.toThrow(/release.*ownership/i);
    expect(retirements).toBe(1);
    expect(JSON.parse(await fs.readFile(resolve(entry.lock, "owner.json"), "utf8")).token).toBe("successor");
  });

  it("retains the abandoned tombstone against a delayed reclaimer after replacement acquisition", async () => {
    const entry = await fixture();
    const token = "22222222-2222-4222-8222-222222222222";
    await fs.mkdir(entry.lock);
    await fs.writeFile(resolve(entry.lock, "owner.json"), JSON.stringify({ pid: 999_999, token }));
    const kill = process.kill;
    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid === 999_999) throw failure("ESRCH");
      return kill(pid, signal);
    });
    const rename = fs.rename;
    let delayedReclaims = 0;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (String(to) !== entry.lock) return;
      const ownerBefore = await fs.readFile(resolve(entry.lock, "owner.json"), "utf8");
      // Concurrency: reproduce a second reclaimer's delayed atomic operation using the real filesystem.
      await expect(rename(entry.lock, `${entry.lock}.abandoned-${token}`)).rejects.toBeTruthy();
      delayedReclaims += 1;
      expect(await fs.readFile(resolve(entry.lock, "owner.json"), "utf8")).toBe(ownerBefore);
    });
    await entry.publish();
    expect(delayedReclaims).toBe(1);
    expect(JSON.parse(await fs.readFile(resolve(`${entry.lock}.abandoned-${token}`, "owner.json"), "utf8")).token).toBe(token);
    await unchanged(entry);
  });

  it("cleans only its private retired path after a successor acquires the active path", async () => {
    const entry = await fixture();
    releaseClock();
    const remove = fs.rm;
    let cleanups = 0;
    vi.spyOn(fs, "rm").mockImplementation(async (path, options) => {
      if (String(path).startsWith(`${entry.lock}.released-`) && ++cleanups === 1) {
        await fs.mkdir(entry.lock);
        await fs.writeFile(resolve(entry.lock, "owner.json"), "successor");
        throw failure("EPERM");
      }
      return remove(path, options);
    });
    await entry.publish();
    expect(cleanups).toBe(2);
    expect(await fs.readFile(resolve(entry.lock, "owner.json"), "utf8")).toBe("successor");
    await unchanged(entry);
  });
});
