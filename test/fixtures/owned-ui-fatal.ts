import { spawn } from "node:child_process";
import { writeSync } from "node:fs";
import { installFatalExit, restoreAfterOwnedExit, EMERGENCY_TERMINAL_RESET } from "../../src/foundation/terminal-cleanup/index.js";

const [mode, directory] = process.argv.slice(2);
const restore = () => { writeSync(1, EMERGENCY_TERMINAL_RESET); };
if (mode === "owner") {
  const child = spawn(process.execPath, ["--import", "tsx", process.argv[1]!, "abrupt", directory!], { stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.once("close", (code, signal) => { process.exitCode = restoreAfterOwnedExit(true, code, signal, restore); });
} else {
  const fatal = installFatalExit({
    directory: directory!, releaseId: "test-release", restore, timeoutMs: 150,
    dispose: () => {
      if (mode === "stall") return new Promise(() => {});
      if (mode === "dispose-error") throw new Error("private cleanup content");
    },
  });
  writeSync(1, "\x1b[?1049h\x1b[?1003h\x1b[?1002h\x1b[?1006h\x1b[?2004h\x1b[?25l\x1b[?7lCHILD-LAST");
  if (mode === "abrupt") process.exit(9);
  else if (mode === "normal") { fatal.remove(); restore(); writeSync(1, "NORMAL-EXIT"); }
  else if (mode === "exception") setImmediate(() => { throw new TypeError("private prompt image data secret"); });
  else if (mode === "duplicate") { fatal.fail(new Error("private image")); fatal.fail(new Error("private duplicate")); }
  else setImmediate(() => { void Promise.reject(new TypeError("private prompt image data secret")); });
}
