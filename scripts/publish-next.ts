import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import crossSpawn from "cross-spawn";
import {
  developmentPreviewTarballName,
  publishDevelopmentPreviewWithRecovery,
  selectDevelopmentPreviewCandidate,
  verifyDevelopmentPreviewRegistry,
} from "../src/development-preview-release.js";

const repository = resolve(process.cwd());
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const statePath = resolve(repository, "artifacts", "development-preview-candidate.json");

try {
  await publishNext();
} catch (error) {
  process.stderr.write(`\nAddOne next publication failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write("Fix the reported problem and rerun `npm run publish:next`; an already validated tarball will be reused.\n");
  process.exitCode = 1;
}

async function publishNext() {
  throw new Error("terminal preview publication is frozen until transparent capability certification completes");
  await requireCleanDevelop();
  const manifest = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8"));
  if (typeof manifest.name !== "string" || typeof manifest.version !== "string") throw new Error("package.json has no valid name/version");

  const publishedVersions = normalizeVersions(JSON.parse(await capture(npm, ["view", manifest.name, "versions", "--json"])));
  let head = (await capture("git", ["rev-parse", "HEAD"])).trim();
  const retained = await readRetainedCandidate();
  if (retained && retained.version === manifest.version && retained.commit === head) {
    if (publishedVersions.includes(retained.version)) {
      await ensureNextTag(manifest.name, retained.version);
      await cleanup(retained.tarball);
      process.stdout.write(`AddOne ${retained.version} is already published and verified under npm next.\n`);
      return;
    }
    await verifyRetainedTarball(retained);
    process.stdout.write(`Reusing validated candidate ${retained.version} from ${retained.tarball}.\n`);
    await publishAndVerify(manifest.name, retained.version, retained.tarball);
    await cleanup(retained.tarball);
    return;
  }

  const candidate = selectDevelopmentPreviewCandidate(manifest.version, publishedVersions);
  if (candidate.requiresVersionCommit) {
    process.stdout.write(`Preparing immutable AddOne preview ${candidate.version}.\n`);
    await interactive(npm, ["version", candidate.version, "--no-git-tag-version"]);
    await interactive("git", ["add", "--", "package.json", "package-lock.json"]);
    await interactive("git", ["commit", "-m", `chore(release): bump version to ${candidate.version}`]);
    head = (await capture("git", ["rev-parse", "HEAD"])).trim();
  } else {
    process.stdout.write(`Resuming unpublished AddOne preview ${candidate.version}.\n`);
  }

  await requireCleanDevelop();
  process.stdout.write("Building candidate bytes before immutable packing.\n");
  await interactive(npm, ["run", "build"]);
  const packResult = normalizePackResult(JSON.parse(await capture(npm, ["pack", "--ignore-scripts", "--json"])));
  const expectedTarball = developmentPreviewTarballName(manifest.name, candidate.version);
  if (packResult.filename !== expectedTarball) throw new Error(`npm packed ${packResult.filename}; expected ${expectedTarball}`);
  const tarball = resolve(repository, packResult.filename);
  const integrity = await sha512Integrity(tarball);
  if (integrity !== packResult.integrity) throw new Error(`tarball integrity mismatch for ${packResult.filename}`);

  process.stdout.write("Running simulation-first certification against the exact packed tarball.\n");
  await interactiveWithEnvironment(npm, ["run", "check"], { ADDONE_CERTIFICATION_TARBALL: tarball });
  await requireCleanDevelop();
  const certification = {
    schema: "addone-development-preview-certification-v1",
    packageName: manifest.name,
    version: candidate.version,
    commit: head,
    tarball,
    integrity,
    shasum: packResult.shasum,
    platform: process.platform,
    architecture: process.arch,
    productionDefaults: { nativePiReadinessMs: 15_000 },
    overrides: { ADDONE_CERTIFICATION_TARBALL: tarball },
    certifiedAt: new Date().toISOString(),
  };
  await mkdir(resolve(repository, "artifacts"), { recursive: true });
  await writeFile(statePath, JSON.stringify(certification, null, 2));

  process.stdout.write(`Certified exact candidate: ${tarball}\n`);
  await publishAndVerify(manifest.name, candidate.version, tarball);
  await cleanup(tarball);
}

async function publishAndVerify(packageName, version, tarball) {
  const result = await publishDevelopmentPreviewWithRecovery(
    async () => await interactive(npm, ["publish", tarball, "--tag", "next", "--ignore-scripts"]),
    async () => await ensureNextTag(packageName, version),
  );
  if (result.recoveredPublishError) {
    process.stdout.write("npm reported an authentication completion error after upload; registry verification confirmed the exact candidate.\n");
  }
  process.stdout.write(`Published and verified ${packageName}@${version} under npm next.\n`);
}

async function ensureNextTag(packageName, version) {
  await verifyDevelopmentPreviewRegistry(
    version,
    async () => {
      const [publishedVersions, nextVersion] = await Promise.all([
        capture(npm, ["view", packageName, "versions", "--json"])
          .then(output => normalizeVersions(JSON.parse(output))),
        viewNextVersion(packageName),
      ]);
      return { published: publishedVersions.includes(version), nextVersion };
    },
    async () => await interactive(npm, ["dist-tag", "add", `${packageName}@${version}`, "next"]),
  );
}

async function viewNextVersion(packageName) {
  const output = await capture(npm, ["view", `${packageName}@next`, "version", "--json"]);
  const value = JSON.parse(output);
  return typeof value === "string" ? value : null;
}

async function requireCleanDevelop() {
  const branch = (await capture("git", ["branch", "--show-current"])).trim();
  if (branch !== "develop") throw new Error(`publication requires branch develop; current branch is ${branch || "detached HEAD"}`);
  const status = await capture("git", ["status", "--porcelain", "--untracked-files=normal"]);
  if (status.trim() !== "") throw new Error(`publication requires a clean working tree:\n${status.trim()}`);
}

async function readRetainedCandidate() {
  try {
    const value = JSON.parse(await readFile(statePath, "utf8"));
    if (value?.schema !== "addone-development-preview-certification-v1") return null;
    if ([value.version, value.commit, value.tarball, value.integrity].every(item => typeof item === "string")) return value;
    return null;
  } catch {
    return null;
  }
}

async function verifyRetainedTarball(candidate) {
  await access(candidate.tarball);
  const integrity = await sha512Integrity(candidate.tarball);
  if (integrity !== candidate.integrity) throw new Error(`retained tarball integrity mismatch: ${candidate.tarball}`);
}

async function cleanup(tarball) {
  await Promise.all([
    rm(tarball, { force: true }),
    rm(statePath, { force: true }),
  ]);
}

function normalizeVersions(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every(version => typeof version === "string")) return value;
  throw new Error("npm returned malformed package versions");
}

function normalizePackResult(value) {
  const result = Array.isArray(value) ? value[0] : null;
  if (!result || typeof result.filename !== "string" || typeof result.integrity !== "string" || typeof result.shasum !== "string") {
    throw new Error("npm pack returned malformed metadata");
  }
  return result;
}

async function sha512Integrity(path) {
  const bytes = await readFile(path);
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

function capture(command, args) {
  return run(command, args, true);
}

function interactive(command, args) {
  return run(command, args, false);
}

function interactiveWithEnvironment(command, args, environment) {
  return run(command, args, false, environment);
}

function run(command, args, captureOutput, environment = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, args, {
      cwd: repository,
      env: { ...process.env, ...environment },
      stdio: captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
      windowsHide: false,
    });
    const stdout = [];
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (signal) rejectPromise(new Error(`${command} terminated by ${signal}`));
      else if (code !== 0) rejectPromise(new Error(`${command} ${args.join(" ")} exited with status ${code ?? "unknown"}`));
      else resolvePromise(Buffer.concat(stdout).toString("utf8"));
    });
  });
}
