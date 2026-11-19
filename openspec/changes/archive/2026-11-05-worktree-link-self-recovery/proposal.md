## Why

A corrupted persistent `session-worktree-claims/mutation.lock` can prevent every session from registering or linking a delivery worktree indefinitely. The reported incident contained 155 NUL bytes, survived reinstall/downgrade, and required manual deletion; a separate startup retry gap can leave the session unavailable even after contention ends.

## What Changes

- Make claim mutation exclusion crash-releasing and independent of parseable JSON metadata, with safe recovery of abandoned/corrupted protocol state and conservative compatibility with older writers.
- Keep runtime registration eligible for bounded, serialized retries after startup failure or temporary process-inspection failure, without restarting the session or changing another agent's claims.
- Distinguish transient contention, damaged legacy state, unavailable inspection, and genuine worktree ownership conflicts; report safe next steps instead of an indefinite generic busy error.
- Add focused corruption, process-crash, race, mixed-version, and runtime-retry regression fixtures, including the reported 155-NUL-byte case.

## Capabilities

### New Capabilities
- `session-worktree-recovery`: Crash-safe mutation coordination, recovery safety, retry lifecycle, and actionable failure classification.

### Modified Capabilities
- `change-delivery-workflow`: Separate mutation-gate recovery from editing-claim ownership, retaining exact-process proof for legacy holders and live claims.

## Impact

- Primary paths: `src/foundation/lifecycle/session-repository-context.ts`, `src/composition/session-runtime-registry.ts`, and session-context CLI diagnostics.
- Native location-lock support and its TypeScript adapter may be extended to supply crash-releasing authority; reuse existing platform primitives rather than introducing a timer-based ownership lease.
- Existing session identities, durable associations, worktree claims, and their agent/runtime scope remain compatible. Git state, worktree contents, cleanup journals, and delivery authorization are unchanged.
- Planning only. Implementation requires explicit approval. No promise of automatic takeover when an older writer's ownership cannot be proven absent.
