import { execFile } from "node:child_process";
import { access, chmod, cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { inc } from "semver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PRODUCT_PACKAGE } from "../../src/foundation/release/index.js";

const execFileAsync = promisify(execFile);
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
let temporaryRoot = "";
let isolatedBuildRoot = "";

beforeAll(async () => {
  temporaryRoot = await mkdtemp(resolve(tmpdir(), "a1-update-cli-"));
  isolatedBuildRoot = resolve(temporaryRoot, "build");
  await mkdir(isolatedBuildRoot, { recursive: true });
  await Promise.all([
    cp(resolve(repository, "src"), resolve(isolatedBuildRoot, "src"), { recursive: true }),
    cp(resolve(repository, "bin"), resolve(isolatedBuildRoot, "bin"), { recursive: true }),
    cp(resolve(repository, "tsconfig.json"), resolve(isolatedBuildRoot, "tsconfig.json")),
    cp(resolve(repository, "tsconfig.build.json"), resolve(isolatedBuildRoot, "tsconfig.build.json")),
    cp(resolve(repository, "package.json"), resolve(isolatedBuildRoot, "package.json")),
  ]);
  await symlink(resolve(repository, "node_modules"), resolve(isolatedBuildRoot, "node_modules"), "junction");
  await execFileAsync(process.execPath, [
    resolve(repository, "node_modules", "typescript", "bin", "tsc"),
    "-p",
    resolve(isolatedBuildRoot, "tsconfig.build.json"),
    "--outDir",
    resolve(isolatedBuildRoot, "dist", "src"),
  ], { cwd: isolatedBuildRoot, timeout: 30_000 });
}, 30_000);

afterAll(async () => {
  if (temporaryRoot !== "") await rm(temporaryRoot, { recursive: true, force: true });
});

describe("update CLI dispatch", () => {
  it("runs hermetically through a1 without loading the interactive runtime", async () => {
    const fakeBin = resolve(temporaryRoot, "bin");
    const npmLog = resolve(temporaryRoot, "npm-calls.jsonl");
    const forbiddenImportLog = resolve(temporaryRoot, "forbidden-imports.log");
    const runtimeDirectory = resolve(temporaryRoot, "runtime-must-not-exist");
    const loader = resolve(temporaryRoot, "isolation-loader.mjs");
    await mkdir(fakeBin, { recursive: true });

    await writeFile(loader, `
import { appendFileSync } from "node:fs";
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "node-pty" || specifier.includes("/dist/src/foundation/supervision/") || specifier.includes("/dist/src/foundation/transparent-terminal/") || (process.argv.includes("version") && specifier.includes("/dist/src/foundation/release/"))) {
    appendFileSync(${JSON.stringify(forbiddenImportLog)}, specifier + "\\n");
    throw new Error("Update imported forbidden interactive runtime module: " + specifier);
  }
  return nextResolve(specifier, context);
}
`, "utf8");

    const fakeNpmModule = resolve(fakeBin, "fake-npm.mjs");
    await writeFile(fakeNpmModule, `
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "view" && args[2] === "dist-tags") console.log(JSON.stringify({ latest: process.env.FAKE_NPM_LATEST_TARGET, next: process.env.FAKE_NPM_NEXT_TARGET }));
else if (args[0] === "root") console.log(process.env.FAKE_NPM_ROOT);
else if (args[0] === "install") console.log("fake npm install completed");
else process.exitCode = 64;
`, "utf8");

    if (process.platform === "win32") {
      await writeFile(
        resolve(fakeBin, "npm.cmd"),
        `@echo off\r\n"${process.execPath}" "%~dp0\\fake-npm.mjs" %*\r\n`,
        "utf8",
      );
    } else {
      const npmExecutable = resolve(fakeBin, "npm");
      await writeFile(npmExecutable, `#!${process.execPath}\nimport "./fake-npm.mjs";\n`, "utf8");
      await chmod(npmExecutable, 0o755);
    }

    const packageJson = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8")) as {
      version: string;
      bin: Record<string, string>;
    };
    const latestTarget = inc(packageJson.version, "patch");
    const nextTarget = inc(packageJson.version, "prerelease", "dev");
    expect(latestTarget).not.toBeNull();
    expect(nextTarget).not.toBeNull();
    expect(packageJson.bin).toEqual({ "a1": "bin/cli.js" });

    const cli = resolve(isolatedBuildRoot, packageJson.bin["a1"] ?? "missing");
    await expect(execFileAsync(process.execPath, [cli, "update", "next"], {
      cwd: temporaryRoot,
      env: {
        ...process.env,
        A1_RUNTIME_DIR: runtimeDirectory,
        FAKE_NPM_LOG: npmLog,
        FAKE_NPM_ROOT: dirname(repository),
        FAKE_NPM_LATEST_TARGET: latestTarget!,
        FAKE_NPM_NEXT_TARGET: nextTarget!,
        NODE_OPTIONS: `--no-warnings --experimental-loader=${pathToFileURL(loader).href}`,
        PATH: fakeBin,
      },
      timeout: 15_000,
    })).rejects.toMatchObject({ code: 2, stderr: expect.stringContaining("selects a release channel with a colon; run a1 update:develop") });

    await expect(access(npmLog)).rejects.toThrow();

    const result = await execFileAsync(process.execPath, [cli, "version"], {
      cwd: temporaryRoot,
      env: {
        ...process.env,
        A1_RUNTIME_DIR: runtimeDirectory,
        FAKE_NPM_LOG: npmLog,
        FAKE_NPM_ROOT: dirname(repository),
        FAKE_NPM_LATEST_TARGET: latestTarget!,
        FAKE_NPM_NEXT_TARGET: nextTarget!,
        NODE_OPTIONS: `--no-warnings --experimental-loader=${pathToFileURL(loader).href}`,
        PATH: fakeBin,
      },
      timeout: 15_000,
    });
    expect(result.stdout).toBe(`Installed: ${packageJson.version}\nRelease:   ${latestTarget}\nDevelop:   ${nextTarget}\n`);
    const versionCalls = (await readFile(npmLog, "utf8")).trim().split("\n").map(line => JSON.parse(line) as string[]);
    expect(versionCalls).toEqual([["view", PRODUCT_PACKAGE, "dist-tags", "--json"]]);
    await expect(access(forbiddenImportLog)).rejects.toThrow();
    await expect(access(runtimeDirectory)).rejects.toThrow();
  }, 30_000);
});
