import crossSpawn from "cross-spawn";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, resolve } from "node:path";

const version = process.env.RELEASE_VERSION;
const channel = process.env.RELEASE_CHANNEL;
const expectedInstallerIntegrity = process.env.EXPECTED_INSTALLER_INTEGRITY;
const expectedApplicationIntegrity = process.env.EXPECTED_APPLICATION_INTEGRITY;
const output = resolve(process.env.PUBLISHED_INSTALLER_EVIDENCE ?? ".artifacts/validation/published-installer.json");
if (typeof version !== "string" || !version || !["latest", "next"].includes(channel)
  || !expectedInstallerIntegrity?.startsWith("sha512-") || !expectedApplicationIntegrity?.startsWith("sha512-")) {
  throw new Error("published installer smoke environment is incomplete");
}

const installerSource = JSON.parse(await readFile(resolve("packages", "a1-install", "package.json"), "utf8"));
const applicationSource = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const root = await mkdtemp(resolve(tmpdir(), "a1-published-installer-"));
const bootstrapPrefix = resolve(root, "bootstrap");
const applicationPrefix = resolve(root, "application");
const bootstrapBin = process.platform === "win32" ? bootstrapPrefix : resolve(bootstrapPrefix, "bin");
const applicationBin = process.platform === "win32" ? applicationPrefix : resolve(applicationPrefix, "bin");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const installerLauncher = resolve(bootstrapBin, process.platform === "win32" ? "a1-install.cmd" : "a1-install");
const applicationLauncher = resolve(applicationBin, process.platform === "win32" ? "a1.cmd" : "a1");
try {
  const acquired = crossSpawn.sync(npm, [
    "install", "--global", "--prefix", bootstrapPrefix, `${installerSource.name}@${version}`,
    "--ignore-scripts", "--no-audit", "--no-fund",
  ], { cwd: root, encoding: "utf8", env: process.env, windowsHide: true });
  if (acquired.status !== 0) throw new Error(acquired.stderr || `published installer acquisition failed with ${acquired.status}`);

  const environment = {
    ...process.env,
    npm_config_prefix: applicationPrefix,
    A1_CONFIG_DIR: resolve(root, "config"),
    A1_DATA_DIR: resolve(root, "data"),
    A1_RUNTIME_DIR: resolve(root, "runtime"),
    PATH: [applicationBin, bootstrapBin, process.env.PATH ?? ""].join(delimiter),
  };
  const args = channel === "next" ? ["--version", version] : [];
  const installed = crossSpawn.sync(installerLauncher, args, { cwd: root, encoding: "utf8", env: environment, windowsHide: true, timeout: 10 * 60_000 });
  if (installed.status !== 0) throw new Error(installed.stderr || `published installer failed with ${installed.status}`);
  if (installed.stdout.replace(/\r\n/gu, "\n") !== "a1 successfully installed\n" || installed.stderr !== "") {
    throw new Error("published installer transcript is invalid");
  }

  const applicationRoot = resolve(applicationPrefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", ...applicationSource.name.split("/"));
  const installedManifest = JSON.parse(await readFile(resolve(applicationRoot, "package.json"), "utf8"));
  if (installedManifest.name !== applicationSource.name || installedManifest.version !== version) {
    throw new Error("published installer selected the wrong application package");
  }
  const launched = crossSpawn.sync(applicationLauncher, ["version"], { cwd: root, encoding: "utf8", env: environment, windowsHide: true, timeout: 30_000 });
  if (launched.status !== 0) throw new Error(launched.stderr || `installed command verification failed with ${launched.status}`);

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({
    schema: "a1-published-installer-smoke-v1",
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    registry: {
      application: { name: applicationSource.name, version, integrity: expectedApplicationIntegrity },
      installer: { name: installerSource.name, version, integrity: expectedInstallerIntegrity },
    },
    transcript: "a1 successfully installed\n",
    installedVersion: installedManifest.version,
    launcherVerified: true,
    activationVerified: true,
  }, null, 2)}\n`);
  process.stdout.write(`Published installer smoke passed on ${process.platform}/${process.arch}.\n`);
} finally {
  await stopOwnedProcesses(resolve(root, "runtime"));
  await rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
}

/** Stop only processes whose metadata was created inside this disposable runtime. */
async function stopOwnedProcesses(directory) {
  const records = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile() && entry.name.endsWith(".json")) records.push(child);
    }
  }
  await visit(directory);
  const pids = new Set();
  for (const path of records) {
    try {
      const value = JSON.parse(await readFile(path, "utf8"));
      if (Number.isInteger(value.pid) && value.pid > 0 && value.pid !== process.pid) pids.add(value.pid);
    } catch { /* Rationale: ignore unrelated or concurrently replaced runtime evidence. */ }
  }
  for (const pid of pids) {
    try { process.kill(pid, "SIGTERM"); } catch { /* Rationale: an already stopped owned process needs no cleanup. */ }
  }
  await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  for (const pid of pids) {
    try { process.kill(pid, 0); process.kill(pid, "SIGKILL"); } catch { /* Rationale: the graceful stop already completed. */ }
  }
}
