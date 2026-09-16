import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import * as pi from "@earendil-works/pi-coding-agent";
import { runOwnedUi } from "../../src/features/owned-ui/index.js";
import { createPiEngineAdapter } from "../../src/integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../../src/integrations/pi/session-ui/index.js";
import { TestPresentationTerminal } from "../features/owned-ui/neutral-port-doubles.js";
import { createCommandOutcomeState } from "../integrations/pi/session-ui/command-outcome-state.mjs";

const [route, home] = process.argv.slice(2);
if ((route !== "slash" && route !== "chord") || !home) throw new Error("Invalid graceful-quit fixture arguments");
await mkdir(home, { recursive: true });
const state = createCommandOutcomeState(home, { command: "quit", condition: "success" }, pi);
const adapter = await createPiEngineAdapter({
  cwd: home,
  agentDir: join(home, "agent"),
  createRuntime: async () => state.runtime,
  workflowHost: state.host,
});
const terminal = new TestPresentationTerminal();
const shell = new OwnedUiSessionShell({
  backend: adapter,
  cwd: home,
  terminal,
  sessionLayout: "custom-viewport",
  startup: { quiet: true },
});
const application = {
  get disposed() { return adapter.disposed; },
  start: () => shell.start(),
  flush: () => adapter.flushEvents(),
  waitUntilStopped: () => shell.waitUntilStopped(),
  dispose: () => shell.dispose(),
};

const running = runOwnedUi({ application });
for (let attempt = 0; attempt < 100 && !terminal.active; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 10));
}
if (!terminal.active) throw new Error("Owned UI did not become input-ready");
if (route === "slash") {
  terminal.input("/quit");
  terminal.input("\r");
} else {
  terminal.input("\u0003");
  terminal.input("\u0003");
}
const exitCode = await running;
const controls = terminal.writes.join("");
process.stdout.write(`${JSON.stringify({
  route,
  exitCode,
  terminalActive: terminal.active,
  runtimeState: shell.runtime.state,
  backendDisposed: adapter.disposed,
  altScreenRestored: controls.includes("\u001b[?1049l"),
  mouseReportingDisabled: controls.includes("\u001b[?1003l") && controls.includes("\u001b[?1006l"),
  parentShellContinuation: "parent-shell-ready",
})}\n`);
