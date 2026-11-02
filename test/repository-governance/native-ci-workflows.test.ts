import { readFile, readdir } from "node:fs/promises";
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
