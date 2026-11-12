import { join } from "node:path";
import { reserveHerdrBinding } from "../../../src/features/owned-ui/herdr-binding.js";
import { startSessionColorControl } from "../../../src/composition/session-colors.js";
import { OwnedSettingsManager } from "../../../src/ui/settings/index.js";
import type { OwnedUiSessionBackend } from "../../../src/contracts/owned-ui/index.js";
const [root, runtimeId, sessionId] = process.argv.slice(2) as [string, string, string];
const reservation = await reserveHerdrBinding(runtimeId, { HC_TERMINAL_ID: "t5z" }, join(root, "bindings"));
if (!reservation) throw new Error("fixture reservation failed");
const settings = new OwnedSettingsManager({ profileDir: join(root, "profile"), profileId: "a1", sessionColor: "green" });
const listeners = new Set<() => void>();
const identity = { sessionId, sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
const backend = { identity, session: { onEvent(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } } } as unknown as OwnedUiSessionBackend;
let control: Awaited<ReturnType<typeof startSessionColorControl>> | undefined;
process.on("message", async input => {
  const request = input as { action: string; sessionId?: string };
  if (request.action === "start") control = await startSessionColorControl(backend, settings, join(root, "runtime"), runtimeId, reservation);
  if (request.action === "replace") { identity.sessionId = request.sessionId!; identity.sessionBindingGeneration++; settings.startSession(); for (const listener of listeners) listener(); }
  if (request.action === "stop") { identity.disposed = true; await control?.dispose(); }
  process.send?.({ action: request.action });
  if (request.action === "exit") { await control?.dispose(); process.disconnect(); }
});
process.send?.({ ready: true });
