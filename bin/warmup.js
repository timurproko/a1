#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.assertImmutableWarmupEnvironment(process.env);
startup.enableEnvironmentCompileCache(process.env);

// Security: this entry imports but never composes, so it creates no terminal, profile/session
// path, trust callback, executable resource loader, extension runner, or network client.
const [composition, engine, components, runtime] = await Promise.all([
  import("../dist/composition/index.js"),
  import("../dist/integrations/pi/engine/index.js"),
  import("../dist/integrations/pi/components/index.js"),
  import("../dist/integrations/pi/tui-runtime/index.js"),
]);
if (typeof composition.composeOwnedUi !== "function" || typeof engine.createPiEngineAdapter !== "function"
  || typeof components.applyConfiguredPiTheme !== "function" || typeof runtime.createPiTerminalBridge !== "function") {
  throw new Error("immutable startup graph is incomplete");
}
