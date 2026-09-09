import type { OwnedUiApplicationPort } from "../../contracts/presentation/index.js";
import type { OwnedUiSettingsSession } from "../../ui/settings/index.js";
import { markStartupPhase } from "../../foundation/startup/index.js";
import { boundedCleanup } from "../../foundation/terminal-cleanup/index.js";

export interface OwnedUiRunOptions {
  readonly application: OwnedUiApplicationPort;
  /**
   * Resolved once before the application starts, so every surface reads the same
   * values for the life of the session. Omitted when the caller runs without settings.
   */
  readonly settings?: OwnedUiSettingsSession;
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
