## 1. Settled-response activation lifecycle

- [x] 1.1 Extend authoritative run-settlement metadata with the final assistant facts needed to independently classify successful text, tool continuation, completion, active model, and assistant-count eligibility; verify malformed or ambiguous settlement data fails closed.
- [x] 1.2 Replace one-shot considered-state with a per-response attempt lifecycle that distinguishes prefetch, settlement, active request, candidate, scheduled retry, and final disposition; verify ordinary prefetch still makes exactly one request.
- [x] 1.3 Add the settlement activation backstop for a response that is eligible when it settles; verify no prefetch, duplicate completion, permanent ineligibility, user cancellation, and stale identity cases.

## 2. Bounded generation and presentation recovery

- [x] 2.1 Permit one sequential retry after `empty`, `rejected`, `provider-failure`, `unavailable`, or `timeout`; verify the retry waits for settlement when needed, preserves the complete cache-compatible request shape, and no response exceeds two requests.
- [x] 2.2 Preserve cancellation authority across scheduled and active recovery; verify typing, submission, interruption, new runs, model/session replacement, disablement, and disposal prevent retry publication and retire ignored late results.
- [x] 2.3 Retain a valid current candidate across `not-ready`, `not-focused`, `autocomplete`, and temporary `prompt-mode` blockers, reevaluate it on shell eligibility changes, and verify draft hide/restore remains intact while replacement/run/model/session actions discard it without another provider request.

## 3. Evidence and documentation

- [x] 3.1 Extend bounded private diagnostics with attempt number/trigger, settlement-without-prefetch, deferred presentation, and retry exhaustion while preserving one terminal generation outcome per request and all text/path/privacy exclusions.
- [x] 3.2 Add controller, shell, adapter-event, composition, and diagnostic tests for missed activation, first-attempt failure followed by success, exhausted recovery, timeout/late-result races, deferred presentation, and unchanged one-request success behavior.
- [x] 3.3 Update settings and architecture guidance to disclose up to two background requests only when recovery is needed, document new diagnostics, and remove approval-specific/provider-quality probe work from this change.
- [x] 3.4 Run focused suggestion contract, adapter, controller, shell, diagnostics, type, documentation, architecture, and strict OpenSpec checks; record results and disposition every known gap without running prohibited full local suites.
- [x] 3.5 Build the candidate and prepare an interactive handoff that repeats ordinary completed-work prompts with diagnostics enabled; verify one-request success, visible settlement/retry recovery, Tab/Enter separation, settings opt-out, and unchanged `a1 pi` are stated for maintainer review.
