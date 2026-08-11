import crossSpawn from "cross-spawn";
import { mkdir, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";

const startedAt = new Date().toISOString();
const commands = [
  [process.platform === "win32" ? "npm.cmd" : "npm", ["run", "test:scenario"]],
  [process.platform === "win32" ? "npx.cmd" : "npx", ["vitest", "run", "test/scenarios/packaged-real-pi.test.ts", "test/scenarios/packaged-extension.test.ts", "test/scenarios/packaged-multi-cli.test.ts", "test/scenarios/update-transition.test.ts", "--testTimeout=120000"]],
];
let failure;
for (const [command, args] of commands) {
  const code = await run(command, args);
  if (code !== 0) {
    failure = { command: `${command} ${args.join(" ")}`, exitCode: code };
    break;
  }
}

const verdictDirectory = resolve("artifacts", "release-verdicts");
await mkdir(verdictDirectory, { recursive: true });
const verdictPath = resolve(verdictDirectory, `${platform()}-${arch()}.json`);
await writeFile(verdictPath, JSON.stringify({
  schema: "addone-release-platform-verdict-v1",
  platform: platform(),
  architecture: arch(),
  osRelease: release(),
  runnerLabel: process.env.ADDONE_RELEASE_RUNNER_LABEL ?? null,
  piExecutable: process.env.ADDONE_REAL_PI_EXECUTABLE ?? "PATH:pi",
  startedAt,
  completedAt: new Date().toISOString(),
  passed: failure === undefined,
  requiredGates: ["generic-deterministic-terminal-corpus", "deterministic-terminal-host", "flicker-free-50-question-conversation", "packaged-multi-cli", "packaged-real-pi", "representative-native-pi-extension", "terminal-architecture-prohibition", "n-minus-one-update-transition"],
  ...(failure ? { failure } : {}),
}, null, 2));
process.stdout.write(`Release verdict: ${verdictPath}\n`);
process.exit(failure ? 1 : 0);

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, args, { stdio: "inherit", env: process.env, windowsHide: true });
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (signal) rejectPromise(new Error(`${command} terminated by ${signal}`));
      else resolvePromise(code ?? 1);
    });
  });
}
