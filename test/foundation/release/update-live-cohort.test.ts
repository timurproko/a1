import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CohortStateStore,
  createUpdateLifecycleCoordinator,
  emptyState,
  planUpdateOwnership,
  type CohortState,
  type MaterializedRelease,
} from "../../../src/foundation/release/index.js";
import { resolveCohortEndpoint, resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";

const cleanupRoots: string[] = [];
const servers: SupervisorServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close().catch(() => undefined)));
  await Promise.all(cleanupRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

/**
 * A live cohort with the release root the caller asks for: inside the retained release store
 * when it should look like an installed release, outside it when it should look like a session
 * running from the mutable installation.
 */
async function liveCohort(kind: "retained" | "mutable-install") {
  const root = await mkdtemp(resolve(tmpdir(), `a1-update-live-${kind}-`));
  cleanupRoots.push(root);
  const runtimeDir = resolve(root, "runtime");
  const digest = "b".repeat(64);
  const releaseId = `1.2.0-${digest.slice(0, 20)}`;
  const releaseRoot = kind === "retained"
    ? resolve(root, "releases", releaseId)
    : resolve(root, "package");
  await mkdir(releaseRoot, { recursive: true });
  await mkdir(resolve(root, "releases"), { recursive: true });
  const release: MaterializedRelease = {
    packageName: "@timurproko/a1",
    launchContract: "neutral-launch-v1",
    packageVersion: "1.2.0",
    contentDigest: digest,
    releaseId,
    packageRoot: resolve(root, "package"),
    releaseRoot,
    files: [],
  };
  await writeFile(resolve(root, "releases", `${releaseId}.manifest.json`), JSON.stringify(release), { mode: 0o600 });

  const environment = {
    A1_CONFIG_DIR: resolve(root, "config"),
    A1_DATA_DIR: root,
    A1_RUNTIME_DIR: runtimeDir,
    A1_DATABASE_PATH: resolve(root, "control.sqlite3"),
  };
  const paths = resolveProductPaths(environment);
  const cohort = resolveCohortEndpoint(paths, releaseId, environment);
  const endpoint = process.platform === "win32"
    ? `\\\\.\\pipe\\a1-live-${kind}-${process.pid}-${Date.now()}`
    : resolve(tmpdir(), `a1-live-${randomUUID().slice(0, 8)}.sock`);
  if (process.platform !== "win32") cleanupRoots.push(endpoint);

  const timestamp = new Date(0).toISOString();
  // Performance: ownership starts from an already-active snapshot; cohort-state tests cover durable transitions.
  const state = {
    ...emptyState(),
    revision: 3,
    releases: { [releaseId]: {
      releaseId,
      releaseRoot,
      packageVersion: release.packageVersion,
      launchContract: "neutral-launch-v1",
      contentDigest: digest,
      approval: "approved",
      materializedAt: timestamp,
      certifiedAt: timestamp,
      diagnosticsPath: resolve(root, "certification.json"),
    } },
    references: { active: releaseId, pending: null, approved: releaseId, rollback: null, retention: [] },
  } satisfies CohortState;
  await timedPhase("seed-active-release", async () => {
    const stateStore = new CohortStateStore(root);
    await writeFile(stateStore.path, JSON.stringify(state));
    expect(await stateStore.read()).toEqual(state);
  });

  const terminate = vi.fn();
  const server = await timedPhase("create-control-store-and-supervisor", () => {
    // Performance: these tests probe a live endpoint, not disk persistence; retain real isolated SQL state without WAL flushes.
    const store = new ControlStore(":memory:", "boot");
    try {
      return new SupervisorServer(
        store,
        { ...paths, endpoint, endpointMetadataPath: cohort.endpointMetadataPath },
        release,
        "00000000-0000-4000-8000-000000000001",
        terminate,
      );
    } catch (error) {
      store.close();
      throw error;
    }
  });
  servers.push(server);
  await timedPhase("listen-and-publish-endpoint", () => server.listen());
  return { environment, release, cohort, server, terminate };
}

async function timedPhase<T>(phase: string, operation: () => T | Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await operation();
  } finally {
    console.info(JSON.stringify({ fixture: "update-live-cohort", phase, durationMs: Math.round(performance.now() - started) }));
  }
}

describe("update ownership with a live cohort", () => {
  it("leaves a cohort running from a retained release alone", async () => {
    const { environment, cohort, terminate } = await liveCohort("retained");
    const stdout: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator(environment, undefined, {
      stdout: message => stdout.push(message),
      stderr: () => {},
    });

    const result = await timedPhase("probe-and-preserve-owner", () => coordinator.shutdownVerifiedOwners("1.3.0"));

    expect(result.priorActiveVersion).toBe("1.2.0");
    expect(terminate).not.toHaveBeenCalled();
    // Invariant: its endpoint is still published, so its sessions can still reach it.
    expect(JSON.parse(await readFile(cohort.endpointMetadataPath, "utf8"))).toMatchObject({ releaseId: expect.any(String) });
  });

  it("stays silent about the sessions it is leaving alone", async () => {
    const { environment } = await liveCohort("retained");
    const stdout: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator(environment, undefined, {
      stdout: message => stdout.push(message),
      stderr: () => {},
    });

    await timedPhase("probe-and-preserve-owner", () => coordinator.shutdownVerifiedOwners("1.3.0"));

    // Rationale: leaving sessions running is the expected outcome; announcing it would tear the
    // update progress bar, so nothing is written.
    expect(stdout.join("")).toBe("");
  });

  it("plans by where the owner runs from", () => {
    expect(planUpdateOwnership("dead", true)).toBe("clean-dead-record");
    expect(planUpdateOwnership("dead", false)).toBe("clean-dead-record");
    // Invariant: a session on an installed release keeps working; the installation replaces files it
    // does not read.
    expect(planUpdateOwnership("live-verified", true)).toBe("leave-running");
    // Invariant: a session running from the package being replaced cannot be preserved.
    expect(planUpdateOwnership("live-verified", false)).toBe("end-session");
  });
});
