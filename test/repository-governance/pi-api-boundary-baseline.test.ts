import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectPiApiBoundaryBaseline,
  type PiApiBoundaryBaseline,
} from "../../scripts/pi-api-boundary-baseline.mjs";

const repository = resolve(".");
const evidencePath = resolve("evidence/pi-api-boundary/baseline.json");
const checker = resolve("scripts/pi-api-boundary-baseline.mjs");

describe("Pi API boundary baseline evidence", () => {
  it("exactly reproduces the accepted source commit", async () => {
    const recorded = JSON.parse(await readFile(evidencePath, "utf8")) as PiApiBoundaryBaseline & { recordedAt: string };
    const { recordedAt: _recordedAt, ...expected } = recorded;

    expect(recorded.baselineCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(collectPiApiBoundaryBaseline(repository, recorded.baselineCommit)).toEqual(expected);
  });

  it("covers every required pre-migration coupling class", async () => {
    const baseline = JSON.parse(await readFile(evidencePath, "utf8")) as PiApiBoundaryBaseline;

    expect(baseline.dependencyGraph.authorities).toEqual(["package.json", "package-lock.json"]);
    expect(baseline.dependencyGraph.packages).toHaveLength(8);
    expect(new Set(baseline.dependencyGraph.packages.map(record => record.name))).toEqual(new Set([
      "@earendil-works/pi-agent-core",
      "@earendil-works/pi-ai",
      "@earendil-works/pi-client",
      "@earendil-works/pi-coding-agent",
      "@earendil-works/pi-protocol",
      "@earendil-works/pi-telemetry",
      "@earendil-works/pi-tui",
    ]));
    expect(baseline.productionPiImportSites).toHaveLength(48);
    expect(baseline.productionPiImportSites.every(record => record.path.startsWith("src/foundation/pi-"))).toBe(true);
    expect(baseline.packageLayoutReads.map(record => record.path)).toEqual([
      "src/foundation/pi-component-adapter/upstream/components/earendil-announcement.ts",
      "src/foundation/pi-component-adapter/upstream/theme/theme.ts",
      "src/foundation/pi-engine-adapter/adapter.ts",
    ]);
    expect(baseline.reflectedConcreteConstructors.map(record => record.target)).toEqual(["CustomEditor", "FooterComponent"]);
    expect(baseline.featureToAdapterDependencies).toHaveLength(6);
    expect(baseline.featureToAdapterDependencies.every(record => record.feature === "src/features/owned-ui")).toBe(true);
    expect(baseline.sourceDerivedUiUnits).toHaveLength(20);
    expect(baseline.sourceDerivedUiUnits.every(record => record.localDestination.startsWith("src/foundation/pi-component-adapter/upstream/"))).toBe(true);
    expect(baseline.exactOracleResolution).toMatchObject({
      profile: "pi",
      requestedExecutable: "pi",
      binding: "ambient-path",
      selectedDependencyPackage: "@earendil-works/pi-coding-agent",
      selectedDependencyPublicEntry: null,
      selectedDependencyBound: false,
    });
  });

  it("passes the focused command-line governance check", () => {
    const result = spawnSync(process.execPath, [checker, "--check"], {
      cwd: repository,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Pi API boundary baseline OK: 48 imports, 3 package-layout reads, 2 reflected constructors");
  });
});
