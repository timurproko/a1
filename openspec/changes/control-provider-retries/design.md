## Context

See `proposal.md` for motivation and `specs/provider-retry-control/spec.md` for the user-visible contract. Pinned Pi 0.87.1 already documents `retry.enabled`, `retry.maxRetries`, `retry.baseDelayMs`, `retry.maxAgentDelayMs`, and provider-level retry fields. Its public settings manager exposes `getRetrySettings()` and a setter for `retry.enabled`, but no public setter for `retry.maxRetries`; its generated settings presentation does not include either retry control. A1's public-API boundary therefore forbids implementing the limit by editing the Pi profile document directly.

Pi's public session events already carry `attempt`, `maxAttempts`, and the final error around automatic retry. A1 currently reduces retry start to the generic `Retrying` work label and reduces retry end to clearing that state, so the useful count never reaches the owned frame. A1 also has a neutral retry command, but its current integration replays remembered prompt text; that is not a suitable exhaustion continuation because it can lose images, duplicate the user message, and reconstruct a turn across already completed tools.

The default three retries wait approximately 2, 4, and 8 seconds. With the unchanged exponential backoff and 60-second cap, ten retries remain finite at approximately 362 seconds of waiting. Provider-level retries default to zero and nesting them inside the agent budget would make request count and delay less predictable.

## Goals / Non-Goals

**Goals:**
- Keep retry persistence, validation, retryability, context continuation, and scheduling owned by Pi's public runtime.
- Carry enough retry lifecycle data across the A1 boundary to render truthful progress and one terminal failure.
- Make a user's continuation explicit, atomic, session-scoped, and bounded by the same finite policy.
- Preserve nested Pi settings and retained conversation/tool/image context without an A1 session reconstruction algorithm.

**Non-Goals:**
- Changing which errors Pi classifies as retryable, its backoff formula, delay cap, HTTP idle timeout, or transport fallback.
- Exposing backoff tuning or provider-level retries in A1 settings.
- Automatically reducing concurrent agents, pausing every session globally, or coordinating retry budgets between processes.
- Implementing an infinite retry mode, automatically chaining exhausted budgets, or treating authentication and other non-retryable failures as outages.
- Modifying or publishing upstream Pi source in this A1 pull request, or adding A1-specific behavior to the comparison profile.

## Decisions

### 1. Qualify a public Pi capability before changing A1's pin

Implementation begins with an external artifact gate. A qualifying immutable published Pi package must provide, through package-root public APIs:

- validated read/write operations for `retry.enabled` and `retry.maxRetries` that merge only the selected nested field and flush through the settings manager;
- generated Settings presentation for an `Automatic retries` boolean and bounded `Retry limit` number, so A1's existing metadata extraction remains authoritative for wording, order, bounds, and callbacks;
- retry lifecycle events that retain current retry, effective limit, completion outcome, and bounded final error; and
- a session-scoped operation for continuing the latest eligible exhausted turn from retained context with a fresh finite budget, without appending another user message or replaying completed tool calls.

The candidate will be exercised from an isolated installation before `package.json` or the lockfile changes. Qualification records exact version and registry integrity, declaration/runtime agreement, nested-write preservation, event order, continuation eligibility, text/image context, tool-result preservation, and a known-broken 0.87.1 outcome. If no published candidate satisfies this contract, dependency adoption and A1 implementation remain blocked. A source checkout, private subpath, package patch, prototype mutation, or direct settings-file write is not an alternative.

Reusing the existing text-replay retry command was rejected because it cannot satisfy image, duplicate-message, and completed-tool safety. Making the controls A1-owned and injecting settings overrides was rejected because it would create a second persistence authority that can disagree with the Pi profile.

### 2. Add two scalar engine descriptors, not one editable retry object

The settings bridge will map the candidate's generated controls to separate engine operations (`autoRetry` for `retry.enabled` and `retryMaxRetries` for `retry.maxRetries`) and add both to the reviewed live agent-effect inventory. Scalar controls fit the existing shared boolean and number components and permit a nested-field write without replacing delay or provider objects. The active session owner applies each value before the coordinator persists and flushes it; ordinary rollback restores one consistent stored/effective state on failure.

The A1-presented write domain for the limit is 1 through 10. A candidate must treat a missing value as 3. A pre-existing non-integer or out-of-range value is reported as invalid and resolves to 3 for the running process without rewriting the file merely because settings were opened; an explicit accepted change writes the new valid field while preserving every sibling. This follows the existing fail-safe settings pattern and avoids silently clamping an unknown old intent to a different non-default value.

The switch and limit remain independent: disabling retries leaves the limit stored and visible. Live application means a later eligibility decision reads the new state. A countdown already scheduled keeps the delay and maximum captured when it was scheduled; the change does not restart work or retroactively add/remove a request.

An object-valued `retry` entry was rejected because the generic whole-object write could erase unpresented provider fields. Exposing base delay and the cap was rejected because the observed failure is insufficient budget, while freely reducing delay can create synchronized request pressure during an outage.

### 3. Preserve retry lifecycle as structured state until presentation

