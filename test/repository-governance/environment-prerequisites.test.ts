import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  advisories,
  blockingFailures,
  CARGO_RANGE,
  evaluatePrerequisites,
  formatFailures,
  formatReport,
  parseVersion,
  satisfiesRange,
} from "../../scripts/development/environment-prerequisites.mjs";

const readyMsvc = { status: "ready", source: "discovered", compiler: "cl.exe", linker: "link.exe", ready: true };

const ready = {
  platform: "linux",
  node: "v24.4.0",
  engines: ">=22.19.0 <25",
  packageManager: "npm@11.13.0",
  npm: "11.13.0",
  git: "2.53.0",
  githubCli: "2.63.0",
  cargo: "1.90.0",
  rustc: "1.90.0",
  dependencies: { present: true, declared: 21, missing: [], mismatched: [] },
};

const checkFor = (observation: Record<string, unknown>, id: string) =>
  evaluatePrerequisites({ ...ready, ...observation }).find(check => check.id === id);

describe("build environment prerequisites", () => {
  it.each([
    ["v24.4.0", ">=22.19.0 <25", true],
    ["v22.19.0", ">=22.19.0 <25", true],
    ["v22.18.9", ">=22.19.0 <25", false],
    ["v25.0.0", ">=22.19.0 <25", false],
    ["v26.1.0", ">=22.19.0 <25", false],
    ["1.85.0", ">=1.85", true],
    ["1.84.2", ">=1.85", false],
    ["1.90", ">=1.85", true],
  ])("decides whether %s satisfies %s", (version, range, expected) => {
    expect(satisfiesRange(version, range)).toBe(expected);
  });

  it.each([["1.90.0", [1, 90, 0]], ["2.53.0", [2, 53, 0]], ["v26.1.0", [26, 1, 0]], ["1.85", [1, 85, 0]], ["24", [24, 0, 0]]])(
    "reads %j as a version", (token, expected) => {
      expect(parseVersion(token)).toEqual(expected);
    });

  it.each([[""], ["none"], [null], [">=1.2.3"], ["cargo 1.90.0"]])("reads no version out of %j", token => {
    expect(parseVersion(token)).toBeNull();
  });

  it("clears a machine that satisfies every contract", () => {
    const checks = evaluatePrerequisites(ready);
    expect(blockingFailures(checks)).toEqual([]);
    expect(advisories(checks)).toEqual([]);
    expect(formatReport(checks, "@scope/pkg")).toContain("All prerequisites satisfied.");
  });

  it("names an absent node_modules as the reason nothing can resolve", () => {
    const check = checkFor({ dependencies: { present: false, declared: 21, missing: ["semver"], mismatched: [] } }, "dependencies");
    expect(check).toMatchObject({ satisfied: false, severity: "required", remedy: "npm ci" });
    expect(check?.detail).toContain("node_modules is absent");
  });

  it.each([
    [{ missing: ["semver", "undici"], mismatched: [] }, "2 declared dependencies are not installed: semver, undici"],
    [{ missing: [], mismatched: [{ name: "semver", expected: "7.8.5", actual: "7.7.0" }] }, "node_modules is stale: semver 7.7.0 installed, 7.8.5 declared"],
  ])("blocks on an incomplete install %#", (dependencies, detail) => {
    const check = checkFor({ dependencies: { present: true, declared: 21, ...dependencies } }, "dependencies");
    expect(check).toMatchObject({ satisfied: false, severity: "required", detail, remedy: "npm ci" });
  });

  it("counts the unlisted remainder rather than printing every missing package", () => {
    const missing = ["a", "b", "c", "d", "e", "f", "g"];
    const check = checkFor({ dependencies: { present: true, declared: 21, missing, mismatched: [] } }, "dependencies");
    expect(check?.detail).toBe("7 declared dependencies are not installed: a, b, c, d, e, and 2 more");
  });

  it.each([
    ["win32", "winget install Rustlang.Rustup"],
    ["darwin", "https://sh.rustup.rs"],
    ["linux", "https://sh.rustup.rs"],
  ])("offers the %s install command when cargo is absent", (platform, remedy) => {
    const check = checkFor({ platform, cargo: null }, "cargo");
    expect(check).toMatchObject({ satisfied: false, severity: "required" });
    expect(check?.detail).toContain("native addons");
    expect(check?.remedy).toContain(remedy);
  });

  it("blocks on a Cargo older than the declared contract", () => {
    const check = checkFor({ cargo: "1.84.0" }, "cargo");
    expect(check).toMatchObject({ satisfied: false, severity: "required", detail: `cargo 1.84.0 is older than the required ${CARGO_RANGE}`, remedy: "rustup update stable" });
  });

  it.each([["rustc", { rustc: null }], ["git", { git: null }]])("blocks when %s is absent", (id, observation) => {
    expect(checkFor(observation, id)).toMatchObject({ satisfied: false, severity: "required" });
  });

  it("repairs a half-installed Rust toolchain with rustup rather than a fresh install", () => {
    expect(checkFor({ rustc: null }, "rustc")).toMatchObject({ remedy: "rustup toolchain install stable" });
  });

  it("points a machine with no Rust at one toolchain install for both tools", () => {
    const checks = evaluatePrerequisites({ ...ready, platform: "win32", cargo: null, rustc: null, msvc: readyMsvc });
    const remedies = blockingFailures(checks).filter(check => ["cargo", "rustc"].includes(check.id)).map(check => check.remedy);
    expect(new Set(remedies).size).toBe(1);
    expect(remedies[0]).toContain("winget install Rustlang.Rustup");
  });

  it("reports automatically initialized Rust and Microsoft tools as ready", () => {
    const checks = evaluatePrerequisites({
      ...ready, platform: "win32", cargoSource: "rustup", rustcSource: "rustup", msvc: readyMsvc,
    });
    expect(checks.find(check => check.id === "cargo")?.detail).toContain("canonical Rustup location");
    expect(checks.find(check => check.id === "msvc")?.detail).toContain("initialized automatically");
    expect(blockingFailures(checks)).toEqual([]);
  });

  it.each([
    ["missing-workload", "Desktop development with C++ workload"],
    ["missing-installation", "Visual Studio Code is not the required compiler"],
    ["probe-failed", "Visual Studio discovery failed"],
    ["initialization-failed", "could not be initialized"],
  ])("blocks before compilation when MSVC is %s", (status, detail) => {
    const check = checkFor({ platform: "win32", msvc: { status, source: "vswhere", probeStatus: "timeout" } }, "msvc");
    expect(check).toMatchObject({ satisfied: false, severity: "required" });
    expect(check?.detail).toContain(detail);
    expect(check?.remedy).toContain("npm run build");
    expect(JSON.stringify(check)).not.toContain("must-not-appear-in-diagnostics");
  });

  it("fails an invalid explicit Rust override by name", () => {
    expect(checkFor({ cargo: null, cargoResolution: "invalid-override" }, "cargo")).toMatchObject({
      detail: "the explicit CARGO executable does not exist or cannot be resolved",
      remedy: "fix or remove CARGO, then rerun `npm run build`",
    });
  });

  it("reports an absent GitHub CLI without blocking the build that does not need it", () => {
    const checks = evaluatePrerequisites({ ...ready, platform: "win32", githubCli: null, msvc: readyMsvc });
    expect(blockingFailures(checks)).toEqual([]);
    expect(advisories(checks)).toMatchObject([{ id: "gh", remedy: "winget install GitHub.cli, then run gh auth login" }]);
  });

  it("reports an out-of-contract Node without blocking the build", () => {
    const checks = evaluatePrerequisites({ ...ready, node: "v26.1.0" });
    expect(blockingFailures(checks)).toEqual([]);
    expect(advisories(checks)).toMatchObject([{ id: "node", detail: "v26.1.0 is outside the declared engine contract >=22.19.0 <25" }]);
  });

  it("reports an npm major that does not match packageManager without blocking the build", () => {
    const checks = evaluatePrerequisites({ ...ready, npm: "10.9.0" });
    expect(blockingFailures(checks)).toEqual([]);
    expect(advisories(checks)).toMatchObject([{ id: "npm", remedy: "npm install --global npm@11" }]);
  });

  it("accepts an undetermined npm rather than inventing a mismatch", () => {
    expect(checkFor({ npm: null }, "npm")).toMatchObject({ satisfied: true });
  });

  it("states every unmet blocker and the ordered Windows setup sequence", () => {
    const checks = evaluatePrerequisites({ ...ready, cargo: null, node: "v26.1.0", platform: "win32", msvc: { status: "missing-workload", source: "vswhere" } });
    const failures = formatFailures(checks);
    expect(failures).toContain("Rust toolchain: cargo was not found");
    expect(failures).toContain("fix: install Rustup with `winget install Rustlang.Rustup`");
    expect(failures).toContain("Windows native setup order:");
    expect(failures).toContain("3. Rerun `npm run build` from the same shell.");
    expect(failures).toContain("npm run doctor");
    expect(failures).not.toContain("outside the declared engine contract");
  });

  it("summarises blocking and advisory counts separately", () => {
    const report = formatReport(evaluatePrerequisites({ ...ready, cargo: null, node: "v26.1.0" }), "@scope/pkg");
    expect(report).toContain("1 blocking prerequisite unmet, 1 advisory.");
    expect(report).toContain("FAIL  Rust toolchain");
    expect(report).toContain("warn  Node.js");
  });
});

describe("environment prerequisite wiring", () => {
  it("checks the environment through dependency-free orchestration and exposes a standalone report command", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    expect(manifest.scripts.build).toBe("node scripts/development/run-build.mjs");
    expect(manifest.scripts["build:core"]).toBe("node scripts/development/run-build.mjs --core");
    expect(manifest.scripts.doctor).toBe("node scripts/development/check-environment.mjs --report");
  });

  it("keeps the check usable before node_modules exists", async () => {
    for (const path of [
      "scripts/development/check-environment.mjs",
      "scripts/development/environment-prerequisites.mjs",
      "scripts/development/native-build-environment.mjs",
      "scripts/development/run-build.mjs",
    ]) {
      const source = await readFile(path, "utf8");
      for (const specifier of [...source.matchAll(/^import .*? from "([^"]+)";$/gmu)].map(match => match[1])) {
        expect(specifier, `${path} imports ${specifier}`).toMatch(/^(?:node:|\.\/)/u);
      }
    }
  });
});
