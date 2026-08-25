import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import {
  assertUpdatePerformanceBudget,
  certifyMaterializedRelease,
  CohortStateStore,
  createUpdateLifecycleCoordinator,
  materializeRelease,
  readEndpointMetadata,
  releaseVerifiedIdleOwner,
  startSupervisor,
  waitForVerifiedEndpoint,
  type ReleaseContentOperationEvent,
} from "../../../src/foundation/release/index.js";
import { resolveCohortEndpoint, resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("packaged update activation performance", () => {
  it("activates a large unchanged-dependency payload with one source read and one candidate write", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-performance-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const runtimeDir = resolve(root, "runtime");
    const environment = {
      ...process.env,
      [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
      [PRODUCT_IDENTITY.environment.runtimeDir]: runtimeDir,
      [PRODUCT_IDENTITY.environment.configDir]: resolve(root, "config"),
      [PRODUCT_IDENTITY.environment.databasePath]: resolve(root, "control.sqlite3"),
    };
    const operations: ReleaseContentOperationEvent[] = [];
    const startedAt = performance.now();
    let release: Awaited<ReturnType<typeof materializeRelease>> | undefined;

    try {
      release = await materializeRelease(repository, dataDir, { onOperation: event => operations.push(event) });
      expect(release.files.length).toBeGreaterThanOrEqual(10_000);
      const diagnostics = await certifyMaterializedRelease(release, dataDir, { onOperation: event => operations.push(event) });
      const state = new CohortStateStore(dataDir);
      await state.recordCandidate(release);
      await state.approve(release.releaseId, diagnostics);
      await state.activate(release.releaseId);
      await startSupervisor(release, environment);
      const cohort = resolveCohortEndpoint(resolveProductPaths(environment), release.releaseId, environment);
      await waitForVerifiedEndpoint(cohort.endpointMetadataPath, release, 8_000);

      const durationMs = performance.now() - startedAt;
      const counts = operationCounts(operations);
      expect(counts).toEqual({
        sourceReads: release.files.length,
        candidateWrites: release.files.length,
        verificationReads: 0,
      });
      assertUpdatePerformanceBudget({
        fileCount: release.files.length,
        ...counts,
        postNpmDurationMs: durationMs,
      }, process.platform === "win32" ? 30_000 : Number.POSITIVE_INFINITY);
      expect(await readEndpointMetadata(cohort.endpointMetadataPath)).toMatchObject({ releaseId: release.releaseId });
      expect((await state.read()).references).toMatchObject({ active: release.releaseId, pending: null });
    } finally {
      if (release) {
        // An update leaves a live cohort alone now, so the supervisor this test started is
        // this test's to stop.
        const cohort = resolveCohortEndpoint(resolveProductPaths(environment), release.releaseId, environment);
        const owner = await readEndpointMetadata(cohort.endpointMetadataPath);
        if (owner) await releaseVerifiedIdleOwner(owner, dataDir).catch(() => {});
        await createUpdateLifecycleCoordinator(environment).shutdownVerifiedOwners(release.packageVersion).catch(() => {});
      }
    }
  }, 60_000);

  it("reports the exact operation or duration that exceeds the release budget", () => {
    expect(() => assertUpdatePerformanceBudget({
      fileCount: 10_000,
      sourceReads: 20_000,
      candidateWrites: 10_001,
      verificationReads: 10_000,
      postNpmDurationMs: 30_001,
    })).toThrow(/source payload read count is 20000.*candidate payload write count is 10001.*fresh certification reread 10000.*took 30001ms/);
  });

  it("keeps bare launch free of installation output after update activation", async () => {
    const source = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(source).not.toContain("onProgress:");
    expect(source).not.toMatch(/installing .* files/);
    expect(source.indexOf("await readCertifiedReleaseManifest")).toBeLessThan(source.indexOf("const candidate = await materializeRelease"));
  });
});

function operationCounts(events: readonly ReleaseContentOperationEvent[]) {
  return {
    sourceReads: events.filter(event => event.operation === "source-read").length,
    candidateWrites: events.filter(event => event.operation === "candidate-write").length,
    verificationReads: events.filter(event => event.operation === "verification-read").length,
  };
}
