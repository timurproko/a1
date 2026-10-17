import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

interface TerminalHostAddon {
  runRole(arguments_: string[], host: { executable: string; entry: string; artifact: string }): number;
}

const filename = fileURLToPath(import.meta.url);
const target = `${process.platform}-${process.arch}`;
const development = process.env[PRODUCT_IDENTITY.environment.developmentInstanceId]?.trim();
const override = development ? process.env[PRODUCT_IDENTITY.environment.terminalHostPath]?.trim() : undefined;
const addonPath = resolve(override || resolve(dirname(filename), "../../native", target, `${PRODUCT_IDENTITY.artifacts.terminalHostAddon}.node`));
const addon = createRequire(import.meta.url)(addonPath) as Partial<TerminalHostAddon>;
if (typeof addon.runRole !== "function") throw new Error("terminal host addon exports are incompatible");

// Invariant: runRole blocks Node's main thread, so this entry must not register JavaScript signal
// listeners whose callbacks cannot run until the native role has already returned. Default process
// signal handling keeps attach clients and identity-verified resident roles externally stoppable.
process.env[PRODUCT_IDENTITY.environment.terminalHostPath] = addonPath;
process.exitCode = addon.runRole(process.argv.slice(2), { executable: process.execPath, entry: filename, artifact: addonPath });
