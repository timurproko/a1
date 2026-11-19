## Why

Bare A1 sometimes leaves the prompt empty even when the assistant explicitly offers a natural next action, such as “Say archive it” after an accepted merge. The current silent failure paths make it impossible to distinguish deliberate abstention from timeout, filtering, or lifecycle suppression; the reported screenshot establishes the missing suggestion, not its cause.

## What Changes

- Strengthen contextual prediction guidance to prefer a clearly offered next action consistent with recent user intent, including `archive it`; an optional alternative alone should not force abstention. Preserve abstention when a decision is genuinely unresolved or validation is still required.
- Give the isolated suggestion request a low-latency reasoning policy instead of inheriting high main-session thinking, while retaining the selected model, a bounded deadline, and no automatic retries or model switching.
- Preserve valid `archive it` output through filtering and settled-editor presentation, without extracting or executing assistant instructions as a fallback.
- Add bounded, private, opt-in diagnostics that distinguish eligibility skips, empty model output, rejected candidates, provider failures, timeout, cancellation, stale results, blocked presentation, and successful display. Do not expose conversation text or errors in the editor or transcript.
- Add deterministic regression coverage for the reported archive-offer shape, request policy, and lifecycle outcomes; require separate real-provider/manual evidence rather than treating mocked success as proof of prediction quality.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: Explicit-next-action prediction guidance, independent low-latency request policy, and privacy-preserving outcome diagnostics, retaining the existing eligibility, isolation, ghost-text, and deliberate acceptance contracts.

## Impact

Expected implementation areas are `src/contracts/owned-ui/prompt-suggestions.ts`, the owned-UI suggestion result contracts and validation, `src/integrations/pi/engine/adapter.ts`, `src/integrations/pi/session-ui/prompt-suggestion-controller.ts`, shell eligibility/presentation integration, and focused tests. A narrow local diagnostic export and its usage documentation may be needed during implementation. No dependency upgrade, provider transport/cache-parity redesign, changes to `a1 pi`, new settings row, or OpenSpec archival automation is proposed. This pull request contains planning artifacts only.
