## Context and approval

Approved source investigation at develop 8e6a828eed4a3d64132cbc9134f42f4f6bfee265. No live maintainer session was reproduced or interrupted. A read-only state-machine model demonstrates publication starvation; it does not prove which installed cohort caused the user's incident. The maintainer explicitly approved implementing the proposed fix and regressions.

## Decisions

### Keep a pending-publication deadline independent of individual transactions

On Windows, ConPTY can relay synchronized-output markers before, between, or after its re-rendered cells. Preserve the existing following-pass quiet-settle behavior and 40 ms fallback, but retain the earliest pending deadline until publication is consumed. A later end marker may invalidate pass-readiness, not extend the deadline. Continuous post-marker output cannot renew the hard bound by repeatedly extending the 2 ms quiet interval. Open transactions still suppress ordinary publication, with only the existing non-renewable 250 ms explicit recovery escape. Consumption resets the render-pass wait and quiet interval without changing whether the parser transaction is open. Unix verbatim boundary behavior remains unchanged.

The fallback is a bounded ConPTY publication decision, not a claim that relayed markers delimit physical frames. Preserve existing full-cell convergence/fragmentation cases and add sustained sequences with cells between markers, after markers, and continuous fragmented cells. Do not trade latency for unconditional mid-transaction publication.

### Make responsiveness a verdict, not just a report

Enforce healthy commit-to-completed-outer-paint p95 <=33 ms, retaining the existing input-to-process <=16 ms stage target. Measure only explicitly healthy scenario windows when they are supplied; a deliberate 900 ms paused sink is not a healthy window. Match tab, incarnation and revision and use first completed paint for a revision so later strip animation cannot inflate delivery latency. Coalesced intermediate surfaces need not paint, but a viewed healthy window must provide matched presentation samples. Do not count hidden holders as missing viewer work. Keep clock-discontinuity exclusion and diagnostic loss checks.

Extend the exact-artifact real-A1 harness with isolated synthetic input and matched direct-solo observations at identical child geometry. Exercise printable typing, repeated menu/navigation input, and wheel scrolling. Recognize the resulting synthetic screen state through the existing native terminal inspection API and complete synchronized outer frames rather than terminal-byte substrings that may be stale. Compare resident p95 with direct p95 plus the existing 16+33 ms transport/presentation envelope; report maximum delay and reject sustained no-progress independently. Synthetic payloads are hermetic and never include user input or conversation content. Negative cases must reject missing, stale, or delayed observations.

### Scope and rollout

No global timer changes, forceful resident restart, input dropping/coalescing, protocol generation change, or speculative wire-delta optimization. Existing cohorts retain old native code until their ordinary lifecycle or an explicitly authorized stop. Document that this repair fixes a demonstrated state-machine path without asserting reproduction of the maintainer's exact environment.

## Validation

Targeted native synchronization/commit tests; focused observation/input-fixture TypeScript tests; typecheck; strict validation of this change. Source-build a fixture addon with verified prebuilt Ghostty inputs in this worktree and run the touched exact-artifact scenario where available. Normal finalized-head CI remains the cross-platform authority.

## Known gaps

Pending implementation evidence and explicit disposition before readiness. Physical pixels, real sleep/wake, and the exact installed resident cohort are not certified by a headless terminal observation.
