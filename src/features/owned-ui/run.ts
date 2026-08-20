import type { OwnedUiApplicationPort } from "../../foundation/presentation-contracts/index.js";

export interface OwnedUiRunOptions {
  readonly application: OwnedUiApplicationPort;
}

export async function runOwnedUi(options: OwnedUiRunOptions): Promise<number> {
  const { application } = options;
  try {
    application.start();
    await application.flush();
    if (!application.disposed) await application.waitUntilStopped();
    return 0;
  } finally {
    await application.dispose();
  }
}
