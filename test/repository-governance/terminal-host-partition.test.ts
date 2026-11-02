import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { cargoCommand, parsePartition, partitionRoleTests, performanceBuildArguments, roleTestNames } from "../../scripts/development/run-terminal-host-probe.mjs";
import { ownerTargetJobs } from "../../scripts/release/require-modular-validation.mjs";
import { DEVELOPMENT_VALIDATION_MATRIX, TERMINAL_HOST_TEST_PARTITIONS } from "../../scripts/release/validation-matrix.mjs";

describe("terminal-host role test partitions", () => {
  it("builds performance certificates with shipping optimization and every fixture control", async () => {
    expect(performanceBuildArguments("fixture/Cargo.toml")).toEqual([
      "build", "--release", "--locked", "--manifest-path", "fixture/Cargo.toml", "--lib", "--features",
      "node-addon,resident-fixtures,fault-injection",
    ]);
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain('host=".artifacts/terminal-host/performance/${{ matrix.terminalHostAddon }}"');
    const probe = await readFile("scripts/development/run-terminal-host-probe.mjs", "utf8");
    expect(probe).toContain('const debugAddon = resolve(".artifacts/terminal-host/terminal-host.node")');
    expect(probe.indexOf("run(cargo, performanceBuildArguments(manifest)"))
      .toBeGreaterThan(probe.indexOf('resolve("scripts/release/verify-native-artifacts.mjs")'));
  });

  it("keeps release-isolation integration in the main native lane when role partitions run elsewhere", async () => {
    const probe = await readFile("scripts/development/run-terminal-host-probe.mjs", "utf8");
    const start = probe.indexOf("if (partition?.skip)");
    const branch = probe.slice(start, probe.indexOf("} else {", start));
    expect(branch).toContain('"--test", "release_isolation", "--features", ROLE_TEST_FEATURES');
  });

  it("reads every #[test] function of the role integration suite from its source", async () => {
    const names = roleTestNames(await readFile("native/terminal-host/tests/role_integration.rs", "utf8"));
    expect(names.length).toBeGreaterThanOrEqual(20);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("server_holder_and_attach_survive_client_loss_and_retain_output");
    expect(names).toContain("maintenance_stop_terminates_a_hung_holder_only_by_its_verified_identity");
    expect(roleTestNames("#[test]\n#[cfg(unix)]\nfn only_here() {}\n#[test] fn second_one(){}")).toEqual(["only_here", "second_one"]);
    expect(() => roleTestNames("fn helper() {}")).toThrow(/no #\[test\]/u);
    expect(() => roleTestNames("#[test]\nfn twice() {}\n#[test]\nfn twice() {}")).toThrow(/duplicate/u);
  });

  it("resolves Cargo through the prepared PATH unless an explicit override is supplied", () => {
    expect(cargoCommand({})).toBe("cargo");
    expect(cargoCommand({ CARGO: "/opt/rust/bin/cargo" })).toBe("/opt/rust/bin/cargo");
  });

  it("parses partition selectors and refuses malformed ones", () => {
    expect(parsePartition(undefined)).toBeNull();
    expect(parsePartition("")).toBeNull();
    expect(parsePartition("none")).toEqual({ skip: true });
    expect(parsePartition("2/3")).toEqual({ index: 2, count: 3 });
    for (const value of ["0/3", "4/3", "1/0", "a/b", "1", "1/3/5", " 1/3"]) expect(() => parsePartition(value), value).toThrow(/invalid|exceeds/u);
  });

  it("assigns every test to exactly one non-empty partition regardless of source order", async () => {
    const names = roleTestNames(await readFile("native/terminal-host/tests/role_integration.rs", "utf8"));
    const partitions = Array.from({ length: TERMINAL_HOST_TEST_PARTITIONS }, (_value, offset) => partitionRoleTests(names, { index: offset + 1, count: TERMINAL_HOST_TEST_PARTITIONS }));
    const union = partitions.flat();
    expect(union).toHaveLength(names.length);
    expect([...union].sort()).toEqual([...names].sort());
    for (const partition of partitions) expect(partition.length).toBeGreaterThan(0);
    expect(partitionRoleTests([...names].reverse(), { index: 1, count: 3 })).toEqual(partitions[0]);
    expect(() => partitionRoleTests(["a", "b"], { index: 3, count: 3 })).toThrow(/selects no test/u);
  });

  it("schedules three partition jobs beside each terminal-host build job and expects all of them", () => {
    const entries = DEVELOPMENT_VALIDATION_MATRIX as any[];
    const partitions = entries.filter(entry => entry.partition);
    expect(partitions).toHaveLength(3 * TERMINAL_HOST_TEST_PARTITIONS);
    for (const entry of partitions) {
      expect(entry).toMatchObject({ group: "terminal-host", node: 24, build: false, guardian: false, defender: false });
      expect(entry.terminalHost).toBeUndefined();
      expect(entry.chaos).toBeUndefined();
      expect(entry.partition).toMatch(/^[1-3]\/3$/u);
      expect(entry.partitionSlug).toBe(entry.partition.replace("/", "of"));
      expect(entries.some(other => other.group === "terminal-host" && other.terminalHost && other.platform === entry.platform)).toBe(true);
    }
    expect(ownerTargetJobs("terminal-host", "win32")).toEqual([{ job: "terminal-host" }, { job: "terminal-host", partition: "1/3" }, { job: "terminal-host", partition: "2/3" }, { job: "terminal-host", partition: "3/3" }]);
    expect(ownerTargetJobs("resident-chaos", "win32")).toEqual([{ job: "resident-chaos" }]);
    expect(ownerTargetJobs("startup", "win32")).toEqual([{ job: "startup" }]);
  });
});
