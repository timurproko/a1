import type { TerminalRuntimeFactory } from "../../../contracts/presentation/index.js";
import { legacyKeyInput, PiTuiRuntimeAdapter } from "./adapter.js";
import { DamageAwareTerminalAdapter } from "./damage-aware-terminal.js";
import { classifyPiTuiInput } from "./input-presentation-coordinator.js";

/** The Pi TUI runtime behind the neutral terminal runtime factory the shell uses. */
export const PI_TERMINAL_RUNTIME: TerminalRuntimeFactory = Object.freeze<TerminalRuntimeFactory>({
  createRuntime: options => new PiTuiRuntimeAdapter(options),
  createDamageTerminal: (terminal, options) => new DamageAwareTerminalAdapter(terminal, options),
  classifyInput: (data, surface) => classifyPiTuiInput(data, surface),
  legacyKeyInput: data => legacyKeyInput(data),
});
