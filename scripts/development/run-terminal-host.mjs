import { spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";

const cargo = process.env.CARGO ?? resolve(homedir(), ".cargo", "bin", platform() === "win32" ? "cargo.exe" : "cargo");
const environment = { ...process.env, ZIG: process.env.ZIG ?? "zig" };
const manifest = resolve("native/terminal-host/Cargo.toml");
run(cargo, ["build", "--manifest-path", manifest, "--lib", "--features", "node-addon,resident-fixtures"], environment, "pipe");

const artifactDirectory = resolve(".artifacts/terminal-host");
const addon = resolve(artifactDirectory, "terminal-host.node");
const built = resolve("native/terminal-host/target/debug", platform() === "win32" ? "terminal_host_contracts.dll" : platform() === "darwin" ? "libterminal_host_contracts.dylib" : "libterminal_host_contracts.so");
await mkdir(artifactDirectory, { recursive: true });
await copyFile(built, addon);
const args = process.argv.slice(2);
const hostArgs = args.length > 0 ? args : ["--probe"];
run(process.execPath, [resolve("dist/foundation/resident-tabs/host-entry.js"), ...hostArgs], {
  ...environment,
  A1_DEV_INSTANCE_ID: environment.A1_DEV_INSTANCE_ID ?? "terminal-host-validation",
  A1_TERMINAL_HOST_PATH: addon,
}, "inherit");

function run(command, args, env, stdio) {
  const result = spawnSync(command, args, { stdio, env, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
