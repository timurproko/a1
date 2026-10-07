## 1. Prediction policy and candidate bounds

- [ ] 1.1 Add sanitized formal plan-approval/implementation, required-validation, and unresolved-choice conversation fixtures; verify fixture assertions contain no repository, pull-request, branch, screenshot, session, or user identifiers.
- [ ] 1.2 Revise the prediction instruction to favor one explicit intent-compatible action and prohibit tool calls while preserving contextual abstention; verify request-inspection tests include the completed response and all positive and negative guidance.
- [ ] 1.3 Add `approved`, `proceed`, `implement`, `merge`, and `archive` to the bounded single-word candidate set; verify contract tests accept exactly these new cases while retaining formatting, assistant-voice, pleasantry, error, and arbitrary-fragment rejection.

## 2. End-to-end reliability coverage

- [ ] 2.1 Preserve the primary request's cache-compatible model, reasoning, identity, transformed messages, options, and tool declarations; verify adapter tests reject a returned tool call without execution, retry, fallback text, or session mutation.
- [ ] 2.2 Exercise representative `approved implement it` and `proceed` candidates before and after run settlement through the controller/shell boundary; verify eligible ghost-text display, Tab-only acceptance, separate submission, and empty/tool-call/failure outcomes that leave the editor unchanged.
- [ ] 2.3 Extend the skipped-by-default real-provider probe with the sanitized formal-approval positive case and required-validation negative case, and verify its ordinary test run performs no provider request while its opt-in summary remains text-free and bounded; do not run the quota-consuming mode without explicit authorization.

## 3. Documentation and delivery evidence

- [ ] 3.1 Update prompt-suggestion architecture guidance with the explicit-action policy, recognized one-word replies, no-tool instruction, retained cache shape, and remaining provider limitations; verify documented probe counts and launch/diagnostic instructions match implementation.
- [ ] 3.2 Run the focused suggestion contract, adapter, controller, shell, and diagnostics tests plus bounded type/documentation/architecture checks and strict OpenSpec validation; record results and disposition every known gap without running prohibited full local suites.
- [ ] 3.3 Build the candidate and prepare an interactive handoff reproducing the formal approval/implementation state with diagnostics enabled; verify expected ghost text, Tab/Enter separation, negative required-validation behavior, settings opt-out, and unchanged `a1 pi` are stated for maintainer review.
