import type { AgentSettingsPort } from "../contracts/agent-engine/index.js";
import type { OwnedUiPromptSuggestionGeneratorPort, UiAccentColor } from "../contracts/owned-ui/index.js";
import type { PiEngineSessionRequest } from "../integrations/pi/engine/host.js";
import type { PiSessionPresenterBackend } from "../integrations/pi/session-presenters/index.js";

/**
 * The session backend composition wires: the owned-UI port, the prompt-suggestion generator, and
 * the agent settings port. `settingsPort` stays outside the owned-UI contract because its type
 * belongs to the agent-engine contracts, which the owned-UI contract may not import.
 */
export interface ComposedSessionBackend extends PiSessionPresenterBackend, OwnedUiPromptSuggestionGeneratorPort {
  settingsPort(): AgentSettingsPort | null;
  generateResidentTabName(instruction: string, maxTokens: number, signal: AbortSignal): Promise<string | null>;
}

/** The process-level engine host as composition drives it: sessions, the live accent, and disposal. */
export interface ComposedEngineHost {
  create(request: PiEngineSessionRequest): Promise<ComposedSessionBackend>;
  setAccentColor(color: UiAccentColor): void;
  dispose(): Promise<void>;
}
