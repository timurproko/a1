import { markStartupPhase, type StartupPhase } from "../../../foundation/startup/startup-runtime.js";

/**
 * What one engine session may ask of the process-level host that created it. The host owns
 * everything process-wide; a session only reports what it learned and reads the host's signal.
 */
export interface PiEngineHostSessionPorts {
  /** Aborted when the host is disposed; host-level timers and probes stop with it. */
  readonly signal: AbortSignal;
  /** Record a startup trace phase; the host records each phase once per process. */
  markStartupPhase(phase: StartupPhase): Promise<void>;
  /** A session's runtime loaded the profile's HTTP idle timeout; the host installs the dispatcher once. */
  httpPolicyLoaded(timeoutMs: number, sessionId: string): void;
  /** A session wrote the HTTP idle timeout setting; the host re-installs the dispatcher for the process. */
  httpPolicyChanged(timeoutMs: number, sessionId: string): void;
}

/**
 * The ports of an adapter built without a host: the signal never fires, phases trace as before, and
 * no process dispatcher is installed, because only the host owns that.
 */
export function detachedEngineHostPorts(): PiEngineHostSessionPorts {
  return {
    signal: new AbortController().signal,
    markStartupPhase: phase => markStartupPhase(process.env, phase),
    httpPolicyLoaded() {},
    httpPolicyChanged() {},
  };
}
