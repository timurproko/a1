import { spawn, type StdioOptions } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import crossSpawn from "cross-spawn";
import { compare as compareSemver, valid as validSemver } from "semver";

export const ADDONE_PACKAGE = "@timurproko/addone";

export interface ProcessRequest {
  captureStdout: boolean;
}

export interface ProcessResult {
  code: number | null;
  stdout: string;
}

export type UpdateProcessRunner = (
  command: string,
  arguments_: readonly string[],
  request: ProcessRequest,
) => Promise<ProcessResult>;

export interface UpdateFileSystem {
  readFile(path: string): Promise<string>;
  realpath(path: string): Promise<string>;
}

export interface UpdateOutput {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface SelfUpdateOptions {
  packageRoot: string;
  fileSystem?: UpdateFileSystem;
  output?: UpdateOutput;
  runner?: UpdateProcessRunner;
}

const defaultFileSystem: UpdateFileSystem = {
  async readFile(path) {
    return await readFile(path, "utf8");
  },
  realpath,
};

const defaultOutput: UpdateOutput = {
  stdout(message) {
    process.stdout.write(message);
  },
  stderr(message) {
    process.stderr.write(message);
  },
};

export function createNpmProcessRunner(platform: NodeJS.Platform = process.platform): UpdateProcessRunner {
  return async (command, arguments_, request) => await new Promise((resolvePromise, rejectPromise) => {
    const stdio: StdioOptions = request.captureStdout
      ? ["ignore", "pipe", "inherit"]
      : ["inherit", "inherit", "inherit"];
    const child = platform === "win32"
      ? crossSpawn(command, [...arguments_], { stdio })
      : spawn(command, [...arguments_], { stdio });
    const stdout: Buffer[] = [];
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    let settled = false;
    child.once("error", error => {
      if (settled) return;
      settled = true;
      rejectPromise(error);
    });
    child.once("close", code => {
      if (settled) return;
      settled = true;
      resolvePromise({ code, stdout: Buffer.concat(stdout).toString("utf8") });
    });
  });
}

export async function runSelfUpdate(options: SelfUpdateOptions): Promise<number> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const output = options.output ?? defaultOutput;
  const runner = options.runner ?? createNpmProcessRunner();

  let runningVersion: string;
  try {
    const packageJson = JSON.parse(await fileSystem.readFile(resolve(options.packageRoot, "package.json"))) as { version?: unknown };
    const parsedVersion = typeof packageJson.version === "string" ? validSemver(packageJson.version) : null;
    if (parsedVersion === null) throw new Error("package.json does not contain a valid semantic version");
    runningVersion = parsedVersion;
  } catch (error) {
    output.stderr(`AddOne could not read its running package version: ${errorMessage(error)}\n`);
    printManualFallback(output);
    return 1;
  }

  const latestLookup = await runNpm(
    runner,
    ["view", `${ADDONE_PACKAGE}@latest`, "version"],
    true,
    output,
    "query the npm registry",
  );
  if (latestLookup.result === null) return latestLookup.exitCode;

  const latestVersion = validSemver(latestLookup.result.stdout.trim());
  if (latestVersion === null) {
    output.stderr(`AddOne received a malformed latest version from npm: ${JSON.stringify(latestLookup.result.stdout.trim())}.\n`);
    printManualFallback(output);
    return 1;
  }

  output.stdout(`AddOne update: running ${runningVersion}; npm latest is ${latestVersion}.\n`);
  if (compareSemver(latestVersion, runningVersion) <= 0) {
    output.stdout("AddOne is already current; no installation was changed.\n");
    return 0;
  }

  const rootLookup = await runNpm(
    runner,
    ["root", "--global"],
    true,
    output,
    "resolve npm's global package root",
    latestVersion,
  );
  if (rootLookup.result === null) return rootLookup.exitCode;

  const globalRootOutput = rootLookup.result.stdout.trim();
  if (globalRootOutput.length === 0) {
    output.stderr("AddOne could not verify its installation because npm returned an empty global package root.\n");
    printManualFallback(output, latestVersion);
    return 1;
  }

  let packageRoot: string;
  let globalRoot: string;
  try {
    [packageRoot, globalRoot] = await Promise.all([
      fileSystem.realpath(options.packageRoot),
      fileSystem.realpath(globalRootOutput),
    ]);
  } catch (error) {
    output.stderr(`AddOne could not canonicalize the running and global npm paths: ${errorMessage(error)}\n`);
    printManualFallback(output, latestVersion);
    return 1;
  }

  if (!isContainedBy(globalRoot, packageRoot)) {
    output.stderr(`AddOne refused to update automatically because ${packageRoot} is not managed beneath npm's global package root ${globalRoot}.\n`);
    output.stderr("This can happen in a local checkout, an npm-linked tree, or an installation managed by another package manager.\n");
    printManualFallback(output, latestVersion);
    return 1;
  }

  const installArguments = ["install", "--global", `${ADDONE_PACKAGE}@${latestVersion}`];
  output.stdout(`AddOne is installing ${ADDONE_PACKAGE}@${latestVersion} globally.\n`);
  const installation = await runNpm(
    runner,
    installArguments,
    false,
    output,
    "start the global npm installation",
    latestVersion,
    false,
  );
  if (installation.result === null) return installation.exitCode;

  if (installation.result.code !== 0) {
    output.stderr(`AddOne update failed because npm exited with status ${formatExitCode(installation.result.code)}. Review npm's diagnostics above for network, registry, or permission errors.\n`);
    printManualFallback(output, latestVersion);
    return unsuccessfulCode(installation.result.code);
  }

  output.stdout(`AddOne updated successfully from ${runningVersion} to ${latestVersion}. Start a new AddOne process to use it.\n`);
  return 0;
}

async function runNpm(
  runner: UpdateProcessRunner,
  arguments_: readonly string[],
  captureStdout: boolean,
  output: UpdateOutput,
  action: string,
  fallbackVersion?: string,
  reportNonzero = true,
): Promise<{ result: ProcessResult | null; exitCode: number }> {
  let result: ProcessResult;
  try {
    result = await runner("npm", arguments_, { captureStdout });
  } catch (error) {
    output.stderr(`AddOne could not execute npm to ${action}: ${errorMessage(error)}\n`);
    printManualFallback(output, fallbackVersion);
    return { result: null, exitCode: 1 };
  }

  if (result.code !== 0 && reportNonzero) {
    output.stderr(`AddOne could not ${action}; npm exited with status ${formatExitCode(result.code)}. Review npm's diagnostics above.\n`);
    printManualFallback(output, fallbackVersion);
    return { result: null, exitCode: unsuccessfulCode(result.code) };
  }
  return { result, exitCode: 0 };
}

function isContainedBy(parent: string, child: string): boolean {
  const pathFromParent = relative(parent, child);
  return pathFromParent.length > 0
    && pathFromParent !== ".."
    && !pathFromParent.startsWith(`..${sep}`)
    && !isAbsolute(pathFromParent);
}

function printManualFallback(output: UpdateOutput, version?: string): void {
  output.stderr(`Manual fallback: npm install --global ${ADDONE_PACKAGE}@${version ?? "latest"}\n`);
}

function unsuccessfulCode(code: number | null): number {
  return code === null || code === 0 ? 1 : code;
}

function formatExitCode(code: number | null): string {
  return code === null ? "unknown" : String(code);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
