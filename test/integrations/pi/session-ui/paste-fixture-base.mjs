import { registerHooks } from "node:module";
import { tsImport } from "tsx/esm/api";
import { installClipboardAcquisitionFixture } from "./clipboard-acquisition-fixture.mjs";

/** Tests exercise the real protocol/helper without reading the machine's clipboard or filesystem hangs. */
export async function runPasteFixture(mode, trace) {
  installClipboardAcquisitionFixture(mode, "external clipboard text", trace);
  registerHooks({ resolve(specifier, context, next) {
    if (mode === "blocked-command" && specifier === "node:child_process" && context.parentURL?.includes("system-clipboard")) return {
      shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(`import { execFile as real } from 'node:child_process';
        export function execFile(command, args, options, callback) {
          return real(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); require("node:fs").writeFileSync(process.env.CLIPBOARD_COMMAND_TEST_PID, String(process.pid)); setInterval(() => {}, 1000);'], options, callback);
        }`),
    };
    if (mode === "slow-path" && specifier === "node:worker_threads" && context.parentURL?.includes("paste-helper")) return {
      shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(`import { Worker as RealWorker } from 'node:worker_threads';
        export class Worker extends RealWorker { constructor(entry, options) {
          super(typeof options.workerData === 'string' ? 'for (;;) {}' : entry,
            typeof options.workerData === 'string' ? { ...options, eval: true } : options);
        } }`),
    };
    return next(specifier, context);
  } });
  await tsImport(new URL("../../../../src/integrations/pi/session-ui/paste-helper.ts", import.meta.url).href, import.meta.url);
}
