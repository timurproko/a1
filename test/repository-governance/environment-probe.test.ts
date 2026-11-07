import { readFileSync } from "node:fs";
import { posix, resolve, win32 } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { locateExecutable, probeVersion, PROBE_TIMEOUT_MS } from "../../scripts/development/environment-probe.mjs";
import { advisories, blockingFailures, evaluatePrerequisites, formatFailures } from "../../scripts/development/environment-prerequisites.mjs";

const executable = resolve("fixture tool", "git.EXE");
const locate = () => executable;

describe("build prerequisite executable probes", () => {
  it("resolves quoted Windows PATH entries and PATHEXT without invoking a shell", () => {
    const directory = win32.resolve("C:\\fixture tool");
    const expected = win32.join(directory, "git.EXE");
    const found = locateExecutable("git", { platform: "win32", env: { PATH: `"${directory}"`, PATHEXT: ".CMD;.EXE" },
      exists: (path: string) => path === expected });
    expect(found).toBe(expected);
  });

  it("resolves POSIX PATH entries with POSIX semantics regardless of the host", () => {
    const expected = posix.join("/opt/fixture tool", "git");
    const found = locateExecutable("git", { platform: "linux", env: { PATH: "/usr/missing:/opt/fixture tool" },
      exists: (path: string) => path === expected });
    expect(found).toBe(expected);
  });

  it("does not spawn when the executable is missing", () => {
    const spawn = vi.fn();
    expect(probeVersion("git", { locate: () => null, spawn })).toEqual({ version: null, status: "missing" });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("retains the deadline and directly executes binaries with argument vectors", () => {
    const spawn = vi.fn(() => ({ status: 0, stdout: "git version 1.90.0 (fixture)" }));
    expect(probeVersion("git", { locate, spawn })).toEqual({ status: "ok", version: "1.90.0" });
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
  ])("reports an existing but unusable tool without calling it absent: %s", (result, status, message) => {
    const probe = probeVersion("git", { locate, spawn: () => ({ ...result, stderr: "private-output-must-not-leak" }) });
    expect(probe.status).toBe(status);
    const checks = evaluatePrerequisites({ git: probe.version, probes: { git: probe } });
    expect(blockingFailures(checks).find(check => check.id === "git")).toMatchObject({ satisfied: false, severity: "required" });
    const diagnostic = checks.find(check => check.id === "git")!;
    expect(diagnostic.detail).toContain(message);
    expect(diagnostic.detail).toContain("found on PATH");
    expect(diagnostic.detail).not.toContain("not on PATH");
    expect(diagnostic.remedy).toContain("git --version");
    expect(formatFailures(checks)).not.toContain("private-output-must-not-leak");
  });

  it.each(["npm", "gh"])("retains advisory severity when %s cannot execute", command => {
    const checks = evaluatePrerequisites({ probes: { [command]: { version: null, status: "timeout" } } });
    expect(advisories(checks).find(check => check.id === command)?.detail).toContain("timed out");
    expect(blockingFailures(checks).some(check => check.id === command)).toBe(false);
  });

  it("does not echo arbitrary error codes or signal payloads", () => {
    const checks = evaluatePrerequisites({ probes: { git: { version: null, status: "spawn-error", code: "private-output-must-not-leak" } } });
    expect(formatFailures(checks)).toContain("could not start (unknown)");
    expect(formatFailures(checks)).not.toContain("private-output-must-not-leak");
  });

  it("can probe a real executable without external dependencies", () => {
    expect(probeVersion("node", { locate: () => process.execPath })).toEqual({ status: "ok", version: process.versions.node });
  });
});

describe("CI native toolchains", () => {
  it.each(["ci.yml", "publish.yml", "full-regression-shared.yml"])("provisions no Rust, Zig, or native build cache in %s", file => {
    const source = readFileSync(`.github/workflows/${file}`, "utf8");
    for (const forbidden of ["prepare-ci-rust", "setup-zig", "rust-cache", "rustup", "cargo ", "build:process-guardian", "build:terminal-host"]) {
      expect(source, `${file} contains ${forbidden}`).not.toContain(forbidden);
    }
  });
});
