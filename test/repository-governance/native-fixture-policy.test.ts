import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEVELOPMENT_VALIDATION_MATRIX } from "../../scripts/release/validation-matrix.mjs";
import { assertNativeFixtureContext, NATIVE_FIXTURE_POLICY, requireNativeFixtureContext } from "../../scripts/development/native-fixture-policy.mjs";

const environment = { GITHUB_ACTIONS: "true", GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "1", GITHUB_SHA: "a".repeat(40), RUNNER_OS: "Windows" };
const receipt = () => ({ schema: NATIVE_FIXTURE_POLICY, head: environment.GITHUB_SHA, runId: "123", runAttempt: "1", environment: "native-fixture-security-review", disposable: true, credentials: "none", egress: "loopback-only", securityReview: "approved", defenderRealtime: true });

describe("native fixture execution interlock", () => {
  it.each([{}, { CI: "1" }, { CI: "true", TERMINAL_HOST_LOCAL_BUILD: "1" }])("refuses workstation contexts even with old build overrides %j", local => {
    expect(() => assertNativeFixtureContext(local, receipt())).toThrow("CI-only");
  });
  it("requires real provisioner evidence instead of synthesizing success from CI variables", async () => {
    await expect(requireNativeFixtureContext(environment)).rejects.toThrow("isolation/review is unavailable");
    expect(() => assertNativeFixtureContext(environment, receipt())).not.toThrow();
  });
  it.each([
    ["head", "b".repeat(40)], ["runId", "124"], ["runAttempt", "2"], ["environment", "unprotected"],
    ["disposable", false], ["credentials", "production"], ["egress", "unrestricted"], ["securityReview", "pending"], ["defenderRealtime", false],
  ])("rejects absent or mismatched %s", (key, value) => {
    expect(() => assertNativeFixtureContext(environment, { ...receipt(), [key]: value })).toThrow("blocked");
    const missing: Record<string, unknown> = receipt(); delete missing[key];
    expect(() => assertNativeFixtureContext(environment, missing)).toThrow("blocked");
  });
  it("binds checkout head separately from a pull request's synthetic merge ref", () => {
    const selected = { ...environment, NATIVE_FIXTURE_HEAD: "b".repeat(40) };
    expect(() => assertNativeFixtureContext(selected, receipt())).toThrow("blocked");
    expect(() => assertNativeFixtureContext(selected, { ...receipt(), head: selected.NATIVE_FIXTURE_HEAD })).not.toThrow();
  });
  it("checks all normal fixture launchers before compilation or native dispatch", async () => {
    for (const [file, entry] of [
      ["scripts/development/run-terminal-host-probe.mjs", "  const cargo ="],
      ["scripts/development/run-resident-chaos.mjs", "async function main()"],
      ["test/support/resident-predecessor.ts", "  const root = await fixture.temporaryRoot"],
    ]) {
      const source = await readFile(file!, "utf8");
      expect(source).toContain("await requireNativeFixtureContext();");
      if (!entry!.startsWith("async")) expect(source.indexOf("await requireNativeFixtureContext();")).toBeLessThan(source.indexOf(entry!));
    }
    const build = await readFile("native/terminal-host/build.rs", "utf8");
    expect(build.indexOf("fixture_policy::require()")).toBeLessThan(build.indexOf("refuse_local_windows_build();"));
    for (const file of ["native/terminal-host/tests/fixtures/role-host/main.rs", "native/terminal-host/tests/fixtures/fake-tab/main.rs", "native/terminal-host/src/roles/entry.rs"]) {
      expect(await readFile(file, "utf8")).toContain("fixture_policy::require()");
    }
  });
  it("gates native CI before build and fails Windows detection before executable artifact upload", async () => {
    const modular = parse(await readFile(".github/workflows/ci.yml", "utf8")).jobs.modular;
    expect(modular.environment).toContain("native-fixture-security-review");
    const names = modular.steps.map((step: { name?: string }) => step.name);
    const gate = names.indexOf("Provision and probe reviewed disposable native fixture isolation");
    expect(gate).toBeGreaterThan(-1); expect(gate).toBeLessThan(names.indexOf("Build managed client and production guardian in the isolated workload"));
    const security = names.indexOf("Fail on Defender detections or lost real-time protection");
    expect(security).toBeLessThan(names.indexOf("Upload terminal host contract artifacts"));
    expect(security).toBeLessThan(names.indexOf("Complete content-free job envelope"));
    const native = DEVELOPMENT_VALIDATION_MATRIX.filter(entry => entry.nativeFixtures);
    expect(native.filter(entry => entry.group === "terminal-host")).toHaveLength(12);
    for (const entry of native.filter(entry => entry.platform === "win32")) expect(entry.defender).toBe(true);
  });
  it("keeps the local entrypoint explicit and free of builds, packs, broad suites and native probes", async () => {
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    expect(pkg.scripts["check:local"]).toBe("npm run typecheck && npm run check:architecture && npm run check:names && vitest run test/repository-governance/native-fixture-policy.test.ts test/repository-governance/native-fixture-isolation.test.ts");
    expect(pkg.scripts["precheck:local"]).toBeUndefined(); expect(pkg.scripts["postcheck:local"]).toBeUndefined();
  });
});
