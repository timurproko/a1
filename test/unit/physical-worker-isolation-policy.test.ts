import { spawnSync } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const smokePath = "test/physical-host/windows/native-ui-smoke.ps1";
const isolationPath = "test/physical-host/windows/physical-worker-isolation.ps1";

describe("physical-host worker isolation policy", () => {
  it("guards the physical smoke before desktop APIs, fragments, or process launch", async () => {
    const source = await readFile(smokePath, "utf8");
    const preflight = source.indexOf("Assert-AddOnePhysicalWorkerIsolation");
    expect(preflight).toBeGreaterThan(0);
    expect(source.indexOf("New-Item -ItemType Directory -Force -Path $FragmentRoot")).toBeGreaterThan(preflight);
    expect(source.indexOf("Add-Type -AssemblyName UIAutomationClient")).toBeGreaterThan(preflight);
    expect(source.indexOf('Start-Process -FilePath "wt.exe"')).toBeGreaterThan(preflight);
    expect(source).toContain('outcome = "blocked"');
    expect(source).toContain("terminalSpawnAttempted = $false");
  });

  it.runIf(process.platform === "win32")("blocks locally before terminal launch when isolation is unproven", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-physical-blocked-"));
    try {
      const result = spawnSync("powershell.exe", [
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", smokePath,
        "-ArtifactRoot", root, "-RepositoryRoot", ".",
      ], {
        encoding: "utf8",
        env: { ...process.env, ADDONE_PHYSICAL_ISOLATION_ATTESTATION: "", ADDONE_PHYSICAL_WORKER_ALLOCATION_ID: "" },
      });
      expect(result.status).toBe(2);
      expect(`${result.stdout}${result.stderr}`).toContain("physical-host isolation is unproven");
      const verdict = JSON.parse((await readFile(resolve(root, "smoke-verdict.json"), "utf8")).replace(/^\uFEFF/, ""));
      expect(verdict).toMatchObject({ outcome: "blocked", isolationVerified: false, terminalSpawnAttempted: false });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("binds a short-lived external attestation to the current worker allocation", async () => {
    const source = await readFile(isolationPath, "utf8");
    expect(source).toContain("attestation must be provisioned outside the repository");
    expect(source).toContain("ADDONE_PHYSICAL_WORKER_ALLOCATION_ID");
    expect(source).toContain("dedicatedDisposableWorker");
    expect(source).toContain("exclusiveInteractiveDesktop");
    expect(source).toContain("userApplicationsAllowed");
    expect(source).toContain("machineName");
    expect(source).toContain("sessionId");
    expect(source).toContain("userSid");
    expect(source).toContain("24-hour allocation limit");
    expect(source).toContain("pre-existing visible applications exist");
  });

  it("requires PID and process-start identity before physical-smoke forced cleanup", async () => {
    const source = await readFile(smokePath, "utf8");
    expect(source).toContain("Get-AddOneProcessStartIdentity");
    expect(source).toContain("Test-AddOneProcessStartIdentity");
    expect(source).toContain("ownershipVerified");
    expect(source).not.toMatch(/(?:taskkill|Get-Process\s+-Name|Stop-Process\s+-Name)/i);
  });

  it("pins the workflow to disposable exclusive-desktop workers without a generic fallback", async () => {
    const source = await readFile(".github/workflows/terminal-baseline.yml", "utf8");
    expect(source).toContain("addone-physical-isolated");
    expect(source).toContain("ephemeral");
    expect(source).toContain("exclusive-desktop");
    expect(source).toContain("Verify isolated physical worker allocation");
    expect(source).toContain("Run isolated Windows physical smoke");
    expect(source).not.toContain("runs-on: [self-hosted, Windows, X64, addone-windows11]\n");
  });
});
