import crossSpawn from "cross-spawn";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";

const identity = JSON.parse(await readFile(resolve("src/product-identity.json"), "utf8"));
const startedAt = new Date().toISOString();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
export const MANDATORY_RELEASE_GATES = Object.freeze([
  { id: "architecture", executable: npm, arguments: ["run", "check:architecture"] },
  { id: "compatibility-authority", executable: npx, arguments: ["vitest", "run", "test/repository-governance/pi-compatibility-authority.test.ts", "test/foundation/pi-engine-adapter/candidate-capability-mutations.test.ts", "test/repository-governance/pi-candidate-evaluator.test.ts"] },
  { id: "candidate-engine-conformance", executable: npm, arguments: ["run", "report:pi-engine-conformance"] },
  { id: "exact-vanilla-oracle", executable: npx, arguments: ["vitest", "run", "test/features/launch/exact-pi-entry.integration.test.ts"] },
  { id: "packaged-public-entry", executable: npx, arguments: ["vitest", "run", "test/foundation/release/package-surface.integration.test.ts", "--no-file-parallelism"] },
  { id: "owned-ui-regression", executable: npx, arguments: ["vitest", "run", "test/features/owned-ui/pi-session-shell.test.ts", "test/features/owned-ui/pi-startup-composition-parity.test.ts"] },
  { id: "extension-behavior", executable: npx, arguments: ["vitest", "run", "test/foundation/pi-component-adapter/extension-ui-bridge.test.ts"] },
  { id: "architecture-independent-n-minus-one-update-transition", executable: npx, arguments: ["vitest", "run", "test/foundation/release/update-transition.integration.test.ts", "--no-file-parallelism", "--testTimeout=120000"] },
]);

let failure;
for (const gate of MANDATORY_RELEASE_GATES) {
  const code = await run(gate.executable, gate.arguments);
  if (code !== 0) {
    failure = { gate: gate.id, command: `${gate.executable} ${gate.arguments.join(" ")}`, exitCode: code };
    break;
  }
}

const verdictDirectory = resolve("artifacts", "release-verdicts");
await mkdir(verdictDirectory, { recursive: true });
const verdictPath = resolve(verdictDirectory, `${platform()}-${arch()}.json`);
await writeFile(verdictPath, JSON.stringify({
  schema: identity.evidence.previewPlatformVerdictSchema,
  platform: platform(), architecture: arch(), osRelease: release(),
  runnerLabel: process.env[identity.environment.releaseRunnerLabel] ?? null,
  startedAt, completedAt: new Date().toISOString(), passed: failure === undefined,
  channel: "next", certificationStatus: "uncertified-development-preview", terminalCapability: "transparent",
  physicalHostCertification: "deferred", crossPlatformCertification: "deferred", stableReleaseEligible: false,
  requiredGates: MANDATORY_RELEASE_GATES.map(gate => gate.id),
  ...(failure ? { failure } : {}),
}, null, 2));
process.stdout.write(`Release verdict: ${verdictPath}\n`);
process.exit(failure ? 1 : 0);

function run(executable, arguments_) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(executable, arguments_, { stdio: "inherit", env: process.env, windowsHide: true });
    child.once("error", rejectPromise);
    child.once("exit", (exitCode, signal) => signal ? rejectPromise(new Error(`${executable} terminated by ${signal}`)) : resolvePromise(exitCode ?? 1));
  });
}
