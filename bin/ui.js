#!/usr/bin/env node

// Invariant: one terminal module identity per process, decided before any A1 or Pi module loads.
const { installPinnedPiTuiResolver } = await import("./module-resolver.js");
installPinnedPiTuiResolver(new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1").replace(/\/$/, ""));
const startup = await import("../dist/foundation/startup/startup-runtime.js");
startup.enableEnvironmentCompileCache(process.env);
const { readLaunchContext } = await import("../dist/foundation/launch-context/index.js");
const launchContext = readLaunchContext(process.env, "profile");
const profile = launchContext.launchProfile;
if (profile === undefined) throw new Error("A1 launch profile is missing");
const { parseInteractiveLaunchArguments } = await import("../dist/features/launch/interactive-arguments.js");
const launchArguments = parseInteractiveLaunchArguments(process.argv.slice(2));
if (profile !== "a1" && Object.keys(launchArguments).length > 0) throw new Error("startup arguments require the normal A1 profile");
/** @type {import('../dist/features/owned-ui/herdr-binding.js').HerdrBindingReservation | undefined} */
let herdrBinding;
if (profile === "a1") {
  const [{ randomUUID }, { PRODUCT_IDENTITY }] = await Promise.all([
    import("node:crypto"),
    import("../dist/product-identity.js"),
  ]);
  // Invariant: every UI process is its own session runtime, never one inherited from a parent shell.
  const runtimeId = randomUUID();
  process.env[PRODUCT_IDENTITY.environment.sessionRuntimeId] = runtimeId;
  if (process.env.HC_TERMINAL_ID) {
    const { reserveHerdrBinding } = await import("../dist/features/owned-ui/herdr-binding.js");
    herdrBinding = await reserveHerdrBinding(runtimeId);
  }
}
const { installFatalExit } = await import("../dist/foundation/terminal-cleanup/fatal-exit.js");
const { resolveProductPaths } = await import("../dist/foundation/lifecycle/paths.js");
const { join } = await import("node:path");
/** @type {{ dispose(): void | Promise<unknown> } | undefined} */
let runningApplication;
const fatal = profile === "a1" ? installFatalExit({
  directory: join(resolveProductPaths().runtimeDir, "crashes"),
  ...(launchContext.releaseId === undefined ? {} : { releaseId: launchContext.releaseId }),
  dispose: () => runningApplication?.dispose(),
}) : undefined;
const [{ fileURLToPath }, identity] = await Promise.all([
  import("node:url"),
  import("./module-identity.js"),
]);
const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
identity.configurePinnedPiPublicPackage(packageRootPath);

// Compatibility: before either composition uses pinned Pi's terminal stack, confirm A1 and Pi
// resolve it to the same copy so every owned screen shares one module identity.
const assertPiTuiIdentity = () => identity.assertSinglePiTuiModuleAtLaunch(
  packageRootPath,
  (/** @type {string} */ message) => process.stderr.write(message),
);

{
  const descriptor = await import("../dist/foundation/startup/startup-descriptor.js");
  // Performance: begin the exact Agent launch graph together while the trace write is pending.
  // Direct owned-module entries avoid evaluating unrelated barrel exports before first paint.
  const modules = descriptor.loadDeclaredStartupGraph();
  await startup.markStartupPhase(process.env, "ui-entry");
  const [
    { runSelectedInteractiveRuntime },
    ,
    { createConsoleProjectTrustPrompt },
    { createConsoleSessionForkPrompt },
    { runOwnedUi, terminateOwnedUiProcess },
    { composeOwnedUi },
  ] = await modules;

  assertPiTuiIdentity();
  await startup.markStartupPhase(process.env, "ui-modules-loaded");

  completeRun(Promise.resolve().then(async () => {
    return runSelectedInteractiveRuntime(profile, {
      ownedUi: async (profileId, productMode) => {
        const { application, settings } = await composeOwnedUi({
          cwd: process.cwd(),
          profileId,
          productMode,
          projectTrustPrompt: createConsoleProjectTrustPrompt({ productMode, ...(launchArguments.sessionColor === undefined ? {} : { sessionColor: launchArguments.sessionColor }) }),
          sessionForkPrompt: createConsoleSessionForkPrompt(),
          ...launchArguments,
          ...(herdrBinding === undefined ? {} : { herdrBinding }),
        });
        runningApplication = application;
        return await runOwnedUi({ application, ...(settings === null ? {} : { settings }) });
      },
    });
  }), terminateOwnedUiProcess);
}

/** @param {Promise<number>} run @param {(code: number) => Promise<never>} terminate */
function completeRun(run, terminate) {
  run.then(
    code => {
      fatal?.remove();
      return terminate(code);
    },
    error => {
      const sessionSelectionError = error?.name === "PiSessionSelectionError";
      const trustExit = error?.name === "ProjectTrustPromptExitError";
      if (fatal && !sessionSelectionError && !trustExit) { fatal.fail(error); return; }
      fatal?.remove();
      if (trustExit) return terminate(error.exitCode);
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = sessionSelectionError ? error.exitCode : 1;
    },
  );
}
