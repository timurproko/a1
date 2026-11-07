import { EventEmitter } from "node:events";
import { writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { runBootstrap } from "../../../src/foundation/release/bootstrap.js";
import { CohortStateStore } from "../../../src/foundation/release/cohort-state.js";
import { selectUpdateLaunchRelease } from "../../../src/foundation/release/update-launch.js";
import { UpdateTransactionStore, type UpdateTransactionPhase } from "../../../src/foundation/release/update-transaction.js";
import { materializeRelease, readCertifiedReleaseManifest, type MaterializedRelease } from "../../../src/foundation/release/release-store.js";
import { readLaunchContext } from "../../../src/foundation/launch-context/index.js";
import { spawn } from "node:child_process";

// Invariant: exercise actual bootstrap selection and the attached UI child's lifecycle without
// launching a terminal, running npm, or reading/writing the user's installed release.
vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
// Rationale: certified restart evidence is covered by its own tests; here it vouches for the fixture records.
vi.mock("../../../src/foundation/release/restart-certification.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/restart-certification.js")>(),
  readRestartCertifiedRelease: vi.fn(async (record: { releaseId: string }) => record.releaseId === previous.releaseId ? previous : target),
}));
// Rationale: the real reset writes terminal controls to this test's stdout; keep the protocol, drop the bytes.
vi.mock("../../../src/foundation/terminal-cleanup/index.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../src/foundation/terminal-cleanup/index.js")>();
  return {
    ...actual,
    restoreAfterOwnedExit: (owns: boolean, code: number | null, signal: string | null) => actual.restoreAfterOwnedExit(owns, code, signal, () => {}),
    deliverExitNotice: (path: string, write: (text: string) => void) => actual.deliverExitNotice(path, write, () => {}),
  };
});
vi.mock("../../../src/foundation/release/release-store.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/release-store.js")>(),
  assertCertifiedFilesPresent: vi.fn(async () => {}),
  materializeRelease: vi.fn(),
  readCertifiedReleaseManifest: vi.fn(),
  repairMaterializedRelease: vi.fn(),
  resolveReleaseEntryPoint: vi.fn(async (release: MaterializedRelease, entry: string) => resolve(release.releaseRoot, entry)),
}));

let root: string;
let environment: NodeJS.ProcessEnv;
let store: CohortStateStore;
let journal: UpdateTransactionStore;
let previous: MaterializedRelease;
let target: MaterializedRelease;

