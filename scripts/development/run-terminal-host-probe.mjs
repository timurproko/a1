import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";

// Rationale: a probe that stops making progress fails here instead of running into the CI job timeout.
const PROBE_TIMEOUT_MS = 120_000;

const cargo = process.env.CARGO ?? resolve(homedir(), ".cargo", "bin", platform() === "win32" ? "cargo.exe" : "cargo");
const manifest = resolve("native/terminal-host/Cargo.toml");
const environment = { ...process.env, ZIG: process.env.ZIG ?? "zig" };
// Rationale: CI traces each probe step so a stall names the step that did not return.
if (process.env.CI && environment.A1_PROBE_TRACE === undefined) environment.A1_PROBE_TRACE = "1";

run(cargo, ["test", "--manifest-path", manifest, "--features", "resident-fixtures,fault-injection"], environment);
run(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", "test/foundation/resident-tabs/recovery-storage.test.ts"], environment, PROBE_TIMEOUT_MS);
run(cargo, ["build", "--release", "--manifest-path", manifest, "--features", "resident-fixtures"], environment);
const releaseExecutable = resolve("native/terminal-host/target/release", platform() === "win32" ? "terminal-host.exe" : "terminal-host");
runRefusal(releaseExecutable, ["--probe"], { ...environment, A1_TABS_FAULT_CRASH_POINT: "after-bind" });
run(cargo, ["build", "--manifest-path", manifest, "--features", "resident-fixtures"], environment);
run(cargo, ["build", "--manifest-path", manifest, "--lib", "--features", "node-addon"], environment);
run(process.execPath, [resolve("scripts/development/test-session-lock-addon.mjs")], environment, PROBE_TIMEOUT_MS);
const executable = resolve("native/terminal-host/target/debug", platform() === "win32" ? "terminal-host.exe" : "terminal-host");
run(executable, ["--probe"], environment, PROBE_TIMEOUT_MS);
run(executable, ["--probe-contracts"], environment, PROBE_TIMEOUT_MS);
run(executable, ["--probe-durable"], environment, PROBE_TIMEOUT_MS);
run(executable, ["--probe-controller-boundary"], environment, PROBE_TIMEOUT_MS);
run(executable, ["--probe-resident-launch"], environment, PROBE_TIMEOUT_MS);
run(executable, ["--probe-selection"], environment, PROBE_TIMEOUT_MS);
run(executable, ["--probe-input"], environment, PROBE_TIMEOUT_MS);
console.log("Terminal host binary/addon, contracts/durability/controller boundary, fixed-role launch, retained model, and native input/selection probes OK");

function runRefusal(executable, args, env) {
  const result = spawnSync(executable, args, { stdio: "inherit", env, windowsHide: true, timeout: PROBE_TIMEOUT_MS });
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
