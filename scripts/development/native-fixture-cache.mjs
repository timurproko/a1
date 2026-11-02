import { cp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import crossSpawn from "cross-spawn";
const spawnSync = crossSpawn.sync;

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 600_000,
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `native fixture dependency preparation failed: ${executable} (${result.status ?? result.error?.code})`,
    );
  return result.stdout?.trim() ?? "";
}
async function copyOptional(from, to) {
  try {
    await cp(from, to, { recursive: true, force: true, dereference: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
async function prepareZigCache(state) {
  const version = spawnSync(process.env.ZIG ?? "zig", ["version"], {
    encoding: "utf8",
  });
  if (version.error?.code === "ENOENT") return;
  if (version.status !== 0) throw new Error("Zig provisioning failed");
  const zig = process.env.ZIG ?? "zig";
  run(zig, ["build", "--fetch=all"], {
    cwd: join(state.repo, "native/terminal-host/vendor/libghostty-vt"),
  });
  const output = run(zig, ["env"]);
  let cache;
  try {
    cache = JSON.parse(output).global_cache_dir;
  } catch {
    cache = JSON.parse(
      output.match(/\.global_cache_dir\s*=\s*("(?:[^"\\]|\\.)*")/u)?.[1] ??
        "null",
    );
  }
  if (typeof cache !== "string")
    throw new Error("Zig public cache location is unavailable");
  state.zig = join(state.work, "zig-cache");
  await copyOptional(cache, state.zig);
}
/** Fetch dependencies without executing package scripts; execution later has no external network. */
export async function prepareFixtureCaches(
  state,
  { predecessors = false, environment = process.env } = {},
) {
  run(
    "git",
    ["clone", "--shared", "--no-checkout", state.repo, state.workspace],
    { cwd: state.repo },
  );
  run("git", ["-C", state.workspace, "checkout", "--detach", state.head]);
  await symlink(
    join(state.repo, ".artifacts"),
    join(state.workspace, ".artifacts"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await cp(
    join(state.repo, "node_modules"),
    join(state.workspace, "node_modules"),
    { recursive: true, verbatimSymlinks: true },
  );
  for (const crate of ["terminal-host", "process-guardian"])
    await copyOptional(
      join(state.repo, "native", crate, "target"),
      join(state.workspace, "native", crate, "target"),
    );
  await prepareZigCache(state);
  const rootCargo = environment.CARGO_HOME ?? join(homedir(), ".cargo");
  const rootRustup = environment.RUSTUP_HOME ?? join(homedir(), ".rustup");
  for (const manifest of [
    "native/terminal-host/Cargo.toml",
    "native/process-guardian/Cargo.toml",
  ]) {
    run(
      environment.CARGO ?? "cargo",
      ["fetch", "--locked", "--manifest-path", resolve(state.repo, manifest)],
      { cwd: state.repo },
    );
  }
  await Promise.all([
    copyOptional(join(rootCargo, "bin"), join(state.cargo, "bin")),
    copyOptional(join(rootCargo, "registry"), join(state.cargo, "registry")),
    copyOptional(join(rootCargo, "git"), join(state.cargo, "git")),
    copyOptional(
      join(rootRustup, "toolchains"),
      join(state.rustup, "toolchains"),
    ),
    copyOptional(
      join(rootRustup, "settings.toml"),
      join(state.rustup, "settings.toml"),
    ),
  ]);
  await mkdir(state.home, { recursive: true });
  const cache = join(state.home, ".npm");
  const config = join(state.control, "npm-public.conf");
  await writeFile(
    config,
    "registry=https://registry.npmjs.org/\naudit=false\nfund=false\n",
  );
  const globalConfig = join(state.control, "npm-public-global.conf");
  await writeFile(globalConfig, "");
  const env = Object.fromEntries(
    Object.entries(environment).filter(
      ([key]) =>
        !/(TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH|npm_config_)/iu.test(key),
    ),
  );
  const npm = (args) =>
    run(
      process.platform === "win32" ? "npm.cmd" : "npm",
      [
        ...args,
        "--cache",
        cache,
        "--userconfig",
        config,
        "--globalconfig",
        globalConfig,
        "--registry",
        "https://registry.npmjs.org/",
      ],
      { cwd: state.repo, env },
    );
  const manifest = JSON.parse(
    await readFile(join(state.repo, "package.json"), "utf8"),
  );
  const stage = join(state.work, "dependency-preparation");
  await mkdir(stage, { recursive: true });
  await writeFile(
    join(stage, "package.json"),
    JSON.stringify({
      name: "native-fixture-dependencies",
      version: "1.0.0",
      private: true,
      dependencies: manifest.dependencies,
      optionalDependencies: manifest.optionalDependencies,
    }),
  );
  npm([
    "install",
    "--prefix",
    stage,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
  ]);
  if (predecessors) {
    const response = JSON.parse(npm(["view", manifest.name, "time", "--json"]));
    const times = Array.isArray(response)
      ? Object.assign({}, ...response)
      : response;
    const count = Number.parseInt(
      environment.UPDATE_PREDECESSOR_COUNT ?? "3",
      10,
    );
    if (!Number.isSafeInteger(count) || count < 1 || count > 20)
      throw new Error("invalid predecessor cache count");
    const versions = Object.entries(times)
      .filter(
        ([version, date]) =>
          version !== manifest.version &&
          /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(version) &&
          Number.isFinite(Date.parse(date)),
      )
      .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))
      .slice(0, Math.max(3, count));
    if (!versions.length) throw new Error("no public predecessors to prepare");
    for (const [version] of versions) {
      const prefix = join(state.work, `predecessor-cache-${version}`);
      npm([
        "install",
        "--global",
        "--prefix",
        prefix,
        `${manifest.name}@${version}`,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ]);
      await rm(prefix, { recursive: true, force: true });
    }
  }
  await rm(stage, { recursive: true, force: true });
  await writeFile(
    join(state.home, ".npmrc"),
    `offline=true\ncache=${cache.replaceAll("\\", "/")}\naudit=false\nfund=false\n`,
  );
}