beforeEach(async () => {
  vi.clearAllMocks();
  root = await mkdtemp(resolve(tmpdir(), "a1-update-launch-"));
  environment = {
    [PRODUCT_IDENTITY.environment.dataDir]: root,
    [PRODUCT_IDENTITY.environment.runtimeDir]: resolve(root, "runtime"),
  };
  previous = release("1.0.0", "a");
  target = release("1.1.0", "b");
  store = new CohortStateStore(root);
  journal = new UpdateTransactionStore(root);
  for (const value of [previous, target]) {
    await store.recordCandidate(value);
    await store.approve(value.releaseId, resolve(root, "certification.json"));
    await store.activate(value.releaseId);
  }
  vi.mocked(readCertifiedReleaseManifest).mockImplementation(async expected => expected.releaseId === previous.releaseId ? previous : target);
  vi.mocked(materializeRelease).mockRejectedValue(new Error("must not inspect the mutable installation during an update"));
  vi.mocked(spawn).mockImplementation((...arguments_: unknown[]) => {
    const args = arguments_[1] as string[];
    expect(basename(args[0]!)).toBe("ui.js");
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0, null));
    return child as ReturnType<typeof spawn>;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

const phases: UpdateTransactionPhase[] = ["shutdown-intent", "ownership-released", "package-installed", "materialized", "certified", "active-reference-committed"];

describe("launch selection across update completion", () => {
  it.each(phases)("launches the previous release without reading npm's tree during %s", async phase => {
    await begin();
    await journal.advance(phase);
    // Invariant: the active selector can already name the candidate; the journal remains authoritative.
    expect((await store.read()).references.active).toBe(target.releaseId);
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(previous.releaseId);
    expect(materializeRelease).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledOnce();
  });

  it.each(["failed", "rolled-back"] as const)("does not promote installed candidate bytes after an update is %s", async status => {
    await begin();
    await journal.advance("active-reference-committed");
    await journal.finish(status, "verification failed");
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(previous.releaseId);
    expect(materializeRelease).not.toHaveBeenCalled();
  });

  it.each([false, true])("launches the target only after success (journal removed: %s)", async removeJournal => {
    await begin();
    await journal.advance("active-reference-committed");
    await journal.finish("completed");
    if (removeJournal) await journal.clearCompleted();
    await mkdir(target.packageRoot, { recursive: true });
    await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(target.releaseId);
    expect(materializeRelease).not.toHaveBeenCalled();
  });

  it("keeps ordinary launch on a newer active release when invoked from an older installation", async () => {
    await mkdir(previous.packageRoot, { recursive: true });
    await writeFile(resolve(previous.packageRoot, "package.json"), JSON.stringify({ version: previous.packageVersion }));
    vi.mocked(materializeRelease).mockResolvedValueOnce(previous);

    await expect(bootstrap()).resolves.toBe(0);

    expect(selectedRelease()).toBe(target.releaseId);
    expect((await store.read()).references.active).toBe(target.releaseId);
    expect(materializeRelease).toHaveBeenCalledOnce();
  });

  it("activates a newer installed release for an ordinary launch", async () => {
    await store.activate(previous.releaseId);
    await mkdir(target.packageRoot, { recursive: true });
    await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
    vi.mocked(materializeRelease).mockResolvedValueOnce(target);

    await expect(bootstrap()).resolves.toBe(0);

    expect(selectedRelease()).toBe(target.releaseId);
    expect((await store.read()).references).toMatchObject({ active: target.releaseId, rollback: previous.releaseId });
  });

  it("returns the UI's exit code once and prints nothing after a clean exit", async () => {
    await installedTarget();
    const errors = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.mocked(spawn).mockImplementationOnce((...arguments_: unknown[]) => {
      const options = arguments_[2] as { env: NodeJS.ProcessEnv; stdio: unknown[] };
      expect(options.stdio).toEqual(["inherit", "inherit", "inherit", "ipc"]);
      expect(options.env[PRODUCT_IDENTITY.environment.exitNoticePath]).toBeTruthy();
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("close", 0, null));
      return child as ReturnType<typeof spawn>;
    });

    await expect(bootstrap()).resolves.toBe(0);
    expect(spawn).toHaveBeenCalledOnce();
    expect(errors).not.toHaveBeenCalled();
  });

  it("delivers the armed notice when the UI exits uncleanly and returns a failing status", async () => {
    await installedTarget();
    const errors = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    let noticePath = "";
    vi.mocked(spawn).mockImplementationOnce((...arguments_: unknown[]) => {
      noticePath = (arguments_[2] as { env: NodeJS.ProcessEnv }).env[PRODUCT_IDENTITY.environment.exitNoticePath]!;
      // Invariant: the UI armed its notice and died before it could remove it.
      writeFileSync(noticePath, "a1 stopped unexpectedly.\nResume with a1 --session abc\n");
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("close", null, "SIGKILL"));
      return child as ReturnType<typeof spawn>;
    });

    await expect(bootstrap()).resolves.toBe(1);
    expect(errors.mock.calls.map(call => String(call[0])).join("")).toBe("\na1 stopped unexpectedly.\nResume with a1 --session abc\n");
    await expect(import("node:fs/promises").then(fs => fs.lstat(noticePath))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("runs two concurrent launches independently, each with its own notice path", async () => {
    await installedTarget();
    const noticePaths: string[] = [];
    const children: EventEmitter[] = [];
    vi.mocked(spawn).mockImplementation((...arguments_: unknown[]) => {
      noticePaths.push((arguments_[2] as { env: NodeJS.ProcessEnv }).env[PRODUCT_IDENTITY.environment.exitNoticePath]!);
      const child = new EventEmitter();
      children.push(child);
      return child as ReturnType<typeof spawn>;
    });

    const first = bootstrap();
    const second = bootstrap();
    await vi.waitFor(() => expect(children).toHaveLength(2), { timeout: 15_000 });
    children[1]!.emit("close", 3, null);
    await expect(second).resolves.toBe(3);
    children[0]!.emit("close", 0, null);
    await expect(first).resolves.toBe(0);
    expect(new Set(noticePaths).size).toBe(2);
    expect(vi.mocked(spawn).mock.calls.map(call => readLaunchContext((call[2] as { env: NodeJS.ProcessEnv }).env).releaseId))
      .toEqual([target.releaseId, target.releaseId]);
  });

  it("silently reselects once when admission reports a concurrent release handoff", async () => {
    await mkdir(target.packageRoot, { recursive: true });
    await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
    const output: string[] = [];
    vi.mocked(spawn).mockImplementationOnce(() => {
      const child = new EventEmitter();
      queueMicrotask(() => {
        child.emit("message", { type: "a1-release-reselection" });
        child.emit("close", 1, null);
      });
      return child as ReturnType<typeof spawn>;
    });

    await expect(runBootstrap({
      packageRoot: target.packageRoot,
      environment,
      scheduleMaintenance: async () => {},
      output: { write: message => { output.push(String(message)); return true; } },
    })).resolves.toBe(0);

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(output).toEqual([]);
    expect(selectedRelease()).toBe(target.releaseId);
  });

  it("bounds repeated release handoffs and reports one concise failure", async () => {
    await mkdir(target.packageRoot, { recursive: true });
    await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
    const output: string[] = [];
    vi.mocked(spawn).mockImplementation(() => {
      const child = new EventEmitter();
      queueMicrotask(() => {
        child.emit("message", { type: "a1-release-reselection" });
        child.emit("close", 1, null);
      });
      return child as ReturnType<typeof spawn>;
    });

    await expect(runBootstrap({
      packageRoot: target.packageRoot,
      environment,
      scheduleMaintenance: async () => {},
      output: { write: message => { output.push(String(message)); return true; } },
    })).resolves.toBe(1);

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatch(/could not converge/);
    expect(output[0]).not.toMatch(/no longer the release|restart|close|delete/i);
  });

  it("rechecks the transaction if an update begins while package materialization is in flight", async () => {
    await store.activate(previous.releaseId);
    await mkdir(target.packageRoot, { recursive: true });
    await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
    vi.mocked(materializeRelease).mockImplementationOnce(async () => {
      await begin();
      return target;
    });
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(previous.releaseId);
    expect((await store.read()).references.active).toBe(previous.releaseId);
    expect(materializeRelease).toHaveBeenCalledOnce();
  });

  it("fails safely when an unfinished update has no approved previous launch authority", async () => {
    await journal.begin({ channel: "stable", targetVersion: target.packageVersion, packageRoot: target.packageRoot, priorActiveReleaseId: null });
    await expect(bootstrap()).rejects.toThrow("no verified previous release");
    expect(spawn).not.toHaveBeenCalled();
    expect(materializeRelease).not.toHaveBeenCalled();
  });

  it("does not accept a missing or unapproved prior release from the journal", async () => {
    const transaction = await begin();
    const state = await store.read();
    expect(() => selectUpdateLaunchRelease({ ...state, releases: {} }, transaction)).toThrow("no verified previous release");
    const prior = state.releases[previous.releaseId]!;
    expect(() => selectUpdateLaunchRelease({ ...state, releases: { ...state.releases, [previous.releaseId]: { ...prior, approval: "candidate" } } }, transaction))
      .toThrow("no verified previous release");
  });
});

function begin() {
  return journal.begin({ channel: "stable", targetVersion: target.packageVersion, packageRoot: target.packageRoot, priorActiveReleaseId: previous.releaseId });
}

async function installedTarget() {
  await mkdir(target.packageRoot, { recursive: true });
  await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
}

function bootstrap() {
  return runBootstrap({ packageRoot: target.packageRoot, environment, scheduleMaintenance: async () => {} });
}

function selectedLaunchContext() {
  const call = vi.mocked(spawn).mock.calls.at(-1)!;
  return readLaunchContext((call[2] as { env: NodeJS.ProcessEnv }).env);
}

function selectedRelease(): string | undefined {
  return selectedLaunchContext().releaseId;
}

function release(version: string, digestByte: string): MaterializedRelease {
  const contentDigest = digestByte.repeat(64);
  const releaseId = `${version}-${contentDigest.slice(0, 20)}`;
  return {
    packageName: "@timurproko/a1", packageVersion: version, launchContract: "neutral-launch-v1",
    contentDigest, releaseId, packageRoot: resolve(root, "package"),
    releaseRoot: resolve(root, "releases", releaseId), files: [],
  };
}