The Pi event adapter will retain structured retry state: current automatic retry, effective limit, outcome, and bounded final error. Retry start publishes `Retrying (current/limit)` through the existing non-persistent work surface. Success and cancellation clear it through existing lifecycle ordering.

On an unsuccessful retry end, total attempts are computed once as `automatic retries + 1`. The transcript projection associates the exhaustion metadata with the final assistant error and renders one decorated failure rather than appending a second notice. Rebuild and settlement paths must preserve the decoration so a later authoritative transcript replacement does not temporarily restore the raw error. Non-retryable failures and disabled automatic retry do not produce exhaustion metadata.

Provider-level retry attempts are deliberately absent from this state. The displayed denominator is the effective agent-level `maxAttempts` emitted for the sequence, not a reread setting that may have changed after scheduling. Diagnostics continue to pass through the existing bounded error conversion; message bodies, headers, and credentials are never added.

A standalone persistent retry notice was rejected because it would leave both the raw error and an explanatory error in the failed turn. Inferring exhaustion from the string `fetch failed` was rejected because retryability and attempt count belong to the engine event protocol.

### 4. Make continuation a capability-backed contextual action

The qualifying Pi operation owns an eligibility token tied to the current session and exhausted turn. A1 records only neutral availability plus the current session/run generation. When the default `Ctrl+R` action is invoked, the engine atomically verifies and consumes that eligibility, omits the failed assistant attempt from model context according to Pi's retry semantics, resets the finite agent-level counter, and continues from the retained context. The original user message, images, completed tool calls, and tool results remain where they already are; A1 does not reconstruct or replay them.

Bare A1 adds one shortcut declaration for the action and derives both dispatch and the exhaustion hint from the effective binding. The handler does not read or clear editor text, so a draft survives. A new accepted prompt, session replacement, successful continuation, or engine refusal clears availability. If continuation itself exhausts, Pi issues a new eligibility token and A1 requires another user action. Failure to admit the action reports once and never starts a retry loop.

A global always-active retry key was rejected because it could dispatch stale work after the conversation moved on. Automatically continuing whenever the network returns was rejected because it is indistinguishable from infinite retry during prolonged outages. Retaining a token in A1 rather than Pi was rejected because only Pi can prove the exact failed context is still current.

### 5. Keep comparison and conformance boundaries explicit

Bare A1 owns the contextual status, decorated failure, and shortcut. `a1 pi` uses the selected package's normal interactive presentation and key handling; A1 does not install duplicates there. The existing generated metadata/effect-table drift checks will require both new presented keys and their independent application evidence. Focused conformance covers nested persistence, rollback, live changes, all allowed limits, invalid stored values, retry success/cancel/exhaustion, stale continuation, repeated explicit continuation, images, completed tools, session replacement, and raw styled frame geometry.

Provider behavior is tested with a deterministic local/fake stream that fails a declared number of attempts; tests do not depend on a real outage or retry until green. Physical-terminal acceptance verifies the progress, terminal wording, effective shortcut hint, preserved draft, and comparison-profile isolation.

## Risks / Trade-offs

- [Ten retries can leave one run waiting for about six minutes] → Keep the limit finite and explicit, retain Escape cancellation, show current/maximum progress, and do not enable nested provider retries.
- [Many processes can still amplify an outage] → Keep the default at three, cap A1 writes at ten, and document that the setting is per process rather than a global concurrency controller.
- [An older profile may contain an out-of-range limit] → Resolve to the documented default with one diagnostic, preserve the file until an explicit change, and never silently clamp or delete sibling fields.
- [The upstream package may add unrelated UI or API changes] → Run the exact-package compatibility gates and adopt only a candidate whose broader A1 contracts pass; otherwise remain blocked.
- [Retry events can race settlement or session replacement] → Key exhaustion metadata and eligibility to session/run generation, consume continuation atomically in Pi, and discard stale events before presentation or dispatch.
- [`Ctrl+R` can conflict with a configured binding] → Use the shared declaration/conflict machinery and render the effective binding; a conflict must fail governance rather than create two actions.
- [A model may request a similar tool again after continuation] → Preserve completed calls without replay; any later execution must originate from a new model tool request and pass the ordinary tool lifecycle.

## Migration Plan

1. Obtain and independently qualify a published Pi candidate with the required settings, events, and continuation operation. Stop with an explicit external blocker if none exists.
2. Update the exact Pi dependency family and lockfile through the ordinary upgrade/compatibility path, regenerate settings metadata, and add the two reviewed bridge operations/effects.
3. Add structured retry event projection, attempt-aware failure decoration, contextual shortcut/action routing, and focused automated evidence.
4. Build before a bare-A1 physical-terminal handoff; verify a controlled failing provider path at limits 1 and 10, cancellation, explicit continuation with text/images/tools, stored settings after restart, and unchanged comparison ownership.
5. Rollback removes the A1 descriptors/presentation/action and restores the previous exact Pi family. Pi retry files are not converted; fields written through the newer public manager remain ordinary documented retry fields, and no A1 settings migration is needed.
