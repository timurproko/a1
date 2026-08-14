import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("terminal-host provenance policy", () => {
  it("accepts the pinned console-component provenance evidence", () => {
    const result = spawnSync(process.execPath, ["scripts/check-terminal-host-provenance.mjs"], { encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("Terminal host provenance OK");
  });

  it("rejects desktop-app requirements, missing components, dirty sources, and premature builds", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-terminal-provenance-"));
    roots.push(root);
    const evidence = {
      schema: "addone-terminal-host-provenance-v1",
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
    const result = spawnSync(process.execPath, [resolve("scripts/check-terminal-host-provenance.mjs"), "--evidence", path], { encoding: "utf8" });
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
