import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const identity = JSON.parse(await readFile(resolve(packageRoot, "src", "product-identity.json"), "utf8"));
const canonicalRoot = await realpath(packageRoot);
const { resolveDevelopmentLaunchEnvironment } = await import("../../dist/features/launch/index.js");
const release = await deriveDevelopmentReleaseIdentity(packageRoot);
const { checkoutId, instanceId, developmentRoot, environment } = resolveDevelopmentLaunchEnvironment(
  canonicalRoot,
  release.releaseId,
  process.env,
);

const launchArguments = process.argv.slice(2);
const inspectedArguments = launchArguments[0] === "--print-environment" ? launchArguments.slice(1) : launchArguments;
const directProfile = directLaunchProfile(inspectedArguments);
const prepared = directProfile === null ? null : await prepareDirectProfile(directProfile, environment);
const childEnvironment = prepared === null ? environment : { ...prepared.environment, A1_LAUNCH_PROFILE: directProfile };

if (launchArguments[0] === "--print-environment") {
  process.stdout.write(`${JSON.stringify({ checkoutId, instanceId, releaseId: release.releaseId, developmentRoot, launchArguments: inspectedArguments, directProfile, profileConfigurationRoot: prepared?.configurationRoot ?? null, environment: {
    A1_CONFIG_DIR: childEnvironment.A1_CONFIG_DIR,
    A1_DATA_DIR: childEnvironment.A1_DATA_DIR,
    A1_RUNTIME_DIR: childEnvironment.A1_RUNTIME_DIR,
    A1_DATABASE_PATH: childEnvironment.A1_DATABASE_PATH,
    PI_CODING_AGENT_DIR: childEnvironment.PI_CODING_AGENT_DIR ?? null,
  } }, null, 2)}\n`);
} else {
  const entry = directProfile === null ? identity.artifacts.cliEntry : identity.artifacts.uiEntry;
  const childArguments = directProfile === null ? launchArguments : [];
  const child = spawn(process.execPath, [resolve(packageRoot, entry), ...childArguments], {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: "inherit",
    windowsHide: false,
  });
  child.once("error", error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
  child.once("close", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

function directLaunchProfile(arguments_) {
  if (arguments_.length === 0) return "a1";
  if (arguments_.length === 1 && arguments_[0] === "pi") return arguments_[0];
  return null;
}

async function prepareDirectProfile(profileId, sourceEnvironment) {
  const { interactiveLaunchIntent, prepareInteractiveLaunch } = await import("../../dist/features/launch/index.js");
  return await prepareInteractiveLaunch(interactiveLaunchIntent(profileId), sourceEnvironment);
}

async function deriveDevelopmentReleaseIdentity(root) {
  const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const digest = createHash("sha256");
  digest.update(JSON.stringify({ name: manifest.name, version: manifest.version, files: manifest.files }));
  for (const entry of manifest.files ?? []) {
    await collectDevelopmentFileIdentity(root, entry, digest);
  }
  return { releaseId: `${manifest.version}-${digest.digest("hex").slice(0, 20)}` };
}

async function collectDevelopmentFileIdentity(root, path, digest) {
  const absolute = resolve(root, path);
  const metadata = await lstat(absolute);
  digest.update(`${relative(root, absolute)}\0${metadata.size}\0${Math.trunc(metadata.mtimeMs)}\n`);
  if (!metadata.isDirectory()) return;
  for (const entry of await readdir(absolute)) {
    await collectDevelopmentFileIdentity(root, join(path, entry), digest);
  }
}
