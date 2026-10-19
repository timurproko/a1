export { CLEAR_EXIT_INTERVAL_MS, EMERGENCY_TERMINAL_RESET, RESIDENT_DETACH_INTERVAL_MS, boundedCleanup, restoreAfterOwnedExit, restoreProcessTerminal } from "./terminal-reset.js";
export { installFatalExit, writeFatalDiagnostic } from "./fatal-exit.js";
export type { FatalExitOptions } from "./fatal-exit.js";
