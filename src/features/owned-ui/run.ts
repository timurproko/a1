import type { OwnedUiApplicationPort } from "../../foundation/presentation-contracts/index.js";
import type { OwnedUiSettingsSession } from "../../foundation/owned-ui-settings/index.js";

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
  try {
    if (settings) await settings.load();
    application.start();
    await application.flush();
    if (!application.disposed) await application.waitUntilStopped();
    return 0;
  } finally {
    await application.dispose();
  }
}
