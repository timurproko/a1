import { join } from "node:path";
import { startIntegrationControl } from "../../../src/composition/integration-api.js";
import { OwnedSettingsManager } from "../../../src/ui/settings/index.js";
import type { OwnedUiSessionBackend, OwnedUiSessionNameState } from "../../../src/contracts/owned-ui/index.js";

const [root, sessionId, runtimeId] = process.argv.slice(2) as [string, string, string];
const settings = new OwnedSettingsManager({ configDir: join(root, "profile"), profileId: "a1" });
const listeners = new Set<() => void>();
const identity = { sessionId, sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
const backend = { identity, session: { onEvent: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } } } as unknown as OwnedUiSessionBackend;
let name: string | null = null, nameEntryId: string | null = null, nameSequence = 0;
const naming = {
  state: (): OwnedUiSessionNameState => ({ sessionFile: "fixture", binding: identity.sessionBindingGeneration, name, nameEntryId, source: name ? "user" : "unnamed", completedContext: null }),
  complete: async () => null, apply: () => false,
  rename: (expected: OwnedUiSessionNameState, next: string) => {
    if (expected.binding !== identity.sessionBindingGeneration || expected.nameEntryId !== nameEntryId) return false;
    if (next !== name) { name = next; nameEntryId = String(++nameSequence); }
    return true;
  },
};
const control = await startIntegrationControl({ ...backend, naming }, settings, join(root, "runtime"), runtimeId);
process.on("message", async input => {
  const request = input as { action: string; color?: string; sessionId?: string };
  if (request.action === "default") await settings.change("a1", "defaultAccentColor", request.color!);
  if (request.action === "current") await settings.change("a1", "accentColor", request.color!);
  if (request.action === "replace") {
    identity.sessionId = request.sessionId!; identity.sessionBindingGeneration++;
    name = null; nameEntryId = null;
    settings.startSession(); for (const listener of listeners) listener();
  }
  if (request.action === "stop") { identity.disposed = true; await control.dispose(); process.send?.({ stopped: true }); process.disconnect(); return; }
  process.send?.({ color: settings.value("accentColor") });
});
process.send?.({ ready: true });
