import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

interface TerminalHostAddon {
  runRole(arguments_: string[], host: { executable: string; entry: string }): number;
}

const filename = fileURLToPath(import.meta.url);
const target = `${process.platform}-${process.arch}`;
const development = process.env[PRODUCT_IDENTITY.environment.developmentInstanceId]?.trim();
const override = development ? process.env[PRODUCT_IDENTITY.environment.terminalHostPath]?.trim() : undefined;
const addonPath = resolve(override || resolve(dirname(filename), "../../native", target, "terminal-host.node"));
const addon = createRequire(import.meta.url)(addonPath) as Partial<TerminalHostAddon>;
if (typeof addon.runRole !== "function") throw new Error("terminal host addon exports are incompatible");

// Invariant: the fixed role owns its terminal and shutdown protocol. Node's default signal exit
// must not pre-empt the native cleanup while runRole blocks this process's main thread.
const ignoreSignal = (): void => undefined;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, ignoreSignal);
process.env[PRODUCT_IDENTITY.environment.terminalHostPath] = addonPath;
try {
  process.exitCode = addon.runRole(process.argv.slice(2), { executable: process.execPath, entry: filename });
} finally {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.off(signal, ignoreSignal);
}
