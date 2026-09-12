import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { certifyMaterializedRelease, ensureSupervisor } from "../../../src/foundation/release/bootstrap.js";
import { CohortStateStore } from "../../../src/foundation/release/cohort-state.js";
import { materializeRelease, type MaterializedRelease } from "../../../src/foundation/release/release-store.js";
import { createUpdateLifecycleCoordinator } from "../../../src/foundation/release/update.js";
import { warmMaterializedRelease } from "../../../src/foundation/release/warmup.js";

// Invariant: use durable cohort state, but substitute expensive package preparation and child
// startup so every activation failure boundary can be exercised without a real installation.
vi.mock("../../../src/foundation/release/bootstrap.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/bootstrap.js")>(),
  certifyMaterializedRelease: vi.fn(async () => "certification.json"),
  ensureSupervisor: vi.fn(),
}));
vi.mock("../../../src/foundation/release/release-store.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/release-store.js")>(),
  materializeRelease: vi.fn(),
}));
vi.mock("../../../src/foundation/release/warmup.js", () => ({ warmMaterializedRelease: vi.fn() }));

const roots: string[] = [];
afterEach(async () => {
  vi.resetAllMocks();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("update candidate activation", () => {
  it.each(["success", "warmup-failure", "supervisor-failure"])("keeps the previous active reference until readiness: %s", async outcome => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-activation-"));
    roots.push(root);
    const previous = release(root, "1.0.0", "a");
    const target = release(root, "1.1.0", "b");
    const store = new CohortStateStore(root);
    await store.recordCandidate(previous);
    await store.approve(previous.releaseId, "previous-certification.json");
    await store.activate(previous.releaseId);
    const phases: string[] = [];
    vi.mocked(materializeRelease).mockResolvedValue(target);
    vi.mocked(certifyMaterializedRelease).mockResolvedValue("target-certification.json");
    vi.mocked(warmMaterializedRelease).mockImplementation(async () => {
      expect((await store.read()).references.active).toBe(previous.releaseId);
      phases.push("warmup");
      if (outcome === "warmup-failure") throw new Error(outcome);
    });
    vi.mocked(ensureSupervisor).mockImplementation(async () => {
      expect((await store.read()).references.active).toBe(previous.releaseId);
      phases.push("readiness");
      if (outcome === "supervisor-failure") throw new Error(outcome);
    });
    const coordinator = createUpdateLifecycleCoordinator({ A1_DATA_DIR: root });
    const activation = coordinator.activateInstalled(target.packageRoot, target.packageVersion, async phase => { phases.push(phase); });
    if (outcome === "success") {
      await activation;
      expect(phases).toEqual(["materialized", "certified", "warmup", "readiness", "active-reference-committed"]);
      expect((await store.read()).references.active).toBe(target.releaseId);
    } else {
      await expect(activation).rejects.toThrow(outcome);
      expect(phases).not.toContain("active-reference-committed");
      expect((await store.read()).references.active).toBe(previous.releaseId);
    }
  });
});

function release(root: string, version: string, digestByte: string): MaterializedRelease {
  const contentDigest = digestByte.repeat(64);
  const releaseId = `${version}-${contentDigest.slice(0, 20)}`;
  return {
    packageName: "@timurproko/a1", packageVersion: version, launchContract: "neutral-launch-v1", contentDigest, releaseId,
    packageRoot: resolve(root, "package"), releaseRoot: resolve(root, "releases", releaseId), files: [],
  };
}
