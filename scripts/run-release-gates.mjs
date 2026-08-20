import crossSpawn from "cross-spawn";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";

const identity = JSON.parse(await readFile(resolve("src/product-identity.json"), "utf8"));
const startedAt = new Date().toISOString();
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["vitest", "run", "test/foundation/release/update-transition.integration.test.ts", "--no-file-parallelism", "--testTimeout=120000"];
const code = await run(command, args);
const failure = code === 0 ? undefined : { command: `${command} ${args.join(" ")}`, exitCode: code };

const verdictDirectory = resolve("artifacts", "release-verdicts");
await mkdir(verdictDirectory, { recursive: true });
const verdictPath = resolve(verdictDirectory, `${platform()}-${arch()}.json`);
await writeFile(verdictPath, JSON.stringify({
  schema: identity.evidence.previewPlatformVerdictSchema,
  platform: platform(),
  architecture: arch(),
  osRelease: release(),
  runnerLabel: process.env[identity.environment.releaseRunnerLabel] ?? null,
  startedAt,
  completedAt: new Date().toISOString(),
  passed: failure === undefined,
  channel: "next",
  certificationStatus: "uncertified-development-preview",
  terminalCapability: "transparent",
  physicalHostCertification: "deferred",
  crossPlatformCertification: "deferred",
  stableReleaseEligible: false,
  requiredGates: ["architecture-independent-n-minus-one-update-transition"],
  ...(failure ? { failure } : {}),
}, null, 2));
process.stdout.write(`Release verdict: ${verdictPath}\n`);
process.exit(failure ? 1 : 0);

function run(executable, arguments_) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(executable, arguments_, { stdio: "inherit", env: process.env, windowsHide: true });
    child.once("error", rejectPromise);
    child.once("exit", (exitCode, signal) => {
      if (signal) rejectPromise(new Error(`${executable} terminated by ${signal}`));
      else resolvePromise(exitCode ?? 1);
    });
  });
}
