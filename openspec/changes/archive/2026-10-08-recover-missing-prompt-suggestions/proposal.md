## Why

Bare A1 can intermittently finish a successful eligible run with an empty prompt even when the completed conversation provides enough context for a useful next-input prediction. The current lifecycle has one pre-settlement activation opportunity, one generation request, and one presentation opportunity; a missed activation, transient no-candidate result, or temporary presentation blocker is terminal and appears to the user as if suggestions never activated.

## What Changes

- Track suggestion attempts for the final response through settlement so an eligible run that did not start its prefetch receives a settlement fallback instead of silently remaining idle.
- Permit one bounded retry when the first current attempt produces no candidate, while preserving the same model, context, request shape, filtering, cancellation, and stale-result protections.
- Retain a valid current candidate across temporary readiness, focus, autocomplete, or prompt-mode presentation blockers and reveal it when the ordinary editor becomes eligible.
- Extend private diagnostics to distinguish prefetch, settlement fallback, retry, retry exhaustion, and deferred presentation without recording conversation or candidate text.
- Add deterministic event-order, failure, cancellation, and presentation coverage for the intermittent missing-suggestion paths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: add bounded activation, generation, and presentation recovery for otherwise eligible completed runs.

## Impact

Expected implementation areas are the owned prompt-suggestion controller, session-shell event integration, settled-run metadata, diagnostic contracts/capture, deterministic adapter/controller/shell tests, and prompt-suggestion architecture documentation. The selected model, reasoning level, cache-compatible request contents, candidate policy, editor interaction, settings, session persistence, comparison mode, and `a1 pi` behavior remain unchanged. Failed recovery remains silent and no fallback text is extracted from the assistant response.
