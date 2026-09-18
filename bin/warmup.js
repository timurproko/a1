#!/usr/bin/env node

// Invariant: one terminal module identity per process, decided before any A1 or Pi module loads.
const [{ installPinnedPiTuiResolver }, { fileURLToPath: toPath }] = await Promise.all([import("./module-resolver.js"), import("node:url")]);
installPinnedPiTuiResolver(toPath(new URL("..", import.meta.url)));
const startup = await import("../dist/foundation/startup/startup-runtime.js");
startup.assertImmutableWarmupEnvironment(process.env);
startup.enableEnvironmentCompileCache(process.env);
const [{ fileURLToPath }, identity, descriptor] = await Promise.all([
  import("node:url"),
  import("./module-identity.js"),
  import("../dist/foundation/startup/startup-descriptor.js"),
]);
identity.configurePinnedPiPublicPackage(fileURLToPath(new URL("..", import.meta.url)));

// Security: this entry imports the exact interactive graph but never composes it, so it
// creates no terminal, profile/session path, trust callback, executable resource loader,
// extension runner, or network client.
const [launch, selection, trustPrompt, forkPrompt, run, composition] = await descriptor.loadDeclaredStartupGraph();
if (typeof identity.assertSinglePiTuiModuleAtLaunch !== "function"
  || typeof launch.runSelectedInteractiveRuntime !== "function"
  || typeof selection.parseSessionSelection !== "function"
  || typeof trustPrompt.createConsoleProjectTrustPrompt !== "function"
  || typeof forkPrompt.createConsoleSessionForkPrompt !== "function"
  || typeof run.runOwnedUi !== "function"
  || typeof composition.composeOwnedUi !== "function") {
  throw new Error("immutable startup graph is incomplete");
}
