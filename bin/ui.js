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
const [{ fileURLToPath }, identity, descriptor] = await Promise.all([
  import("node:url"),
  import("./module-identity.js"),
  import("../dist/foundation/startup/startup-descriptor.js"),
]);
const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
identity.configurePinnedPiPublicPackage(packageRootPath);
// Performance: begin the exact launch graph together while the trace write is pending.
// Direct owned-module entries avoid evaluating unrelated barrel exports before first paint.
const modules = descriptor.loadDeclaredStartupGraph();
await startup.markStartupPhase(process.env, "ui-entry");
const [
  { runSelectedInteractiveRuntime },
  { parseSessionSelection },
  { createConsoleProjectTrustPrompt },
  { createConsoleSessionForkPrompt },
  { runOwnedUi, terminateOwnedUiProcess },
  { composeOwnedUi },
] = await modules;

// Compatibility: before the composition uses pinned Pi's terminal stack: confirm A1 and Pi
// resolve it to the same copy, so extensions and the owned UI share one module identity.
identity.assertSinglePiTuiModuleAtLaunch(packageRootPath, (/** @type {string} */ message) => process.stderr.write(message));
await startup.markStartupPhase(process.env, "ui-modules-loaded");

const sessionSelection = parseSessionSelection(process.argv.slice(2));
Promise.resolve().then(() => {
  if (sessionSelection && profile !== "a1") throw new Error("session selection requires the normal A1 profile");
  return runSelectedInteractiveRuntime(profile, {
    ownedUi: async (profileId, ownedSurfaces) => {
      const { application, settings } = await composeOwnedUi({
        cwd: process.cwd(),
        profileId,
        ownedSurfaces,
        projectTrustPrompt: createConsoleProjectTrustPrompt({ presentation: profile === "a1" ? "bare" : "comparison" }),
        sessionForkPrompt: createConsoleSessionForkPrompt(),
        ...(sessionSelection === undefined ? {} : { sessionSelection }),
      });
      runningApplication = application;
      return await runOwnedUi({ application, ...(settings === null ? {} : { settings }) });
    },
  });
}).then(
  code => {
    fatal?.remove();
    return terminateOwnedUiProcess(code);
  },
  error => {
    if (fatal && error?.name !== "PiSessionSelectionError") { fatal.fail(error); return; }
    fatal?.remove();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error?.name === "PiSessionSelectionError" ? error.exitCode : 1;
  },
);
