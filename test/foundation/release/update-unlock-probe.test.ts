import { mkdir, mkdtemp, open, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PACKAGE_UNLOCK_PATIENCE_MS,
  createUpdateLifecycleCoordinator,
  isPackageLockError,
  lockedPackageDiagnostic,
} from "../../../src/foundation/release/update.js";

const PACKAGE_ROOT = "C:\\prefix\\node_modules\\@timurproko\\a1";
const PROBE = `${PACKAGE_ROOT}.a1-unlock-probe`;
const SILENT = { stdout() {}, stderr() {} };

function lockError(code = "EPERM"): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: operation not permitted, rename`), { code });
}

/**
 * A rename seam whose failures are scripted per call, together with a clock that only moves
 * when the coordinator sleeps, so a test observes the exact wait schedule.
 */
function scriptedProbe(failures: readonly (NodeJS.ErrnoException | null)[]) {
  const renames: [string, string][] = [];
  const sleeps: number[] = [];
  let clock = 0;
  const fileSystem = {
    readFile: async () => "",
    realpath: async (path: string) => path,
    access: async () => {},
    rename: async (from: string, to: string) => {
      renames.push([from, to]);
      const failure = failures[renames.length - 1] ?? null;
      if (failure) throw failure;
    },
  };
  const patience = {
    windowMs: 4_000,
    now: () => clock,
    sleep: async (durationMs: number) => { sleeps.push(durationMs); clock += durationMs; },
  };
  const coordinator = createUpdateLifecycleCoordinator({}, fileSystem, SILENT, patience);
  return { coordinator, renames, sleeps };
}

const alwaysLocked = (count: number) => Array.from({ length: count }, () => lockError());

describe("update package unlock probe", () => {
  it("renames the tree away and back once when nothing holds it", async () => {
    const { coordinator, renames, sleeps } = scriptedProbe([]);
    await coordinator.verifyPackageUnlocked(PACKAGE_ROOT);
    expect(renames).toEqual([[PACKAGE_ROOT, PROBE], [PROBE, PACKAGE_ROOT]]);
    expect(sleeps).toEqual([]);
  });

  it("waits out a holder that lets go within the patience window", async () => {
    const { coordinator, renames, sleeps } = scriptedProbe([lockError(), lockError("EBUSY"), lockError("EACCES"), null, null]);
    await coordinator.verifyPackageUnlocked(PACKAGE_ROOT);
    // Rationale: each failed check is followed by a longer pause, so a brief holder costs little
    // and a slow one is not hammered.
    expect(sleeps).toEqual([100, 200, 400]);
    expect(renames).toHaveLength(5);
    expect(renames.at(-1)).toEqual([PROBE, PACKAGE_ROOT]);
  });

  it("caps the pause between checks and keeps checking until the window closes", async () => {
    const { coordinator, renames, sleeps } = scriptedProbe(alwaysLocked(40));
    await expect(coordinator.verifyPackageUnlocked(PACKAGE_ROOT)).rejects.toThrow(/remained locked for 4s after verified shutdown \(8 checks\)/);
    // Rationale: the pauses grow to the cap and the last one is trimmed so the wait ends exactly
    // when the window closes.
    expect(sleeps).toEqual([100, 200, 400, 800, 1_000, 1_000, 500]);
    // Invariant: the first rename never succeeded, so nothing is ever renamed back.
    expect(renames.every(([from, to]) => from === PACKAGE_ROOT && to === PROBE)).toBe(true);
  });

  it("tells the user what holds the package and that nothing changed", async () => {
    const { coordinator, renames } = scriptedProbe(alwaysLocked(40));
    const failure = await coordinator.verifyPackageUnlocked(PACKAGE_ROOT).catch((error: Error) => error.message);
    expect(failure).toBe(lockedPackageDiagnostic(PACKAGE_ROOT, 4_000, renames.length, lockError()));
    expect(failure).toContain(PACKAGE_ROOT);
    expect(failure).toContain("antivirus scan");
    expect(failure).toContain("run the update again");
    expect(failure).toContain("nothing was changed");
  });

  it("fails at once when the rename error is not a lock", async () => {
    const { coordinator, renames, sleeps } = scriptedProbe([lockError("ENOENT")]);
    await expect(coordinator.verifyPackageUnlocked(PACKAGE_ROOT)).rejects.toThrow(/could not verify that the package is unlocked: ENOENT/);
    expect(renames).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });

  it("waits out a holder that appears while the tree wears the probe name", async () => {
    const { coordinator, renames, sleeps } = scriptedProbe([null, lockError(), lockError(), null]);
    await coordinator.verifyPackageUnlocked(PACKAGE_ROOT);
    expect(sleeps).toEqual([100, 200]);
    expect(renames.slice(1).every(([from, to]) => from === PROBE && to === PACKAGE_ROOT)).toBe(true);
  });

  it("names where the tree is when it cannot be renamed back", async () => {
    const { coordinator } = scriptedProbe([null, ...alwaysLocked(40)]);
    const failure = await coordinator.verifyPackageUnlocked(PACKAGE_ROOT).catch((error: Error) => error.message);
    expect(failure).toContain("could not restore the package");
    expect(failure).toContain(`The package is at ${PROBE}`);
    expect(failure).toContain(`rename it back to ${PACKAGE_ROOT}`);
  });

  it("classifies only the codes a held tree produces as locks", () => {
    for (const code of ["EPERM", "EACCES", "EBUSY", "ENOTEMPTY"]) expect(isPackageLockError(lockError(code))).toBe(true);
    for (const code of ["ENOENT", "EINVAL", "EXDEV"]) expect(isPackageLockError(lockError(code))).toBe(false);
    expect(isPackageLockError(new Error("no code"))).toBe(false);
    expect(isPackageLockError("EPERM")).toBe(false);
  });

  it("waits long enough by default for the holders seen in the field", () => {
    // Rationale: the failure that motivated this arrived within two seconds of a session ending;
    // fifteen seconds outlasts a scan or a shutting-down process tree without feeling hung.
    expect(PACKAGE_UNLOCK_PATIENCE_MS).toBe(15_000);
  });
});

describe("update package unlock probe against the real filesystem", () => {
  const roots: string[] = [];
  afterEach(async () => {
    for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
  });

  async function packageFixture(): Promise<{ scope: string; packageRoot: string }> {
    const root = await mkdtemp(join(tmpdir(), "a1-unlock-probe-"));
    roots.push(root);
    const scope = join(root, "node_modules", "@timurproko");
    const packageRoot = join(scope, "a1");
    await mkdir(join(packageRoot, "dist"), { recursive: true });
    await writeFile(join(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "0.0.0" }));
    await writeFile(join(packageRoot, "dist", "index.js"), "export {};\n");
    return { scope, packageRoot };
  }

  it("passes and leaves the tree under its own name", async () => {
    const { scope, packageRoot } = await packageFixture();
    const coordinator = createUpdateLifecycleCoordinator({}, undefined, SILENT, { windowMs: 1_000 });
    await coordinator.verifyPackageUnlocked(packageRoot);
    expect(await readdir(scope)).toEqual(["a1"]);
  });

  // Platform: only Windows refuses to rename a directory while a file under it is open, which is
  // the exact condition the probe exists to detect, so the lock itself can only be staged there.
  it.runIf(process.platform === "win32")("outlasts an open file handle that is released during the wait", async () => {
    const { scope, packageRoot } = await packageFixture();
    const handle = await open(join(packageRoot, "dist", "index.js"), "r");
    const sleeps: number[] = [];
    const coordinator = createUpdateLifecycleCoordinator({}, undefined, SILENT, {
      windowMs: 5_000,
      sleep: async durationMs => {
        sleeps.push(durationMs);
        // Rationale: the holder lets go on the second check, which is what a scanner or a process
        // finishing its exit looks like from the updater's side.
        if (sleeps.length === 2) await handle.close();
      },
    });
    try {
      await coordinator.verifyPackageUnlocked(packageRoot);
    } finally {
      await handle.close().catch(() => {});
    }
    expect(sleeps).toEqual([100, 200]);
    expect(await readdir(scope)).toEqual(["a1"]);
  });

  it.runIf(process.platform === "win32")("reports a holder that never lets go without moving the tree", async () => {
    const { scope, packageRoot } = await packageFixture();
    const handle = await open(join(packageRoot, "package.json"), "r");
    const coordinator = createUpdateLifecycleCoordinator({}, undefined, SILENT, { windowMs: 300 });
    try {
      await expect(coordinator.verifyPackageUnlocked(packageRoot)).rejects.toThrow(/remained locked for 1s after verified shutdown/);
    } finally {
      await handle.close();
    }
    expect(await readdir(scope)).toEqual(["a1"]);
  });
});
