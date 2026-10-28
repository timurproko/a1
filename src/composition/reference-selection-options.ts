import { readFileSync } from "node:fs";
import type { ReferenceDocumentSelectionOptions } from "../features/owned-ui/reference-document-selection.js";

/** Builds the Changelog selection clipboard policy without loading Pi's engine in a utility tab. */
export function createReferenceSelectionOptions(
  settingsFile: string,
  copyText: ((text: string) => boolean | void) | undefined,
): ReferenceDocumentSelectionOptions {
  return {
    copyOnSelect: () => {
      try {
        const document = JSON.parse(readFileSync(settingsFile, "utf8")) as Record<string, unknown>;
        return typeof document.fullscreenCopyOnSelect === "boolean" ? document.fullscreenCopyOnSelect : true;
      } catch {
        return true;
      }
    },
    copyText: copyText ?? (() => false),
  };
}
