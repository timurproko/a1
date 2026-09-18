import { gzipSync } from "node:zlib";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupExactPackagePreparation,
  exactPackagePreparationEnvironment,
  EXACT_PACKAGE_PREPARATION_ENV,
  prepareExactPackageInstallation,
} from "../../scripts/release/exact-package-preparation.mjs";
import { createValidationPhaseRecorder } from "../../scripts/release/validation-phase.mjs";
import { cleanupExactCandidate, installExactCandidate } from "../foundation/release/package-install-fixture.js";

const roots: string[] = [];
const savedEnvironment = { ...process.env };
afterEach(async () => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnvironment)) delete process.env[key];
  Object.assign(process.env, savedEnvironment);
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("exact-package consumer fixture", () => {
  it("uses a verified shared prefix with a distinct owner root and never cleans the prefix", async () => {
    const fixture = await preparedFixture();
    Object.assign(process.env, fixture.environment, { [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup" });
    const phases = createValidationPhaseRecorder("shared-fixture-test", { emit: () => {}, head: "a".repeat(40), environment: {} });
    const installed = await installExactCandidate(phases, "a1-owner-root-");
    roots.push(installed.root);

    expect(installed).toMatchObject({ prefix: fixture.preparation.prefix, sharedPreparation: true });
    expect(installed.root).not.toBe(fixture.preparation.root);
    await cleanupExactCandidate(phases, installed.root);
    await expect(access(fixture.preparation.packageRoot)).resolves.toBeUndefined();
    await cleanupExactPackagePreparation(fixture.preparation);
  });

  it("rejects an incomplete authoritative handoff instead of silently installing again", async () => {
    const fixture = await preparedFixture();
    Object.assign(process.env, fixture.environment, { [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup" });
    delete process.env[EXACT_PACKAGE_PREPARATION_ENV.receipt];
    const phases = createValidationPhaseRecorder("rejected-fixture-test", { emit: () => {}, head: "a".repeat(40), environment: {} });
    await expect(installExactCandidate(phases, "a1-rejected-root-")).rejects.toThrow(/receipt.*missing|unbounded/);
    await expect(access(fixture.preparation.packageRoot)).resolves.toBeUndefined();
    await cleanupExactPackagePreparation(fixture.preparation);
  });
});

async function preparedFixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-consumer-fixture-")); roots.push(root);
  const candidate = join(root, "candidate.tgz");
  await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.3" }));
  const environment = { GITHUB_RUN_ID: "321", GITHUB_RUN_ATTEMPT: "2", VALIDATION_CANDIDATE_TARBALL: candidate };
  const preparation = await prepareExactPackageInstallation({
    candidatePath: candidate,
    consumers: ["package-startup", "package-contracts"],
    environment,
    rootParent: root,
    runCommand: async (_command, arguments_) => {
      if (arguments_[0] === "install") {
        const prefix = arguments_[arguments_.indexOf("--prefix") + 1]!;
        const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@fixture", "app");
        await mkdir(resolve(packageRoot, "bin"), { recursive: true });
        await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@fixture/app", version: "1.2.3" }));
      }
      return { status: 0, stdout: "", stderr: "" };
    },
  });
  return { preparation, environment: { ...environment, ...exactPackagePreparationEnvironment(preparation) } };
}

function tarball(manifest: Record<string, unknown>): Buffer {
  const content = Buffer.from(JSON.stringify({ bin: { app: "bin/cli.js" }, ...manifest }));
  const header = Buffer.alloc(512);
  header.write("package/package.json", 0, "utf8");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header[156] = "0".charCodeAt(0);
  return gzipSync(Buffer.concat([header, content, Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length), Buffer.alloc(1024)]));
}
