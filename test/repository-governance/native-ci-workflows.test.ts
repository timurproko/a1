import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEVELOPMENT_VALIDATION_MATRIX } from "../../scripts/release/validation-matrix.mjs";

async function workflow(name: string) {
  return parse(await readFile(`.github/workflows/${name}.yml`, "utf8"));
}

describe("direct native CI and automatic repair validation", () => {
  it("starts validation on repair pushes and trusted finalization without manual restart", async () => {
    const ci = await workflow("ci");
    const finalization = await workflow("openspec-finalization");
    expect(ci.on.pull_request.branches).toContain("develop");
    expect(ci.on.pull_request.types).toEqual(
      expect.arrayContaining(["synchronize", "edited", "ready_for_review"]),
    );
    expect(finalization.on.pull_request_target.types).toEqual(
      expect.arrayContaining(["synchronize", "edited"]),
    );
    expect(ci.concurrency["cancel-in-progress"]).toBe(true);
    expect(ci.jobs.modular.needs).toContain("changes");
    expect(ci.jobs.required.name).toBe(
      "${{ github.event_name == 'pull_request' && 'Development validation required' || 'Development validation diagnostic' }}",
    );
  });

  it("runs Development native builds, scopes, certificates and fuzzing directly", async () => {
    const job = (await workflow("ci")).jobs.modular;
    const step = (name: string) =>
      job.steps.find((entry: { name?: string }) => entry.name === name);
    expect(step("Install exact dependencies and build").run).toBe("npm ci");
    expect(step("Build the release terminal host into the candidate").run).toBe(
      "npm run build:terminal-host",
    );
    for (const name of [
      "Test and build process guardian fixture addon",
      "Run exact selected scopes",
      "Certify terminal fidelity and resident latency",
      "Run bounded terminal-host decoder fuzzing",
    ]) {
      expect(step(name).shell, name).toBe("bash");
    }
    expect(step("Run exact selected scopes").run).toContain(
      "run-validation-tier.mjs",
    );
    expect(step("Run bounded terminal-host decoder fuzzing").run).toContain(
      "cargo +nightly-2026-10-01 fuzz run",
    );
  });

  it("retains required native partitions, chaos and predecessor target platforms", () => {
    for (const platform of ["win32", "linux", "darwin"]) {
      expect(
        DEVELOPMENT_VALIDATION_MATRIX.filter(
          (entry) => entry.platform === platform && entry.partition,
        ),
      ).toHaveLength(3);
      expect(
        DEVELOPMENT_VALIDATION_MATRIX.some(
          (entry) => entry.platform === platform && entry.terminalHost,
        ),
      ).toBe(true);
      expect(
        DEVELOPMENT_VALIDATION_MATRIX.some(
          (entry) => entry.platform === platform && entry.chaos,
        ),
      ).toBe(true);
    }
  });

  it("pins every Development macOS lane to the current GA native ARM64 image", async () => {
    expect((await workflow("ci")).jobs.modular["runs-on"]).toBe("${{ matrix.os }}");
    const mac = DEVELOPMENT_VALIDATION_MATRIX.filter(entry => entry.platform === "darwin");
    expect(mac).toHaveLength(6);
    for (const entry of mac) {
      expect(entry, entry.label).toMatchObject({ os: "macos-26", architecture: "arm64", node: 24 });
    }
    expect(mac.filter(entry => entry.partition).map(entry => entry.partition)).toEqual(["1/3", "2/3", "3/3"]);
    expect(mac.filter(entry => entry.terminalHost)).toHaveLength(1);
    expect(mac.filter(entry => entry.chaos)).toHaveLength(1);
    expect(mac.filter(entry => entry.group === "containment")).toHaveLength(1);
    const full = (await workflow("full-regression-shared")).jobs["full-regression"];
    expect(full.strategy.matrix.include).toContainEqual({ os: "macos-15", node: 24 });
    expect(await readFile(".github/workflows/publish.yml", "utf8"))
      .toContain("os: [windows-2025, ubuntu-24.04, macos-15]");
  });

  it("pins the SDK before native builds and isolates compiler/test caches by image and SDK", async () => {
    const steps = (await workflow("ci")).jobs.modular.steps;
    const index = steps.findIndex((step: { name?: string }) => step.name === "Pin macOS native SDK");
    const pin = steps[index];
    expect(pin.if).toBe("steps.job-selection.outputs.active == 'true' && runner.os == 'macOS'");
    expect(pin.env.DEVELOPER_DIR).toBe("/Applications/Xcode_26.0.1.app/Contents/Developer");
    for (const name of ["Install exact dependencies and build", "Build the release terminal host into the candidate", "Run exact selected scopes"]) {
      expect(index).toBeLessThan(steps.findIndex((step: { name?: string }) => step.name === name));
    }
    for (const name of ["Set up Zig for the release terminal host", "Set up Zig for terminal host", "Cache process guardian build", "Cache release terminal host build", "Cache terminal host build", "Restore vendored Ghostty VT test result", "Save vendored Ghostty VT test result"]) {
      const step = steps.find((step: { name?: string }) => step.name === name);
      expect(index, name).toBeLessThan(steps.indexOf(step));
      const key = step.with["cache-key"] ?? step.with["shared-key"] ?? step.with.key;
      expect(key, name).toContain("matrix.os");
      expect(key, name).toContain("xcode-26.0.1");
      expect(key, name).toContain("runner.os == 'macOS'");
      expect(key, name).toContain("|| ''");
    }
    const restore = steps.find((step: { name?: string }) => step.name === "Restore vendored Ghostty VT test result");
    const save = steps.find((step: { name?: string }) => step.name === "Save vendored Ghostty VT test result");
    expect(restore.with.key).toBe(save.with.key);
    expect(restore.with.key).toContain("hashFiles('native/terminal-host/vendor/libghostty-vt/**')");
  });

  it("exports the selected SDK with spaces and refuses a missing system-library stub", async () => {
    const pin = (await workflow("ci")).jobs.modular.steps.find((step: { name?: string }) => step.name === "Pin macOS native SDK");
    const root = await mkdtemp(join(tmpdir(), "native-sdk-"));
    try {
      await mkdir(join(root, "developer"));
      await mkdir(join(root, "SDK path", "usr", "lib"), { recursive: true });
      const stub = join(root, "SDK path", "usr", "lib", "libSystem.tbd");
      const environment = join(root, "github-env");
      const commands = 'xcrun() { if [ "$3" = "--show-sdk-path" ]; then printf "%s/SDK path\\n" "$PWD"; else echo 26.0; fi; }; xcodebuild() { echo "Xcode 26.0.1"; };\n';
      const run = () => spawnSync("bash", ["-c", commands + pin.run], {
        cwd: root, encoding: "utf8", env: { ...process.env, DEVELOPER_DIR: "developer", GITHUB_ENV: environment },
      });
      await writeFile(stub, "fixture stub");
      const selected = run();
      expect(selected.error).toBeUndefined();
      expect(selected.status, selected.stderr).toBe(0);
      expect(await readFile(environment, "utf8")).toMatch(/^DEVELOPER_DIR=developer\nSDKROOT=.+\/SDK path\n$/u);
      await rm(stub);
      await writeFile(environment, "");
      expect(run().status).not.toBe(0);
      expect(await readFile(environment, "utf8")).toBe("");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("runs Full regression and publication consumers directly without a fixture environment", async () => {
    const full = (await workflow("full-regression-shared")).jobs;
    const publish = (await workflow("publish")).jobs;
    for (const job of [
      full["full-regression"],
      full["windows-shard"],
      publish.validate_sequential,
      publish.validate_windows_shard,
    ]) {
      expect(job.environment).toBeUndefined();
      expect(
        job.steps.some((step: { run?: string }) => step.run === "npm ci"),
      ).toBe(true);
      const prepare = job.steps.find(
        (step: { name?: string }) => step.name === "Prepare the exact package",
      );
      expect(prepare.shell).toBe("bash");
      expect(prepare.run).toContain("--prepare-exact-package");
      expect(
        job.steps.some((step: { run?: string }) =>
          step.run?.includes("--exact-package-handoff"),
        ),
      ).toBe(true);
    }
    expect(publish.publish.environment).toBe("npm-publish");
  });

  it("has no custom provisioning, fixture receipts or approval dependencies in execution workflows", async () => {
    for (const name of [
      "ci",
      "full-regression",
      "full-regression-shared",
      "publish",
    ]) {
      const source = await readFile(`.github/workflows/${name}.yml`, "utf8");
      expect(source).not.toMatch(
        /run-isolated-native-fixtures|NATIVE_FIXTURE_|native-isolation|native-cleanup|native-security|native-fixture-security-review/u,
      );
    }
    const scripts = await readdir("scripts/development");
    expect(
      scripts.some(
        (name) =>
          name.startsWith("native-fixture-") ||
          name === "run-isolated-native-fixtures.mjs",
      ),
    ).toBe(false);
  });

  it("builds and launches native fixtures without a custom context permission check", async () => {
    for (const file of [
      "native/terminal-host/build.rs",
      "native/terminal-host/src/lib.rs",
      "native/terminal-host/src/roles/entry.rs",
      "native/terminal-host/tests/fixtures/role-host/main.rs",
      "native/terminal-host/tests/fixtures/fake-tab/main.rs",
      "scripts/development/run-terminal-host-probe.mjs",
      "scripts/development/run-resident-chaos.mjs",
      "test/support/resident-predecessor.ts",
    ]) {
      expect(await readFile(file, "utf8"), file).not.toMatch(
        /fixture_policy|requireNativeFixtureContext|NATIVE_FIXTURE_(?:HEAD|BUILT|ISOLATION)/u,
      );
    }
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    expect(pkg.scripts["check:local"]).toBe(
      "npm run typecheck && npm run check:architecture && npm run check:names && vitest run test/repository-governance/native-ci-workflows.test.ts",
    );
  });
});
