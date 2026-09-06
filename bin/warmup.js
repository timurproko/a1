#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.assertImmutableWarmupEnvironment(process.env);
startup.enableEnvironmentCompileCache(process.env);

// Security: this entry imports the exact interactive graph but never composes it, so it
// creates no terminal, profile/session path, trust callback, executable resource loader,
// extension runner, or network client.
const [identity, launch, selection, trustPrompt, forkPrompt, run, composition] = await Promise.all([
  import("./module-identity.js"),
  import("../dist/features/launch/runtime-selection.js"),
  import("../dist/foundation/lifecycle/session-selection.js"),
  import("../dist/features/owned-ui/project-trust-prompt.js"),
  import("../dist/features/owned-ui/session-fork-prompt.js"),
  import("../dist/features/owned-ui/run.js"),
  import("../dist/composition/owned-ui.js"),
]);
if (typeof identity.assertSinglePiTuiModuleAtLaunch !== "function"
  || typeof launch.runSelectedInteractiveRuntime !== "function"
  || typeof selection.parseSessionSelection !== "function"
  || typeof trustPrompt.createConsoleProjectTrustPrompt !== "function"
  || typeof forkPrompt.createConsoleSessionForkPrompt !== "function"
  || typeof run.runOwnedUi !== "function"
  || typeof composition.composeOwnedUi !== "function") {
  throw new Error("immutable startup graph is incomplete");
}
