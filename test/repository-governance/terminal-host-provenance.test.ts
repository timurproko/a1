import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("terminal-host provenance policy", () => {
  it("accepts the pinned console-component provenance evidence", () => {
    const result = spawnSync(process.execPath, ["scripts/governance/check-terminal-host-provenance.mjs"], { encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("Terminal host provenance OK");
  });

  it("binds current proof records to the renamed native artifact", async () => {
    const [task51, task53] = await Promise.all([
      readFile("openspec/changes/evolve-bare-a1-into-multi-agent-workspace/evidence/terminal-host-task-5-1.json", "utf8").then(JSON.parse),
      readFile("openspec/changes/evolve-bare-a1-into-multi-agent-workspace/evidence/terminal-host-task-5-3.json", "utf8").then(JSON.parse),
    ]) as [
      { schema: string; artifact: { path: string; sha256: string; sizeBytes: number } },
      { schema: string; artifact: { path: string; sha256: string; sizeBytes: number }; identityObservation: { schema: string } },
    ];
    const artifact = task51.artifact;

    expect(task51.schema).toBe("a1-terminal-host-task-5-1-v1");
    expect(task53.schema).toBe("a1-terminal-host-task-5-3-v1");
    expect(task53.identityObservation?.schema).toBe("a1-terminal-host-hot-path-v1");
    expect(task53.artifact).toEqual(artifact);
    expect(artifact.path).toMatch(/terminal-host\.exe$/);
    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.sizeBytes).toBeGreaterThan(0);
  });

  it("rejects desktop-app requirements, missing components, dirty sources, and premature builds", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-terminal-provenance-"));
    roots.push(root);
    const evidence = {
      schema: "a1-terminal-host-provenance-v1",
      change: "evolve-bare-a1-into-multi-agent-workspace",
      hostMode: "native-window",
      desktopApplicationRequired: true,
      sources: [{
        name: "libghostty-vt",
        commit: "wrong",
        license: "AGPL-3.0-or-later",
        cleanSourceTree: false,
      }],
      excludedStacks: [],
      buildPrerequisites: {
        language: "Rust",
        guiSdkRequired: true,
        openGlRequired: true,
        win32WindowRuntimeRequired: true,
        isolatedPhysicalWorkerRequired: false,
      },
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
    const result = spawnSync(process.execPath, [resolve("scripts/governance/check-terminal-host-provenance.mjs"), "--evidence", path], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("host mode must remain console-inside-existing-terminal");
    expect(result.stderr).toContain("desktop application must not be required");
    expect(result.stderr).toContain("exactly three component records");
    expect(result.stderr).toContain("license must be MIT");
    expect(result.stderr).toContain("source tree must be clean");
    expect(result.stderr).toContain("GUI SDK must not be required");
    expect(result.stderr).toContain("OpenGL must not be required");
    expect(result.stderr).toContain("Win32 window runtime must not be required");
  });
});
