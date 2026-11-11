import type { OwnedUiWorkflowResult } from "../../../contracts/owned-ui/index.js";
import { isRecord, stringProperty } from "./message-values.js";

/** Pinned session-cwd prompt policy, adapted without importing Pi's private modules. */
export function missingSessionCwdRecovery(error: unknown): (Pick<OwnedUiWorkflowResult, "message"> & {
  readonly options: readonly { readonly id: "continue" | "fork" | "cancel"; readonly label: string }[];
  readonly cwdRecovery: { readonly fallbackCwd: string };
}) | undefined {
  const issue = isRecord(error) && isRecord(error.issue) ? error.issue : undefined;
  const fallbackCwd = issue === undefined ? undefined : stringProperty(issue, "fallbackCwd");
  const sessionCwd = issue === undefined ? undefined : stringProperty(issue, "sessionCwd");
  if (fallbackCwd === undefined || sessionCwd === undefined) return undefined;
  return {
    message: `Session cwd does not exist: ${sessionCwd}`,
    cwdRecovery: { fallbackCwd },
    options: [
      { id: "continue", label: `Continue in ${fallbackCwd} (asks again next time)` },
      { id: "fork", label: `Fork into ${fallbackCwd} (new session ID, original kept)` },
      { id: "cancel", label: "Cancel" },
    ],
  };
}
