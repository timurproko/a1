import { SessionNamingController } from "../features/session-naming/index.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";
import type { ComposedSessionBackend } from "./session-backend.js";

/** Connect product policy to the engine and consume verified context under lifecycle coordination. */
export function bindAutomaticSessionNaming(backend: ComposedSessionBackend, settings: OwnedSettingsManager | null, bare: boolean) {
  if (!bare || !backend.naming) return { dispose() {} };
  const naming = new SessionNamingController({
    backend, naming: backend.naming,
    enabled: () => settings?.value("sessionAutoName") ?? true,
    format: () => settings?.value("sessionNameFormat") ?? "sentence",
    withContext: async (consume, signal) => {
      const sessionId = backend.identity.currentHistorySessionId();
      const sessionFile = backend.identity.currentSessionFile();
      if (!sessionId || !sessionFile) throw new Error("session identity unavailable");
      const { withSessionRepositoryObservation } = await import("../foundation/lifecycle/session-repository-context.js");
      return await withSessionRepositoryObservation({ sessionId, sessionFile }, consume, { signal });
    },
  });
  const unsubscribe = settings?.onChange(() => naming.settingsChanged()) ?? (() => {});
  let disposed = false;
  return { dispose() { if (disposed) return; disposed = true; naming.dispose(); unsubscribe(); } };
}
