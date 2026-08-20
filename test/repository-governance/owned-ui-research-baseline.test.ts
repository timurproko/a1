import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface ResearchBaseline {
  readonly schema: string;
  readonly recordedAt: string;
  readonly change: string;
  readonly sources: {
    readonly v2Prototype: {
      readonly path: string;
      readonly gitRevision: string | null;
      readonly fragilityFindings: readonly string[];
      readonly reuseDecision: string;
    };
    readonly ohMyPi: {
      readonly path: string;
      readonly gitRevision: string;
      readonly workingTree: string;
      readonly license: { readonly spdx: string; readonly sha256: string };
      readonly adoptedPatterns: readonly string[];
      readonly rejectedScope: readonly string[];
    };
    readonly piPublicPackage: {
      readonly version: string;
      readonly license: string;
      readonly publicIntegrationSurfaces: readonly string[];
      readonly forbiddenIntegrationSurfaces: readonly string[];
    };
  };
  readonly futurePortPolicy: {
    readonly allowedOnlyWhenOwnershipIsRequired: boolean;
    readonly requiredRecordFields: readonly string[];
    readonly forbidden: readonly string[];
  };
}

describe("owned UI research baseline policy", () => {
  it("records versions, licenses, adopted patterns, rejected scope, and port provenance requirements", async () => {
    const value = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/owned-ui-research-baseline.json",
      "utf8",
    )) as ResearchBaseline;

    expect(value.schema).toBe("a1-owned-ui-research-baseline-v1");
    expect(value.change).toBe("build-owned-pi-ui-foundation");
    expect(Number.isFinite(Date.parse(value.recordedAt))).toBe(true);
    expect(value.sources.v2Prototype.gitRevision).toBeNull();
    expect(value.sources.v2Prototype.fragilityFindings.length).toBeGreaterThanOrEqual(4);
    expect(value.sources.v2Prototype.reuseDecision).toContain("Do not port");
    expect(value.sources.ohMyPi.gitRevision).toMatch(/^[a-f0-9]{40}$/);
    expect(value.sources.ohMyPi.workingTree).toBe("dirty-local-edits-excluded");
    expect(value.sources.ohMyPi.license.spdx).toBe("MIT");
    expect(value.sources.ohMyPi.license.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(value.sources.ohMyPi.adoptedPatterns.length).toBeGreaterThanOrEqual(5);
    expect(value.sources.ohMyPi.rejectedScope).toContain("Bun-only runtime and Bun APIs");
    expect(value.sources.piPublicPackage.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(value.sources.piPublicPackage.license).toBe("MIT");
    expect(value.sources.piPublicPackage.publicIntegrationSurfaces.join(" ")).toContain("createAgentSessionRuntime");
    expect(value.sources.piPublicPackage.forbiddenIntegrationSurfaces.join(" ")).toContain("private renderer state");
    expect(value.futurePortPolicy.allowedOnlyWhenOwnershipIsRequired).toBe(true);
    for (const field of ["exact revision or package version", "license and copyright attribution", "local conformance tests"]) {
      expect(value.futurePortPolicy.requiredRecordFields).toContain(field);
    }
    expect(value.futurePortPolicy.forbidden.join(" ")).toContain("unrecorded ports");
  });
});
