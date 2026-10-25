import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Rationale: a probe that stops making progress fails here instead of running into the CI job timeout.
const PROBE_TIMEOUT_MS = 120_000;
const RELEASE_BUILD_TIMEOUT_MS = 900_000;
const ROLE_TEST_FEATURES = "resident-fixtures,fault-injection";
const ROLE_TEST_SOURCE = "native/terminal-host/tests/role_integration.rs";

/**
 * Role-fixture test names in source order, read from the integration test file. The file is the
 * authority CI partitions against, so adding or renaming a test moves it between partitions without
 * any list to maintain; libtest's `--exact` filter then runs exactly the named tests.
 */
export function roleTestNames(source) {
  const names = [];
  const pattern = /#\[test\]\s*(?:#\[[^\]]*\]\s*)*fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gu;
  for (const match of source.matchAll(pattern)) names.push(match[1]);
  if (names.length === 0) throw new Error("no #[test] functions found in the role integration source");
  if (new Set(names).size !== names.length) throw new Error("duplicate role integration test names");
  return names;
}

/** Parse `<index>/<count>` with 1-based index; `none` means the role tests are skipped entirely. */
export function parsePartition(value) {
  if (value === undefined || value === "") return null;
  if (value === "none") return { skip: true };
  const match = /^([1-9]\d*)\/([1-9]\d*)$/u.exec(value);
  if (!match) throw new Error(`invalid terminal-host partition ${JSON.stringify(value)}; expected <index>/<count> or none`);
  const index = Number(match[1]), count = Number(match[2]);
  if (index > count) throw new Error(`terminal-host partition index ${index} exceeds its count ${count}`);
  return { index, count };
}

/** Deterministic round-robin partition over the sorted names: name i belongs to partition (i mod count) + 1. */
export function partitionRoleTests(names, { index, count }) {
  const sorted = [...names].sort();
  const selected = sorted.filter((_name, position) => position % count === index - 1);
  if (selected.length === 0) throw new Error(`terminal-host partition ${index}/${count} selects no test out of ${sorted.length}`);
  return selected;
}

/** Production optimization with fixture controls retained for the same negative-control matrix. */
export function performanceBuildArguments(manifest) {
  return ["build", "--release", "--locked", "--manifest-path", manifest, "--lib", "--features", "node-addon,resident-fixtures,fault-injection"];
}

function partitionFromArguments(argv, env) {
  const flag = argv.indexOf("--partition");
  if (flag >= 0) return parsePartition(argv[flag + 1]);
  if (argv.includes("--skip-role-tests")) return { skip: true };
  return parsePartition(env.TERMINAL_HOST_PARTITION);
}

