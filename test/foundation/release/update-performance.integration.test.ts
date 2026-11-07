import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertUpdatePerformanceBudget,
  certifyMaterializedRelease,
  ReleaseStateStore,
  materializeRelease,
  type ReleaseContentOperationEvent,
} from "../../../src/foundation/release/index.js";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("packaged update activation performance", () => {
  it("activates a large payload with one source read and one product-or-layer write per selected file", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-performance-"));
    roots.push(root);
    const dataDir = resolve(root, "data");
    const operations: ReleaseContentOperationEvent[] = [];
    const startedAt = performance.now();
    {
      let excludedFiles = 0;
      let excludedBytes = 0;
      const release = await materializeRelease(repository, dataDir, {
        onOperation: event => operations.push(event),
        onRuntimeInventory: inventory => { excludedFiles = inventory.excludedFiles; excludedBytes = inventory.excludedBytes; },
      });
      expect(release.dependencyLayers).toHaveLength(1);
      const diagnostics = await certifyMaterializedRelease(release, dataDir, { onOperation: event => operations.push(event) });
      const state = new ReleaseStateStore(dataDir);
      await state.recordCandidate(release);
      await state.approve(release.releaseId, diagnostics);
      await state.activate(release.releaseId);

      const durationMs = performance.now() - startedAt;
      const counts = operationCounts(operations);
      const fileCount = release.files.length + counts.layerWrites;
      expect(counts.sourceReads).toBe(fileCount);
      expect(counts.candidateWrites).toBe(release.files.length);
      expect(counts.layerWrites).toBeGreaterThan(1_000);
      expect(counts.verificationReads).toBe(0);
      expect(excludedFiles).toBeGreaterThan(1_000);
      expect(excludedBytes).toBeGreaterThan(1_000);
      assertUpdatePerformanceBudget({
        fileCount,
        ...counts,
        payloadExcludedFiles: excludedFiles,
        payloadExcludedBytes: excludedBytes,
        postNpmDurationMs: durationMs,
      }, process.platform === "win32" ? 30_000 : Number.POSITIVE_INFINITY);
      expect((await state.read()).references).toMatchObject({ active: release.releaseId, pending: null });
    }
  }, 60_000);

  it("reports the exact operation or duration that exceeds the release budget", () => {
    expect(() => assertUpdatePerformanceBudget({
      fileCount: 10_000,
      sourceReads: 20_000,
      candidateWrites: 10_001,
      verificationReads: 10_000,
      postNpmDurationMs: 30_001,
    })).toThrow(/source payload read count is 20000.*runtime payload write count is 10001.*fresh certification reread 10000.*took 30001ms/);
  });

  it("keeps bare launch free of installation output after update activation", async () => {
    const source = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(source).not.toContain("onProgress:");
    expect(source).not.toMatch(/installing .* files/);
    expect(source.indexOf("await readCertifiedReleaseManifest")).toBeLessThan(source.indexOf("candidate = await materializeRelease"));
  });
});

function operationCounts(events: readonly ReleaseContentOperationEvent[]) {
  return {
    sourceReads: events.filter(event => event.operation === "source-read").length,
    candidateWrites: events.filter(event => event.operation === "candidate-write").length,
    layerWrites: events.filter(event => event.operation === "layer-write").length,
    layerReusedFiles: events.filter(event => event.operation === "layer-reuse").length,
    layerReusedBytes: events.filter(event => event.operation === "layer-reuse").reduce((total, event) => total + event.bytes, 0),
    verificationReads: events.filter(event => event.operation === "verification-read").length,
  };
}
