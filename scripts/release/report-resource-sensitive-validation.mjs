import crossSpawn from "cross-spawn";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve, sep } from "node:path";
import { createTierPlan } from "./validation-tier.mjs";

const repository = process.cwd();
const output = resolve(valueAfter("--output") ?? ".artifacts/validation/resource-sensitive-focused.json");
const repeats = Number(valueAfter("--repeats") ?? "3");
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 10) throw new Error("--repeats must be an integer from 1 through 10");

const plan = await createTierPlan(["fast"], repository);
const invocation = plan.vitest?.invocations.find(candidate => candidate.id === "vitest-fast-resource-sensitive");
if (!invocation) throw new Error("resource-sensitive validation invocation is missing");
if (!invocation.arguments.includes("--no-file-parallelism")) throw new Error("resource-sensitive validation is not serialized");
if (invocation.arguments.some(argument => argument.toLowerCase().includes("timeout"))) throw new Error("resource-sensitive validation must retain the default timeout");

const temporary = await mkdtemp(resolve(tmpdir(), "a1-resource-sensitive-validation-"));
const runs = [];
try {
  for (let index = 1; index <= repeats; index += 1) {
    const reporterPath = resolve(temporary, `repeat-${index}.json`);
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const exitCode = await runNpx([...invocation.arguments, "--reporter=json", "--outputFile", reporterPath]);
    if (exitCode !== 0) throw new Error(`resource-sensitive repeat ${index} failed with exit code ${exitCode}`);
    const report = JSON.parse(await readFile(reporterPath, "utf8"));
    const files = (report.testResults ?? []).map(result => summarizeFile(result, repository));
    runs.push({
      index,
      startedAt,
      durationMs: Date.now() - started,
      files,
      maxTestBodyDurationMs: Math.max(0, ...files.map(file => file.maxTestBodyDurationMs)),
    });
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const evidence = {
  schema: "a1-resource-sensitive-execution-v1",
  generatedAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  policy: {
    fileParallelism: false,
    timeoutMs: 5_000,
    timeoutSource: "vitest-default",
    retries: 0,
    timeoutOverridePresent: false,
  },
  invocation: { id: invocation.id, arguments: invocation.arguments, testFiles: invocation.evidence?.testFiles ?? [] },
  runs,
};
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output, repeats, maxTestBodyDurationMs: Math.max(...runs.map(run => run.maxTestBodyDurationMs)) }, null, 2)}\n`);

function summarizeFile(result, root) {
  const assertions = result.assertionResults ?? [];
  const testBodyDurationMs = assertions.map(assertion => Number(assertion.duration ?? 0)).filter(Number.isFinite);
  const durationMs = Number.isFinite(result.endTime - result.startTime) ? result.endTime - result.startTime : 0;
  const totalTestBodyDurationMs = testBodyDurationMs.reduce((total, duration) => total + duration, 0);
  return {
    path: normalizePath(relative(root, result.name)),
    status: result.status,
    durationMs,
    testCount: assertions.length,
    maxTestBodyDurationMs: Math.max(0, ...testBodyDurationMs),
    totalTestBodyDurationMs,
    fileOverheadMs: Math.max(0, durationMs - totalTestBodyDurationMs),
  };
}

function runNpx(arguments_) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(executable, arguments_, { cwd: repository, env: process.env, stdio: "inherit", windowsHide: true });
    child.once("error", rejectPromise);
    child.once("exit", (exitCode, signal) => {
      if (signal) rejectPromise(new Error(`resource-sensitive validation terminated by ${signal}`));
      else resolvePromise(exitCode ?? 1);
    });
  });
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizePath(path) {
  return path.split(sep).join("/").replaceAll("\\", "/");
}
