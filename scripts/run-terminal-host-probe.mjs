import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";

const cargo = process.env.CARGO ?? resolve(homedir(), ".cargo", "bin", platform() === "win32" ? "cargo.exe" : "cargo");
const manifest = resolve("native/terminal-host/Cargo.toml");
const environment = { ...process.env, ZIG: process.env.ZIG ?? "zig" };

run(cargo, ["test", "--manifest-path", manifest], environment);
run(cargo, ["build", "--manifest-path", manifest], environment);
const executable = resolve("native/terminal-host/target/debug", platform() === "win32" ? "addone-terminal-host.exe" : "addone-terminal-host");
run(executable, ["--probe"], environment);
run(executable, ["--probe-2x2"], environment);
console.log("Terminal host build, unit tests, and one-pane/2x2 integration probes OK");

function run(executable, args, env) {
  const result = spawnSync(executable, args, { stdio: "inherit", env, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