async function main() {
  const cargo = process.env.CARGO ?? resolve(homedir(), ".cargo", "bin", platform() === "win32" ? "cargo.exe" : "cargo");
  const manifest = resolve("native/terminal-host/Cargo.toml");
  const environment = { ...process.env, ZIG: process.env.ZIG ?? "zig" };
  // Rationale: CI traces each probe step so a stall names the step that did not return.
  if (process.env.CI && environment.A1_PROBE_TRACE === undefined) environment.A1_PROBE_TRACE = "1";
  const partition = partitionFromArguments(process.argv.slice(2), process.env);

  if (partition && !partition.skip) {
    // Concurrency: one partition of the serialized role suite runs here; the other partitions and the
    // builds, probes, addon, and release artifact run on their own runners in the same validation run.
    const selected = partitionRoleTests(roleTestNames(readFileSync(resolve(ROLE_TEST_SOURCE), "utf8")), partition);
    console.log(`terminal-host role tests partition ${partition.index}/${partition.count}: ${selected.join(", ")}`);
    run(cargo, ["test", "--manifest-path", manifest, "--lib", "--features", ROLE_TEST_FEATURES], environment);
    run(cargo, ["test", "--manifest-path", manifest, "--test", "role_integration", "--features", ROLE_TEST_FEATURES, "--", "--exact", ...selected], environment);
    assertNoFixtureProcesses(environment);
    console.log(`Terminal host role tests partition ${partition.index}/${partition.count} OK`);
    return;
  }

  if (partition?.skip) {
    // Rationale: the partition jobs own the role suite; this job keeps the unit tests and everything after them.
    run(cargo, ["test", "--manifest-path", manifest, "--lib", "--bins", "--features", ROLE_TEST_FEATURES], environment);
  } else {
    run(cargo, ["test", "--manifest-path", manifest, "--features", ROLE_TEST_FEATURES], environment);
  }
  // Platform: `cargo test --bins` does not place a normal `.exe` at the path used by the Windows
  // parity probe, so build the child fixture explicitly on every platform.
  run(cargo, ["build", "--manifest-path", manifest, "--bin", "fake-tab", "--features", "resident-fixtures"], environment);
  assertNoFixtureProcesses(environment);
  // Invariant: the real-process Vitest fixture must see the addon before test collection; otherwise
  // its native assertions would skip while the old executable target no longer exists.
  run(cargo, ["build", "--manifest-path", manifest, "--lib", "--features", "node-addon,resident-fixtures,fault-injection"], environment);
  const library = platform() === "win32" ? "terminal_host_contracts.dll" : platform() === "darwin" ? "libterminal_host_contracts.dylib" : "libterminal_host_contracts.so";
  const builtAddon = resolve("native/terminal-host/target/debug", library);
  const debugAddon = resolve(".artifacts/terminal-host/terminal-host.node");
  await mkdir(resolve(".artifacts/terminal-host"), { recursive: true });
  await copyFile(builtAddon, debugAddon);
  run(process.execPath, ["-e", "const report=require(process.argv[1]).version(); if(report.schema!=='a1-terminal-host-version-v1') process.exit(2);", debugAddon], environment, PROBE_TIMEOUT_MS);
  run(process.execPath, [resolve("scripts/development/test-session-lock-addon.mjs")], environment, PROBE_TIMEOUT_MS);
  run(process.execPath, [
    resolve("node_modules/vitest/vitest.mjs"), "run",
    "test/foundation/release/resident-release-retention.integration.test.ts",
    "test/foundation/resident-tabs/recovery-storage.test.ts",
    "test/foundation/resident-tabs/resident-tabs.test.ts",
    "test/foundation/resident-tabs/tab-launch-context.test.ts",
    "test/app/session-shell/session-shell-resident-recovery.test.ts",
    "test/integrations/pi/engine/session-backend.test.ts",
    "test/ui/settings/declarations.test.ts",
    "test/ui/settings/sections.test.ts",
  ], environment, PROBE_TIMEOUT_MS);
  // Rationale: the release artifact is otherwise built only by publication; building it here proves
  // the release profile, manifest, notices, feature-free identity, and fault-injection refusal.
  run(process.execPath, [resolve("scripts/development/build-terminal-host.mjs")], { ...environment, CARGO: cargo }, RELEASE_BUILD_TIMEOUT_MS);
  const releaseAddon = resolve("dist/native", `${platform()}-${process.arch}`, "terminal-host.node");
  runRoleRefusal(releaseAddon, ["--probe"], { ...environment, A1_TABS_FAULT_CRASH_POINT: "after-bind" });
  for (const flag of ["--probe", "--probe-contracts", "--probe-durable", "--probe-controller-boundary", "--probe-resident-launch", "--probe-selection", "--probe-input"]) {
    runRole(debugAddon, [flag], environment, PROBE_TIMEOUT_MS);
  }
  run(process.execPath, [resolve("scripts/release/verify-native-artifacts.mjs"), "--local"], environment, PROBE_TIMEOUT_MS);
  // Provenance: preserve the debug tests/probes and feature-free shipping artifact above. Timing
  // uses shipping optimization with the SAME fixture controls, never debug overhead or looser budgets.
  run(cargo, performanceBuildArguments(manifest), environment, RELEASE_BUILD_TIMEOUT_MS);
  const performanceDirectory = resolve(".artifacts/terminal-host/performance");
  const performanceAddon = resolve(performanceDirectory, "terminal-host.node");
  await mkdir(performanceDirectory, { recursive: true });
  await copyFile(resolve("native/terminal-host/target/release", library), performanceAddon);
  run(process.execPath, ["-e", "if(require(process.argv[1]).fixtureBuildProfile?.()!=='release') process.exit(2);", performanceAddon], environment, PROBE_TIMEOUT_MS);
  console.log(`Terminal host addon, contracts/durability/controller boundary, fixed-role launch, retained model, native input/selection probes, and release artifact OK${partition?.skip ? " (role tests ran in their partitions)" : ""}`);
}

function assertNoFixtureProcesses(env) {
  const executable = resolve("native/terminal-host/target/debug", platform() === "win32" ? "role-host.exe" : "role-host");
  let listing;
  if (platform() === "win32") {
    const command = [
      "$items = @(Get-CimInstance Win32_Process |",
      "Where-Object { $_.ExecutablePath -eq $env:TERMINAL_HOST_FIXTURE_EXECUTABLE } |",
      "Select-Object ProcessId, ParentProcessId, CommandLine);",
      "$items | ConvertTo-Json -Compress",
    ].join(" ");
    listing = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
      env: { ...env, TERMINAL_HOST_FIXTURE_EXECUTABLE: executable },
      windowsHide: true,
    });
  } else {
    listing = spawnSync("ps", ["-axo", "pid=,ppid=,command="], { env });
  }
  if (listing.error) throw listing.error;
  if (listing.status !== 0) throw new Error(`fixture process inspection failed: ${listing.stderr.toString("utf8")}`);
  const output = listing.stdout.toString("utf8").trim();
  const leaked = platform() === "win32"
    ? output !== "" && output !== "[]"
    : output.split("\n").filter(line => line.includes(executable));
  if ((Array.isArray(leaked) && leaked.length > 0) || leaked === true) {
    console.error(`terminal-host fixture processes survived the role suite:\n${output}`);
    process.exit(1);
  }
}

function runRole(addon, args, env, timeout) {
  run(process.execPath, [resolve("dist/foundation/resident-tabs/host-entry.js"), ...args], {
    ...env, A1_DEV_INSTANCE_ID: env.A1_DEV_INSTANCE_ID ?? "terminal-host-validation", A1_TERMINAL_HOST_PATH: addon,
  }, timeout);
}

function runRoleRefusal(addon, args, env) {
  const result = spawnSync(process.execPath, [resolve("dist/foundation/resident-tabs/host-entry.js"), ...args], {
    stdio: "inherit", env: {
      ...env, A1_DEV_INSTANCE_ID: env.A1_DEV_INSTANCE_ID ?? "terminal-host-validation", A1_TERMINAL_HOST_PATH: addon,
    }, windowsHide: true, timeout: PROBE_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  if (result.status === 0) throw new Error("release-profile terminal host accepted fault injection");
}

function run(executable, args, env, timeout) {
  const result = spawnSync(executable, args, { stdio: "inherit", env, windowsHide: true, timeout });
  if (result.error?.code === "ETIMEDOUT") {
    console.error(`${[executable, ...args].join(" ")} did not finish within ${timeout / 1000}s`);
    process.exit(1);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
