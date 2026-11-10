export { assertLaunchProfileId } from "./model.js";
export type { LaunchProfileId, ProcessIdentity } from "./model.js";
export { PID_LIVENESS_IDENTITY, inspectLiveProcess } from "./process-liveness.js";
export { resolveProductPaths, resolveUserExportsDirectory } from "./paths.js";

/** Load optional export file-writing support only when an export is requested. */
export async function reserveUserExport(...args: Parameters<typeof import("./user-exports.js")["reserveUserExport"]>) {
  return (await import("./user-exports.js")).reserveUserExport(...args);
}
export type { ProductPaths } from "./paths.js";
export { parseSessionSelection, sessionSelectionArguments } from "./session-selection.js";
export type { SessionSelection } from "./session-selection.js";
export {
  PRIMARY_SESSION_AGENT_ID,
  activateSessionRepositoryContext,
  clearSessionRepositoryContext,
  listSessionRepositoryWorktrees,
  readSessionRepositoryContext,
  registerSessionRepositoryRuntime,
  releaseSessionRepositoryRuntime,
  setSessionRepositoryContext,
  withSessionRepositoryObservation,
} from "./session-repository-context.js";
export type {
  SessionRepositoryContext,
  SessionRepositoryContextOptions,
  SessionRepositoryIdentity,
  SessionRepositoryObservation,
  SessionWorktreeInventoryEntry,
  SessionWorktreeStatus,
} from "./session-repository-context.js";
