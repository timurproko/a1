import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import type { MaterializedRelease, SupervisorEndpointMetadata } from "../../../src/foundation/release/index.js";
import { resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { CONTROL_ENVELOPE } from "../../../src/foundation/protocol/index.js";

export function fixtureRelease(): MaterializedRelease {
  const digest = "a".repeat(64);
  return { packageName: "@timurproko/a1", packageVersion: "1.0.0", releaseId: `1.0.0-${digest.slice(0, 20)}`, contentDigest: digest, packageRoot: "/fixture", releaseRoot: "/fixture-release", files: [] };
}

export function fixturePaths(root: string, endpoint?: string) {
  return resolveProductPaths({ A1_DATA_DIR: root, A1_RUNTIME_DIR: resolve(root, "runtime"), A1_ENDPOINT: endpoint ?? (process.platform === "win32"
    ? `\\\\.\\pipe\\a1-recovery-${randomUUID()}` : resolve(tmpdir(), `a1-rc-${randomUUID().slice(0, 8)}.sock`)) });
}

export function fixtureMetadata(overrides: Partial<SupervisorEndpointMetadata> = {}): SupervisorEndpointMetadata {
  const release = fixtureRelease();
  return {
    schema: PRODUCT_IDENTITY.protocol.supervisorSchema, supervisorId: "fixture-supervisor", bootNonce: "fixture-boot",
    pid: process.pid, pidStartIdentity: `${process.pid}:fixture`, startedAt: new Date().toISOString(), endpoint: "missing-fixture-endpoint",
    releaseId: release.releaseId, releaseRoot: release.releaseRoot, contentDigest: release.contentDigest,
    ownership: { state: "busy", liveInstanceIds: ["interrupted-instance"], nonResumableInstanceIds: ["interrupted-instance"], uncertainInstanceIds: [] },
    envelope: CONTROL_ENVELOPE, envelopeRevision: 1, requiredFeatures: [], optionalFeatures: [], contractDigest: "fixture-contract",
    ...overrides,
  };
}
