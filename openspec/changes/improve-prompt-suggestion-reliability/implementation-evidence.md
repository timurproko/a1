# Implementation evidence

## Scope and provenance

Implements the planning accepted in PR #357, from fresh `origin/develop` base `de8e75a1`, in `D:/Git/a1/.worktrees/implement-prompt-suggestion-reliability`. The earlier screenshot's original skip cause remains unknown; no historical timeout or abstention is asserted.

Tasks 1.1–3.3 are implemented. Prediction remains contextual, with no extraction fallback. Suggestion reasoning uses the lowest supported request-local effort on the selected model, without mutating primary thinking. Typed adapter results preserve empty/rejected/provider-failure/unavailable/cancelled outcomes, while the controller owns timeout, cancellation, stale-result, and display outcomes. The local collector is opt-in via `A1_SUGGESTION_DIAGNOSTICS`, with 128-record/64-KiB bounds and coalesced writes. The neutral collector's source/test owner and public environment role are registered with existing governance.

## Local validation

- `npm run typecheck`: passed.
- `npm run build`: passed.
- Focused contract, adapter, controller, and diagnostic tests plus the complete session-shell file: 322 tests passed at that checkpoint.
- Subsequent added shell eligibility/modal tests and archive end-to-end checks: 13 selected tests passed; the shell file now contains 218 tests.
- Component presentation tests: 23 passed, including focus, disabled input, draft, empty-editor autocomplete, and comparison prompt-mode diagnostics.
- Composition opt-in/export/disposal tests: 6 passed.
- Product identity tests: 10 passed.
- Ownership policy tests: 15 passed, including the neutral collector boundary.
- Architecture, product identity/package boundaries, pinned-source ledger, terminal provenance, naming, documentation governance, and code-documentation checks: passed.
- `openspec validate improve-prompt-suggestion-reliability --strict` and whitespace checks: passed.
- No local `test:fast`, `test:full`, or `test:release` suite was run.

The archive regression uses synthetic multi-turn messages and the real adapter/controller/editor pipeline with a fake completion boundary. It verifies both pre- and post-settlement publication, empty semantic editor text, Tab acceptance without submission, separate Enter submission, unchanged session messages/thinking, one request, and an inspectable metadata-only file. Empty/error paths do not synthesize `archive it`. Fake-time coverage retires a 15-second timeout before ignored abort results and preserves one terminal outcome per request.

## Remaining evidence and acceptance

Task 4.1 remains pending until required implementation CI is verified. Task 4.2's credential-gated comparison is delivered but was skipped locally because explicit provider-test opt-in was not supplied. It compares five baseline and five revised archive predictions plus one required-testing counterexample, using in-memory sessions/settings, scratch cwd, disabled resources, and no tools. Its documentation discloses the 11 extra requests and quota use. No real-provider latency improvement or archival prediction is claimed from mocked tests.

Tasks 4.3 and 4.4 remain pending: maintainer visual/provider validation, acceptance, explicit implementation merge authorization, and the subsequent specification-only closeout have not occurred. The code PR must remain open without auto-merge. Existing context reconstruction and provider latency/abstention can still result in an empty editor; private diagnostics distinguish observed failures but cannot explain a model's unexposed reasoning.

## Manual review

Build first in the implementation worktree, create a dedicated writable `.artifacts` directory, and launch `./scripts/dev` with `A1_SUGGESTION_DIAGNOSTICS` pointing to `.artifacts/suggestion-diagnostics.json`. Keep main thinking high. In a harmless two-assistant-turn synthetic conversation, establish accepted merged work and obtain a final offer containing `Say archive it` with optional extra testing. Check the ghost text or inspect the classified missing outcome. Tab must accept without sending; Enter must be a separate deliberate action. Do not execute a real archive just to test the UI. Repeat with typing cancellation, outstanding required testing, suggestions disabled, and the comparison route.

See `docs/architecture/prompt-suggestions.md` for exact capture/inspection/provider-probe syntax, privacy/retention limits, and cleanup. Diagnostic export is disabled when the environment override is absent. The snapshot path is explicitly overwritten; use a dedicated file, never a session or credential file.
