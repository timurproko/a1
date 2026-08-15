import { createPiEngineAdapter, type PiEngineAdapter } from "../../foundation/pi-engine-adapter/index.js";
import type { PiTuiTerminalPort } from "../../foundation/pi-tui-runtime-adapter/index.js";
import { PiSessionShell } from "./pi-session-shell.js";

export interface OwnedUiRunOptions {
  readonly cwd?: string;
  readonly terminal?: PiTuiTerminalPort;
  readonly adapter?: PiEngineAdapter;
}

export async function runOwnedUi(
  options: OwnedUiRunOptions = {},
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const adapter = options.adapter ?? await createPiEngineAdapter({ cwd });
  const shellOptions = options.terminal === undefined
    ? { adapter, cwd }
    : { adapter, cwd, terminal: options.terminal };
  const shell = new PiSessionShell(shellOptions);
  try {
    shell.start();
    await adapter.flushEvents();
    if (!adapter.disposed) await shell.waitUntilStopped();
    return 0;
  } finally {
    await shell.dispose();
  }
}
