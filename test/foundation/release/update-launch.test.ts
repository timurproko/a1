import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runBootstrap } from "../../../src/foundation/release/bootstrap.js";
import { CohortStateStore } from "../../../src/foundation/release/cohort-state.js";
import { selectSupervisorLaunchReleaseId, selectUpdateLaunchRelease } from "../../../src/foundation/release/update-launch.js";
import { UpdateTransactionStore, type UpdateTransactionPhase } from "../../../src/foundation/release/update-transaction.js";
import { materializeRelease, readCertifiedReleaseManifest, type MaterializedRelease } from "../../../src/foundation/release/release-store.js";
import { resolveCohortEndpoint, resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";
import { readLaunchContext } from "../../../src/foundation/launch-context/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/server.js";
import { spawn } from "node:child_process";

// Invariant: exercise actual bootstrap selection and live endpoint authentication without
// launching a terminal, running npm, or reading/writing the user's installed release.
vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("../../../src/foundation/release/release-store.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/release-store.js")>(),
  materializeRelease: vi.fn(),
  readCertifiedReleaseManifest: vi.fn(),
  resolveReleaseEntryPoint: vi.fn(async (release: MaterializedRelease, entry: string) => resolve(release.releaseRoot, entry)),
}));

let root: string;
let environment: NodeJS.ProcessEnv;
let store: CohortStateStore;
let journal: UpdateTransactionStore;
let previous: MaterializedRelease;
let target: MaterializedRelease;
const servers: SupervisorServer[] = [];
const sockets: string[] = [];

beforeEach(async () => {
  vi.clearAllMocks();
  root = await mkdtemp(resolve(tmpdir(), "a1-update-launch-"));
  environment = { A1_DATA_DIR: root, A1_RUNTIME_DIR: resolve(root, "runtime") };
  previous = release("1.0.0", "a");
  target = release("1.1.0", "b");
  store = new CohortStateStore(root);
  journal = new UpdateTransactionStore(root);
  for (const value of [previous, target]) {
    await store.recordCandidate(value);
    await store.approve(value.releaseId, resolve(root, "certification.json"));
    await store.activate(value.releaseId);
    const paths = resolveProductPaths(environment);
    const cohort = resolveCohortEndpoint(paths, value.releaseId, environment);
    // Platform: keep Unix test sockets below the host path-length limit.
    const endpoint = process.platform === "win32" ? cohort.endpoint : resolve(tmpdir(), `a1-ul-${randomUUID().slice(0, 8)}.sock`);
    if (process.platform !== "win32") sockets.push(endpoint);
    const server = new SupervisorServer(new ControlStore(":memory:", randomUUID()), { ...paths, ...cohort, endpoint }, value);
    servers.push(server);
    await server.listen();
  }
  vi.mocked(readCertifiedReleaseManifest).mockImplementation(async expected => expected.releaseId === previous.releaseId ? previous : target);
  vi.mocked(materializeRelease).mockRejectedValue(new Error("must not inspect the mutable installation during an update"));
  vi.mocked(spawn).mockImplementation((...arguments_: unknown[]) => {
    const args = arguments_[1] as string[];
    expect(args[0]).toContain("guardian.js");
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0, null));
    return child as ReturnType<typeof spawn>;
  });
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()));
  await Promise.all(sockets.splice(0).map(path => rm(path, { force: true })));
  await rm(root, { recursive: true, force: true });
});

const phases: UpdateTransactionPhase[] = ["shutdown-intent", "ownership-released", "package-installed", "materialized", "certified", "active-reference-committed", "supervisor-verified"];

describe("launch selection across update completion", () => {
  it.each(phases)("launches the previous release without reading npm's tree during %s", async phase => {
    await begin();
    await journal.advance(phase);
    // Invariant: the active selector can already name the candidate; the journal remains authoritative.
    expect((await store.read()).references.active).toBe(target.releaseId);
    expect(selectSupervisorLaunchReleaseId(await store.read(), await journal.read())).toBeNull();
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(previous.releaseId);
    expect(materializeRelease).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledOnce();
  });

  it.each(["failed", "rolled-back"] as const)("does not promote installed candidate bytes after an update is %s", async status => {
    await begin();
    await journal.advance("active-reference-committed");
    await journal.finish(status, "verification failed");
    expect(selectSupervisorLaunchReleaseId(await store.read(), await journal.read())).toBe(previous.releaseId);
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(previous.releaseId);
    expect(materializeRelease).not.toHaveBeenCalled();
  });

  it.each([false, true])("launches the target only after success (journal removed: %s)", async removeJournal => {
    await begin();
    await journal.advance("supervisor-verified");
    await journal.finish("completed");
    if (removeJournal) await journal.clearCompleted();
    expect(selectSupervisorLaunchReleaseId(await store.read(), await journal.read())).toBe(target.releaseId);
    await mkdir(target.packageRoot, { recursive: true });
    await writeFile(resolve(target.packageRoot, "package.json"), JSON.stringify({ version: target.packageVersion }));
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(target.releaseId);
    expect(materializeRelease).not.toHaveBeenCalled();
  });

  it("starts the previous supervisor when no previous session is running during the update", async () => {
    await begin();
    await servers[0]!.close();
    vi.mocked(spawn).mockImplementationOnce((...arguments_: unknown[]) => {
      const args = arguments_[1] as string[];
      expect(args[0]).toBe(resolve(previous.releaseRoot, "bin/supervisor.js"));
      const child = Object.assign(new EventEmitter(), { unref() {} });
      const paths = resolveProductPaths(environment);
      const cohort = resolveCohortEndpoint(paths, previous.releaseId, environment);
      const server = new SupervisorServer(new ControlStore(":memory:", "restarted"), { ...paths, ...cohort }, previous);
      servers.push(server);
      queueMicrotask(() => { void server.listen().then(() => child.emit("spawn"), error => child.emit("error", error)); });
      return child as ReturnType<typeof spawn>;
    });
    await expect(bootstrap()).resolves.toBe(0);
    expect(selectedRelease()).toBe(previous.releaseId);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(materializeRelease).not.toHaveBeenCalled();
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

function bootstrap() {
  return runBootstrap({ packageRoot: target.packageRoot, environment, scheduleMaintenance: async () => {} });
}

function selectedRelease(): string | undefined {
  const call = vi.mocked(spawn).mock.calls.at(-1)!;
  return readLaunchContext((call[2] as { env: NodeJS.ProcessEnv }).env).releaseId;
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
