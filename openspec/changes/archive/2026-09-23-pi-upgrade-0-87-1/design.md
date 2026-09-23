# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.

## Review decisions

The 0.87.1 catalog additions remain pinned-engine behavior: A1's public `ModelRuntime` snapshots already feed the model and scoped-model selectors, so Claude Opus 5.5, GPT-6 Sol, and GPT-6 Luna need no parallel A1 catalog. A1's owned post-login resolver mirrors the one changed upstream default, selecting `grok-4.7` for xAI.

All 29 vendored presentation copies are unchanged upstream, and the inventories and public API have no structural delta. The generated regression fixtures deliberately retain `v0.87.0` in rendered Pi headers because the published 0.87.1 package still exports that public `VERSION`; preserving the observed value is parity evidence rather than an unreviewed stale pin. Other remaining 0.87.0 mentions are historical changelog or feature rows, or opaque hashes.
