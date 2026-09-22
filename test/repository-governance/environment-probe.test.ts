import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { locateExecutable, probeVersion, PROBE_TIMEOUT_MS } from "../../scripts/development/environment-probe.mjs";
import { advisories, blockingFailures, evaluatePrerequisites, formatFailures } from "../../scripts/development/environment-prerequisites.mjs";

const executable = resolve("fixture tool", "rustc.EXE");
const locate = () => executable;

describe("build prerequisite executable probes", () => {
  it("resolves quoted Windows PATH entries and PATHEXT without invoking a shell", () => {
    const directory = resolve("fixture tool");
    const found = locateExecutable("rustc", { platform: "win32", env: { PATH: `"${directory}"`, PATHEXT: ".CMD;.EXE" },
      exists: (path: string) => path === executable });
    expect(found).toBe(executable);
  });

  it("does not spawn when the executable is missing", () => {
    const spawn = vi.fn();
    expect(probeVersion("rustc", { locate: () => null, spawn })).toEqual({ version: null, status: "missing" });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("retains the deadline and directly executes binaries with argument vectors", () => {
    const spawn = vi.fn(() => ({ status: 0, stdout: "rustc 1.90.0 (fixture)" }));
    expect(probeVersion("rustc", { locate, spawn })).toEqual({ status: "ok", version: "1.90.0" });
    expect(spawn).toHaveBeenCalledExactlyOnceWith(executable, ["--version"],
      { encoding: "utf8", windowsHide: true, timeout: 15000, shell: false });
    expect(PROBE_TIMEOUT_MS).toBe(15000);
  });

  it("quotes a Windows shim with only the literal version argument", () => {
    const shim = resolve("fixture tool", "npm.cmd");
    const spawn = vi.fn(() => ({ status: 0, stdout: "11.13.0" }));
    expect(probeVersion("npm", { locate: () => shim, spawn }).version).toBe("11.13.0");
    expect(spawn).toHaveBeenCalledExactlyOnceWith(`"${shim}" --version`,
      { encoding: "utf8", windowsHide: true, timeout: 15000, shell: true });
  });

  it.each([
    [{ error: { code: "ETIMEDOUT" }, status: null }, "timeout", "timed out after 15000ms"],
    [{ error: { code: "EACCES" }, status: null }, "spawn-error", "could not start (EACCES)"],
    [{ status: 1 }, "exit", "exit 1"],
    [{ status: null, signal: "SIGTERM" }, "exit", "SIGTERM"],
    [{ status: 0, stdout: "not a version" }, "invalid-version", "no recognizable version"],
  ])("reports an existing but unusable compiler without calling it absent: %s", (result, status, message) => {
    const probe = probeVersion("rustc", { locate, spawn: () => ({ ...result, stderr: "private-output-must-not-leak" }) });
    expect(probe.status).toBe(status);
    const checks = evaluatePrerequisites({ cargo: "1.90.0", rustc: probe.version, probes: { rustc: probe } });
    expect(blockingFailures(checks).find(check => check.id === "rustc")).toMatchObject({ satisfied: false, severity: "required" });
    const diagnostic = checks.find(check => check.id === "rustc")!;
    expect(diagnostic.detail).toContain(message);
    expect(diagnostic.detail).toContain("found on PATH");
    expect(diagnostic.detail).not.toContain("not on PATH");
    expect(diagnostic.remedy).toContain("rustc --version");
    expect(formatFailures(checks)).not.toContain("private-output-must-not-leak");
  });

  it.each(["npm", "gh"])("retains advisory severity when %s cannot execute", command => {
    const checks = evaluatePrerequisites({ probes: { [command]: { version: null, status: "timeout" } } });
    expect(advisories(checks).find(check => check.id === command)?.detail).toContain("timed out");
    expect(blockingFailures(checks).some(check => check.id === command)).toBe(false);
  });

  it("does not echo arbitrary error codes or signal payloads", () => {
    const checks = evaluatePrerequisites({ probes: { rustc: { version: null, status: "spawn-error", code: "private-output-must-not-leak" } } });
    expect(formatFailures(checks)).toContain("could not start (unknown)");
    expect(formatFailures(checks)).not.toContain("private-output-must-not-leak");
  });

  it("can probe a real executable without external dependencies", () => {
    expect(probeVersion("node", { locate: () => process.execPath })).toEqual({ status: "ok", version: process.versions.node });
  });
});

describe("CI Rust preparation", () => {
  it.each([0, 1, 2, 3, 4])("stops at a failed provisioning/version command (failure index %i)", failure => {
    // Security: hermetic shell functions exercise the real script, never the machine's Rust installation.
    const script = `
      count=0
      probe() { count=$((count+1)); printf '%s\\n' "$*"; [ "$count" -ne "${failure}" ]; }
      rustup() { probe rustup "$@"; }
      cargo() { probe cargo "$@"; }
      rustc() { probe rustc "$@"; }
      source scripts/development/prepare-ci-rust.sh
    `;
    const result = spawnSync("bash", ["-c", script], { encoding: "utf8", timeout: 10000 });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(failure === 0 ? 0 : 1);
    const commands = ["rustup toolchain install stable --profile minimal --no-self-update", "rustup default stable", "cargo --version", "rustc --version"];
    expect(result.stdout.trim().split(/\r?\n/u)).toEqual(commands.slice(0, failure || commands.length));
  });

  it.each([
    ["release.yml", "guardians", "npm run build:process-guardian"],
    ["release.yml", "package", "npm ci"],
    ["release.yml", "validate", "npm ci"],
    ["full-regression.yml", "full-regression", "npm ci"],
  ])("prepares Rust before %s/%s builds", (file, job, build) => {
    const workflow = parse(readFileSync(`.github/workflows/${file}`, "utf8"));
    const steps = workflow.jobs[job].steps as Array<{ run?: string; shell?: string; if?: string }>;
    const prepare = steps.findIndex(step => step.run === "bash scripts/development/prepare-ci-rust.sh");
    const compile = steps.findIndex(step => step.run === build);
    expect(prepare).toBeGreaterThanOrEqual(0);
    expect(prepare).toBeLessThan(compile);
    expect(steps[prepare]!.shell).toBe("bash");
    expect(steps[prepare]!.if).toBe(steps[compile]!.if);
  });
});
