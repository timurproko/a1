import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("native-host provenance policy", () => {
  it("accepts the pinned MIT source provenance evidence", () => {
    const result = spawnSync(process.execPath, ["scripts/check-native-host-provenance.mjs"], { encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("Native host provenance OK");
  });

  it("rejects missing source pins, non-MIT licensing, dirty sources, and premature binary builds", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-native-provenance-"));
    roots.push(root);
    const evidence = {
      schema: "addone-native-host-provenance-v1",
      change: "evolve-bare-a1-into-multi-agent-workspace",
      sources: [{
        name: "winghostty",
        commit: "6a8353f4ced7124a37993ee2ad08277afa539ae6",
        license: "AGPL-3.0-or-later",
        licenseSha256: "3129de97bc7769d683e52ce02cb4eaecd2b0aab144b09d6325a1b135bdc87cc0",
        cleanSourceTree: false,
      }],
      windowsProofComponents: {
        retainedFromWinghostty: [],
        referenceFromGhostty: [],
        adaptedForAddOne: [],
        forbiddenReplacements: [],
      },
      buildPrerequisites: { zig: "0.14", referenceZig: "0.14", isolatedPhysicalWorkerRequired: false },
      artifactManifestRequirements: [],
      checks: {
        license: "failed",
        provenance: "failed",
        sourceTreeHygiene: "failed",
        binaryBuild: "passed",
        physicalAutomation: "ran",
      },
      passed: false,
    };
    const path = join(root, "invalid.json");
    await writeFile(path, JSON.stringify(evidence));
    const result = spawnSync(process.execPath, [resolve("scripts/check-native-host-provenance.mjs"), "--evidence", path], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exactly two source pins");
    expect(result.stderr).toContain("license must be MIT");
    expect(result.stderr).toContain("source tree must be clean");
    expect(result.stderr).toContain("binary build must remain deferred");
    expect(result.stderr).toContain("physical automation must not run");
  });
});
