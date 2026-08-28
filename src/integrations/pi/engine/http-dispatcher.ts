// Mechanically adapted from Pi commit 914cf14
// packages/coding-agent/src/core/http-dispatcher.ts (MIT).
// Local modifications: expose only A1's owned timeout seam and retain no private Pi imports.
import { EnvHttpProxyAgent, install, setGlobalDispatcher } from "undici";

const MAX_DISABLED_TIMEOUT_MS = 2_147_483_647;
let configuredTimeoutMs: number | null = null;

/** Apply the profile's HTTP timeout to npm undici and its fetch globals. */
export function configureOwnedHttpDispatcher(timeoutMs: number): void {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0) throw new TypeError("HTTP idle timeout is invalid");
  const effectiveTimeoutMs = timeoutMs === 0 ? MAX_DISABLED_TIMEOUT_MS : timeoutMs;
  const dispatcher = new EnvHttpProxyAgent({
    allowH2: false,
    bodyTimeout: effectiveTimeoutMs,
    headersTimeout: effectiveTimeoutMs,
    connect: { autoSelectFamilyAttemptTimeout: 2_000 },
  });
  setGlobalDispatcher(dispatcher);
  install?.();
  configuredTimeoutMs = timeoutMs;
}

/** Test and diagnostics seam; reports configured semantics, not the max-int implementation detail. */
export function configuredOwnedHttpIdleTimeoutMs(): number | null {
  return configuredTimeoutMs;
}
