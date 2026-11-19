# Implementation evidence

## Scope and behavior

Implementation continued in the approved PR #712 worktree after merging current `origin/develop` at `9b111cb5`. It replaces the one-shot controller gate with a per-response lifecycle that records settlement, attempt count, scheduled recovery, and deferred presentation.

- Authoritative settlement now carries final stop/tool-continuation facts, allowing a successful eligible settled response to start its first request when completion-time prefetch did not start.
- A response makes at most two sequential requests and never overlaps them. `empty`, `rejected`, `provider-failure`, `unavailable`, or timeout can schedule one retry; cancellation, stale identity, user input, and lifecycle replacement cannot.
- A current candidate blocked by readiness, focus, autocomplete, or prompt mode remains prepared and is shown without another provider request when the ordinary editor becomes eligible.
- Diagnostics identify attempt number and `prefetch`, `settlement`, or `retry` origin, deferred presentation, and bounded exhaustion without capturing conversation or candidate text.
- The setting discloses the optional recovery request. Request construction, candidate filtering, session isolation, ghost-text behavior, Tab acceptance, separate Enter submission, comparison mode, and `a1 pi` remain unchanged.

## Validation

- `npm run build`: passed.
- `npm run typecheck`: passed after the build generated the bin declarations.
- Focused suggestion, shell, adapter, event, diagnostics, contract, composition, and settings validation: 206 tests passed; the credential-gated provider probe remained skipped by default.
- `npm run check:code-documentation`: passed.
- `npm run check:docs-governance`: passed.
- `npm run check:architecture`: passed after re-pinning the measured startup graph at 160 files / 1,580,278 source bytes; package identity, pinned-source provenance, and terminal-host provenance also passed.
- `npx openspec validate recover-missing-prompt-suggestions --strict`: passed.
- `git diff --check`: passed.
- No local `test:fast`, `test:full`, or `test:release` suite was run.

## Evidence limits and handoff

The skipped real-provider probe measures prompt quality, not the deterministic lifecycle recovery implemented here. Two provider attempts can still both abstain, fail, or time out; the controller records `retry-exhausted` and leaves the editor empty rather than manufacturing fallback text. No claim is made that every conversation yields a useful suggestion.

For interactive review, build and launch bare A1 with `A1_SUGGESTION_DIAGNOSTICS` targeting a dedicated file under this worktree's `.artifacts/`. Repeat ordinary completed-work conversations with an untouched empty editor. Verify ordinary success records one `prefetch` request, recovered cases record either a first `settlement` attempt or a second `retry` attempt, temporary focus/autocomplete blocking records `presentation-deferred`, and Tab then Enter remain separate actions. Repeat with typing cancellation, suggestions disabled, and `./scripts/dev pi` comparison behavior.
