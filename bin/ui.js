#!/usr/bin/env node

// Security: this helper has no A1, Pi, tool, or extension dependency and erases credentials before those modules load.
const { assignFreshSessionRuntimeId, consumeTabLaunchContext, formatResidentFallbackNotice, waitForStandbyPromotion } = await import("./tab-launch-context.js");
const { uiArguments, tabCredentials, tabDataDir, tabIncarnation, tabStandby } = consumeTabLaunchContext(process.argv.slice(2), process.env);

// Invariant: one terminal module identity per process, decided before any A1 or Pi module loads.
const { installPinnedPiTuiResolver } = await import("./module-resolver.js");
installPinnedPiTuiResolver(new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1").replace(/\/$/, ""));
const utilityRoute = tabCredentials === undefined
  ? null
  : (await import("../dist/foundation/resident-tabs/routes.js")).residentUtilityRoute(tabCredentials.tabId);
const startup = await import("../dist/foundation/startup/startup-runtime.js");
startup.enableEnvironmentCompileCache(process.env);
const { hidesTabSettings, readLaunchContext } = await import("../dist/foundation/launch-context/index.js");
const launchContext = readLaunchContext(process.env, "profile");
const profile = launchContext.launchProfile;
if (profile === undefined) throw new Error("A1 launch profile is missing");
if (profile === "a1") {
  const [{ randomUUID }, { PRODUCT_IDENTITY }] = await Promise.all([
    import("node:crypto"),
    import("../dist/product-identity.js"),
  ]);
  assignFreshSessionRuntimeId(process.env, PRODUCT_IDENTITY.environment.sessionRuntimeId, randomUUID);
}
const { installFatalExit } = await import("../dist/foundation/terminal-cleanup/fatal-exit.js");
const { resolveProductPaths } = await import("../dist/foundation/lifecycle/paths.js");
const { dirname, join } = await import("node:path");
/** @type {{ dispose(): void | Promise<unknown> } | undefined} */
let runningApplication;
const fatal = profile === "a1" ? installFatalExit({
  directory: tabDataDir === undefined
    ? join(resolveProductPaths().runtimeDir, "crashes")
    : join(dirname(tabDataDir), "diagnostics"),
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

if (utilityRoute !== null) {
  if (profile !== "a1" || tabCredentials === undefined) throw new Error("utility tabs require the normal A1 tab profile");
  await startup.markStartupPhase(process.env, "ui-entry");
  assertPiTuiIdentity();
  const utility = await import("../dist/composition/utility-tab.js");
  await startup.markStartupPhase(process.env, "ui-modules-loaded");
  const bridge = new (await import("../dist/foundation/resident-tabs/bridge-client.js")).TabBridgeClient({ credentials: tabCredentials });
  completeRun(utility.runUtilityTab({
    route: utilityRoute,
    bridge,
    cwd: process.cwd(),
    profileId: profile,
    onApplication: application => { runningApplication = application; },
  }), utility.terminateOwnedUiProcess);
} else {
  const descriptor = await import("../dist/foundation/startup/startup-descriptor.js");
  // Performance: begin the exact Agent launch graph together while the trace write is pending.
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

  if (tabStandby) await waitForStandbyPromotion(process.stdin, tabDataDir === undefined ? undefined : join(tabDataDir, "standby-promote"));
  assertPiTuiIdentity();
  await startup.markStartupPhase(process.env, "ui-modules-loaded");

  const sessionSelection = parseSessionSelection(uiArguments);
  completeRun(Promise.resolve().then(async () => {
    const tab = tabCredentials === undefined ? undefined : {
      bridge: new (await import("../dist/foundation/resident-tabs/bridge-client.js")).TabBridgeClient({ credentials: tabCredentials }),
      dataDir: /** @type {string} */ (tabDataDir),
      incarnation: /** @type {number} */ (tabIncarnation),
    };
    if (sessionSelection && profile !== "a1") throw new Error("session selection requires the normal A1 profile");
    return runSelectedInteractiveRuntime(profile, {
      ownedUi: async (profileId, ownedSurfaces) => {
        const processInspector = ownedSurfaces
          ? await import("../dist/foundation/process-containment/native-process-inspector.js")
            .then(module => module.createNativeProcessInspector(process.env, process.platform, launchContext.releaseRoot))
            .catch(() => null)
          : null;
        const { application, settings } = await composeOwnedUi({
          cwd: process.cwd(),
          profileId,
          ownedSurfaces,
          notificationVersion: launchContext.updateVersion,
          ...(hidesTabSettings(launchContext) ? { hideTabSettings: true } : {}),
          ...(processInspector === null ? {} : { inspectProcess: pid => processInspector.observe(pid) }),
          projectTrustPrompt: createConsoleProjectTrustPrompt({ presentation: profile === "a1" ? "bare" : "comparison" }),
          sessionForkPrompt: createConsoleSessionForkPrompt(),
          ...(sessionSelection === undefined ? {} : { sessionSelection }),
          ...(tab === undefined ? {} : { tab }),
          ...(launchContext.residentFallback === undefined ? {} : {
            residentFallbackNotice: formatResidentFallbackNotice(launchContext.residentFallback),
          }),
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
