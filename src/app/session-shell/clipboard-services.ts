import type { HelperPool } from "./helper-pool.js";
import { createPasteHelperPool } from "./paste-executor.js";
import { createCopyHelperPool } from "./response-copy-transport.js";

/**
 * Process-wide clipboard helper spares. Composition creates one and every session shell borrows it, so N
 * sessions keep at most one spare paste helper and one spare copy helper instead of 2N. Shells warm the
 * pools after their first frame; only the creator disposes them.
 */
export interface OwnedUiClipboardServices {
  readonly paste: HelperPool;
  readonly copy: HelperPool;
  dispose(): void;
}

export interface OwnedUiClipboardServicesOptions {
  /** Package/fault-test seams for the forked helpers' entries. */
  readonly pasteHelper?: URL;
  readonly copyHelper?: URL;
  /** Idle bound for both spares; production keeps the default. */
  readonly spareIdleMs?: number;
}

export function createOwnedUiClipboardServices(options: OwnedUiClipboardServicesOptions = {}): OwnedUiClipboardServices {
  const paste = createPasteHelperPool(options.pasteHelper, options.spareIdleMs);
  const copy = createCopyHelperPool(options.copyHelper, options.spareIdleMs);
  return { paste, copy, dispose: () => { paste.dispose(); copy.dispose(); } };
}
