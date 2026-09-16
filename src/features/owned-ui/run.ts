import type { OwnedUiApplicationPort } from "../../contracts/presentation/index.js";
import type { OwnedUiSettingsSession } from "../../ui/settings/index.js";
import { markStartupPhase } from "../../foundation/startup/index.js";
import { boundedCleanup } from "../../foundation/terminal-cleanup/index.js";

const PROCESS_OUTPUT_FLUSH_TIMEOUT_MS = 250;

export interface OwnedUiRunOptions {
  readonly application: OwnedUiApplicationPort;
  /**
   * Resolved once before the application starts, so every surface reads the same
   * values for the life of the session. Omitted when the caller runs without settings.
   */
  readonly settings?: OwnedUiSettingsSession;
}

/**
 * Completes the interactive executable only after runOwnedUi has restored its terminal.
 * Extensions are untrusted process guests and can retain servers or timers after session
 * shutdown, so assigning exitCode alone cannot guarantee return to the invoking shell.
 */
export async function terminateOwnedUiProcess(code: number): Promise<never> {
  process.exitCode = code;
  await Promise.all([flushProcessOutput(process.stdout), flushProcessOutput(process.stderr)]);
  return process.exit(code);
}

export async function runOwnedUi(options: OwnedUiRunOptions): Promise<number> {
  const { application, settings } = options;
  let failed = false;
  let originalFailure: unknown;
  try {
    if (settings) await settings.load();
    application.start();
    await application.flush();
    await markStartupPhase(process.env, "first-input-ready-render");
    if (!application.disposed) await application.waitUntilStopped();
    return 0;
  } catch (error) {
    failed = true;
    originalFailure = error;
    throw error;
  } finally {
    try { await boundedCleanup(() => application.dispose(), 2500); }
    catch (error) {
      if (failed) throw new AggregateError([originalFailure, error], "Owned UI run and cleanup failed", { cause: originalFailure });
      throw error;
    }
  }
}

async function flushProcessOutput(stream: NodeJS.WriteStream): Promise<void> {
  if (stream.destroyed || !stream.writable) return;
  await new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, PROCESS_OUTPUT_FLUSH_TIMEOUT_MS);
    try { stream.write("", finish); } catch { finish(); }
  });
}
