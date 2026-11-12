# Implementation evidence

## Scope and ownership

Implemented the approved three outcomes in PR #918 on `feature/herdr-session-colors`, attached at `D:/Git/a1/.worktrees/herdr-session-colors`. The first two outcomes were committed/pushed and checked individually before documentation began. No comparison-profile customization, companion/remote configuration edit, dependency addition, live-agent control, or merge was performed.

## Focused local results

- Product build and source/shipped-entry typecheck passed on Windows with Node 24.21.0.
- CLI/launch/settings/trust/composition/bootstrap checks passed: the targeted eight-file launch run had 223 passing tests; committed-bootstrap payload fixtures added three passing warm/cold/incompatible-child cases. The targeted runtime wiring run had 16 passing tests across two files, including committed new/resume/fork/import color-reset hooks.
- Reporter/Core command/readiness/ownership checks passed: the final four-file focused run had 22 passing tests and one platform skip. A preceding seven-file integration/compatibility run had 34 passing tests and one platform skip.
- Architecture, session-writer guard, product identity boundaries, pinned Pi source provenance, naming audit, strict pinned OpenSpec 1.11.0 validation, and whitespace checks passed during implementation. The size ratchet was lowered after extracting small composition/bootstrap helpers rather than relaxing a growth limit.
- Draft delivery-body checks passed while incomplete. Development suites were skipped by trusted CI during draft implementation, as policy requires; this local report does not substitute for finalized exact-head validation.

## Observable fixtures

- Seven-color validation, duplicate/missing/invalid options, session-option orders, frozen intent/child literal argv, first `--` protection, and comparison/unsupported-command isolation.
- Deterministic first trust-frame palette and first-editor composition initialization from invocation color above a different saved Default; literal prompt submitted once after start/flush, no session-color persistence, and failed/cancelled binding work preserving Current color.
- Successful committed new/resume/fork/import boundaries restoring invocation policy while live API/Settings edits and peer saved-Default changes remain independent. No-override behavior remains latest-Default initialization.
- Warm/cold retained child argv propagation and rejection of incompatible certified parser payloads before child spawn, while no-override fallback remains available.
- Endpoint-startup failure creates no reporter; replacement identity stays unavailable until endpoint binding publication completes; disposal unsubscribes.
- Core public get/label subprocess fixture with no App/customizations/companion, two independent processes, delayed older start, replacement/shutdown supersession, fresh native identity consumed through the acknowledged Current-color API, and unchanged unrelated/legacy labels.
- Approximately 30-second scheduling, complete UUIDs/timestamps, coalesced requests, shutdown during an in-flight read, unavailable/malformed/wrong-address/invalid-session failures, missing command, nonzero exit, timeout, output limit, npm script paths/spaces, and an actual disposable Windows executable.
- Maintained Herdr consumer equivalent checks version-1/both-true capability gating, older/malformed probe fallback, native-over-legacy selection, partial native fail-closed, 90-second freshness, and five-second future-clock tolerance.

## Explicit validation limits and disposition

- No live Herdr App/Core/SSH end-to-end or physical first-frame smoke was performed. Supported CLI/schema/manual inspection and disposable contract/process fixtures establish the implemented boundaries, not an independently verified external consumer deployment. Optional live validation remains a maintainer choice and must use authorized disposable sessions.
- The native Unix executable case is committed but skipped on Windows; Windows executable/npm resolution is exercised locally. Native Unix execution remains for compatible CI or separately authorized isolated validation.
- Cross-runtime fencing is cooperative among A1 reporters. Core exposes no conditional label write, so arbitrary external native-label writers are not claimed to be atomically protected. Crash or unverifiably settled subprocess residue intentionally retains the lock and may disable reporting until exact operator-verified recovery; ordinary A1 continues and consumer freshness rejects stale identity.
- No unresolved implementation task is concealed by these limits, and no local result claims maintainer acceptance or protected exact-head CI success.
