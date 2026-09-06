import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertImmutableExecutionRoot, CohortStateStore, readCertifiedReleaseManifest } from "../release/index.js";
import { publishSupervisorStartupResult, supervisorStartupFailure, supervisorStartupReady, supervisorStartupResultPath } from "../lifecycle/index.js";
import { ControlStore } from "../storage/index.js";
import { resolveCohortEndpoint, resolveProductPaths } from "./paths.js";
import { SupervisorServer } from "./server.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";

export async function runSupervisor(arguments_: readonly string[] = []): Promise<void> {
  const productPaths = resolveProductPaths();
  mkdirSync(productPaths.runtimeDir, { recursive: true, mode: 0o700 });
  mkdirSync(productPaths.endpointsDir, { recursive: true, mode: 0o700 });
  let paths = productPaths;
  const log = (message: string) => appendFileSync(paths.supervisorLogPath, `${new Date().toISOString()} ${message}\n`);
  const releaseRoot = process.env[PRODUCT_IDENTITY.environment.releaseRoot];
  const releaseId = process.env[PRODUCT_IDENTITY.environment.releaseId];
  const contentDigest = process.env[PRODUCT_IDENTITY.environment.releaseDigest];
  const attemptId = startupAttempt(arguments_);
  const resultPath = attemptId ? supervisorStartupResultPath(productPaths.runtimeDir, attemptId) : null;
  let stage = "release-environment";
  let server: SupervisorServer | null = null;

  try {
    if (!releaseRoot || !releaseId || !contentDigest) throw new Error(PRODUCT_TEXT.diagnostic("supervisor must be launched from a verified immutable release"));
    stage = "release-certification";
    const release = await readCertifiedReleaseManifest(
      { releaseRoot, releaseId, contentDigest },
      resolve(paths.dataDir, "releases"),
    );
    stage = "immutable-root";
    await assertImmutableExecutionRoot(release, paths.dataDir);
    // Protocol: one endpoint per cohort: a superseded cohort keeps serving what it already has while the
    // installed release listens on its own address.
    paths = { ...productPaths, ...resolveCohortEndpoint(productPaths, release.releaseId) };
    stage = "storage";
    const bootNonce = randomUUID();
    const store = new ControlStore(paths.databasePath, bootNonce);
    const cohortState = new CohortStateStore(paths.dataDir);
    server = new SupervisorServer(
      store,
      paths,
      release,
      bootNonce,
      undefined,
      undefined,
      undefined,
      async () => (await cohortState.read()).references.active,
    );
    stage = "endpoint-listen";
    await server.listen();
    if (resultPath && attemptId) await publishSupervisorStartupResult(resultPath, supervisorStartupReady(attemptId, release.releaseId));
    log(`supervisor ${server.id} listening at ${paths.endpoint} (pid ${process.pid})`);

    let closing = false;
    const close = async (signal: string) => {
      if (closing) return;
      closing = true;
      log(`received ${signal}; stopping supervised process tree`);
      await server?.close(true);
      process.exitCode = 0;
    };
    process.on("SIGINT", () => void close("SIGINT"));
    process.on("SIGTERM", () => void close("SIGTERM"));
    process.on("uncaughtException", error => {
      log(`uncaught exception: ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
    process.on("unhandledRejection", error => log(`unhandled rejection: ${String(error)}`));
  } catch (error) {
    await server?.close(true).catch(() => undefined);
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    log(`startup failure at ${stage}: ${message}`);
    if (resultPath && attemptId && releaseId) {
      await publishSupervisorStartupResult(resultPath, supervisorStartupFailure(error, attemptId, releaseId, stage)).catch(() => undefined);
    }
    throw error;
  }
}

function startupAttempt(arguments_: readonly string[]): string | null {
  if (arguments_.length === 0) return null;
  if (arguments_.length !== 2 || arguments_[0] !== "--startup-attempt" || !arguments_[1]) {
    throw new Error(PRODUCT_TEXT.diagnostic("supervisor startup arguments are invalid"));
  }
  return arguments_[1];
}
