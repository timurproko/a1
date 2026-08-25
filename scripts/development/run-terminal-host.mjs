import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";

const cargo = process.env.CARGO ?? resolve(homedir(), ".cargo", "bin", platform() === "win32" ? "cargo.exe" : "cargo");
const environment = { ...process.env, ZIG: process.env.ZIG ?? "zig" };
const manifest = resolve("native/terminal-host/Cargo.toml");
run(cargo, ["build", "--manifest-path", manifest], environment, "pipe");

const executable = resolve("native/terminal-host/target/debug", platform() === "win32" ? "terminal-host.exe" : "terminal-host");
const args = process.argv.slice(2);
const hostArgs = args.length > 0 ? args : ["--run"];
run(executable, hostArgs, environment, "inherit");

function run(command, args, env, stdio) {
  const result = spawnSync(command, args, { stdio, env, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
