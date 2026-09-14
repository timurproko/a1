## 1. Regression fixtures and request policy

- [x] 1.1 Add a sanitized multi-turn accepted-merge/archive-offer fixture, an optional-testing alternative, a required-testing counterexample, and unresolved choices; verify fixtures distinguish expected preference from permissible abstention without depending on the private screenshot file.
- [x] 1.2 Revise the contextual prediction instruction to prefer a clear offered next action consistent with user intent while preserving genuine abstention; verify request-inspection tests include the completed response and positive/negative guidance, and normalizer tests accept `archive it` without relaxing existing rejection rules.
- [x] 1.3 Resolve the lowest supported request-local reasoning effort through the selected model/runtime capabilities, with no inherited high effort or unsupported controls on non-reasoning models; verify captured requests retain provider/model identity and primary thinking/settings remain unchanged after success, failure, and cancellation.

## 2. Reason-coded outcomes and lifecycle

- [x] 2.1 Introduce bounded neutral generator outcomes and contract validation, retaining candidate text only for candidate results; verify empty output, invalid content, tool-call output, provider errors, unavailability, and abort are distinguishable and no tools execute or synthetic session content persists.
- [x] 2.2 Add reason-coded shell eligibility and presentation decisions without changing eligibility rules; verify disabled suggestions, early conversations, no model, failed/incomplete/tool-continuing responses, draft text, modal input, autocomplete, focus, and prompt-mode suppression report the correct reason and request count.
- [x] 2.3 Make the controller the single owner of request start and terminal outcomes, retaining the 15-second deadline and no retries; verify fake-time timeout, ignored abort, prepared-before-settlement cancellation, stale identity, model/session replacement, and late callbacks cannot publish or overwrite an earlier terminal outcome.
- [x] 2.4 Exercise the complete adapter/controller/shell path for timely `archive it` results arriving before and after settlement; verify ghost-only presentation, Tab acceptance without submission, separate submit, typing cancellation, and no extracted fallback for empty/error results.

## 3. Private bounded diagnostics

- [x] 3.1 Implement an off-by-default observer and collector with at most 128 allowlisted metadata records, process-local correlation, capped fields, and a 64 KiB export ceiling; verify record eviction, sensitive-data exclusion, disabled capture, and disposal with focused tests.
- [x] 3.2 Wire a documented launch-time opt-in local snapshot destination through the existing product launch conventions; verify an actual shell session can export inspectable reason records, writes coalesce with at most one pending snapshot, capture never uploads remotely, and sink failure cannot block input or change suggestions.
- [x] 3.3 Document the exact enable/inspect/disable procedure, reason-code meanings, retention bounds, local-file cleanup, and limitations; verify examples match the implemented launch syntax and explain that missing text alone does not establish a timeout or abstention.

## 4. Validation and acceptance

- [ ] 4.1 Verify deterministic integration coverage across all delta scenarios and retained suggestion/editor contracts in required CI; record strict OpenSpec validation and CI results without running the full local test suites unless explicitly requested.
- [ ] 4.2 After fake-boundary coverage, deliver and run the opt-in credential-gated provider comparison described in the design when credentials and authorization are available; record five baseline and five revised archive-fixture outcomes, latency and reason summaries, the required-testing counterexample result, and session isolation. Leave this task pending if provider evidence is unavailable or no real archival continuation is observed; mocked success is not quality acceptance.
- [ ] 4.3 Deliver the implementation worktree, branch/commit, build-first `./scripts/dev` command, diagnostic opt-in procedure, exact archive-offer reproduction, expected ghost-text/Tab/Enter behavior, and remaining provider limitations; obtain recorded maintainer validation with high main thinking, typing cancellation, settings opt-out, private diagnostics, and unchanged `a1 pi` behavior.
- [ ] 4.4 Leave the implementation PR open without auto-merge until required CI passes and the maintainer accepts and explicitly authorizes merge; after the accepted merge, record evidence and synchronize/archive this change in a separate OpenSpec-only follow-up, verifying merged PR states and clean worktrees before cleanup.
