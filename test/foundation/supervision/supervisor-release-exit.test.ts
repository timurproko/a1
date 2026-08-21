import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { releaseVerifiedIdleOwner } from "../../../src/foundation/release/index.js";
import type { SupervisorEndpointMetadata } from "../../../src/foundation/release/index.js";
import type { MaterializedRelease } from "../../../src/foundation/release/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { CONTROL_ENVELOPE } from "../../../src/foundation/protocol/index.js";

const cleanupRoots: string[] = [];
afterEach(async () => Promise.all(cleanupRoots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("supervisor release replacement exit", () => {
  it("falls back to bounded verified idle cleanup when graceful exit exceeds its deadline", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-supervisor-slow-exit-"));
    cleanupRoots.push(root);
    const cleanup = vi.fn(async () => ({ pid: 20740, attempted: ["graceful-termination", "forced-process-tree-termination"], terminated: true, elapsedMs: 1500 }));

    const released = await releaseVerifiedIdleOwner(metadata(), root, {
      waitForExit: async () => { throw new Error("A1 supervisor 20740 did not release process ownership within 3000ms"); },
      cleanup,
    });

    expect(released).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledWith(expect.objectContaining({
      pid: 20740,
      ownership: expect.objectContaining({ state: "idle", liveInstanceIds: [], nonResumableInstanceIds: [], uncertainInstanceIds: [] }),
    }));
  });

  it("terminates the dedicated supervisor only after owned resources close", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-supervisor-release-exit-"));
    cleanupRoots.push(root);
    const runtimeDir = resolve(root, "runtime");
    const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\a1-release-exit-${process.pid}-${Date.now()}` : resolve(tmpdir(), `a1-sre-${randomUUID().slice(0, 8)}.sock`);
    if (process.platform !== "win32") cleanupRoots.push(endpoint);
    const terminate = vi.fn();
    const store = new ControlStore(resolve(root, "control.sqlite3"), "boot");
    const server = new SupervisorServer(
      store,
      {
        configDir: resolve(root, "config"),
        dataDir: root,
        runtimeDir,
        databasePath: resolve(root, "control.sqlite3"),
        endpoint,
        endpointMetadataPath: resolve(runtimeDir, "supervisor.json"),
        supervisorLogPath: resolve(runtimeDir, "supervisor.log"),
      },
      release(),
      "00000000-0000-4000-8000-000000000000",
      terminate,
    );

    await server.listen();
    const endpointRecord = JSON.parse(await readFile(resolve(runtimeDir, "supervisor.json"), "utf8")) as { schema?: unknown };
    expect(endpointRecord.schema).toBe(PRODUCT_IDENTITY.protocol.supervisorSchema);
    await server.closeForReleaseReplacement(false);

    expect(terminate).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledWith(0);
  });
});

function metadata(): SupervisorEndpointMetadata {
  const value = release();
  return {
    schema: PRODUCT_IDENTITY.protocol.supervisorSchema,
    supervisorId: "old-supervisor",
    endpoint: "verified-endpoint",
    pid: 20740,
    pidStartIdentity: "20740:verified-start",
    bootNonce: "verified-boot",
    startedAt: new Date(0).toISOString(),
    releaseId: value.releaseId,
    releaseRoot: value.releaseRoot,
    contentDigest: value.contentDigest,
    ownership: {
      state: "idle",
      liveInstanceIds: [],
      nonResumableInstanceIds: [],
      uncertainInstanceIds: [],
      liveGenerationIds: [],
      nonResumableGenerationIds: [],
    },
    envelope: CONTROL_ENVELOPE,
    envelopeRevision: 1,
    requiredFeatures: [],
    optionalFeatures: [],
    contractDigest: "contract",
  };
}

function release(): MaterializedRelease {
  const digest = "a".repeat(64);
  return {
    packageName: "@timurproko/a1",
    packageVersion: "1.1.0",
    contentDigest: digest,
    releaseId: `1.1.0-${digest.slice(0, 20)}`,
    packageRoot: "/package/1.1.0",
    releaseRoot: "/data/releases/1.1.0",
    files: [],
  };
}
