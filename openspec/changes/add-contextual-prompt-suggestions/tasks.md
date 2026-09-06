## 1. Contract and lifecycle boundaries

- [ ] 1.1 Add vendor-neutral suggestion request/result/state ports and an `agent-run-settled` event with session-generation and run identity; verify owned-contract validation rejects malformed, oversized, or mismatched identities.
- [ ] 1.2 Emit final-run settlement only after authoritative transcript reconciliation and never for intermediate assistant/tool turns or retry continuations; verify focused adapter event-order tests.
- [ ] 1.3 Extend Pi capability conformance for the public authenticated simple-completion operation used by suggestions and verify an incompatible or missing operation fails closed at the integration boundary.

## 2. Suggestion generation

- [ ] 2.1 Implement the independently authored next-user-prompt instruction and pure candidate validator; verify accepted approval/follow-up examples and rejection of empty, meta, assistant-voiced, evaluative, multiline, formatted, control-bearing, error-like, over-word, and over-length outputs.
- [ ] 2.2 Implement the Pi-backed generator with a snapshot of the settled run's selected model, system prompt, messages, tool schemas, and thinking configuration through the authenticated public model runtime; verify the fake provider receives the selected model and cache-compatible parent prefix.
- [ ] 2.3 Keep the completion outside an execution loop, reject tool-call/non-text responses, and prevent transcript/session mutation; verify no tool executes and serialized session entries are byte-for-byte unchanged by successful and failed generation.
- [ ] 2.4 Add abort and bounded-deadline handling with silent user-facing failure; verify abort, timeout, provider error, and late resolution all return no publishable suggestion without delaying primary run settlement.

## 3. Setting and composition

- [ ] 3.1 Add the live, default-enabled `promptSuggestions` A1 setting, its extra-selected-model-request disclosure, and any required settings-version migration; verify declaration, resolution, persistence, settings-screen grouping, and unknown-key preservation tests.
- [ ] 3.2 Bind the setting and generator only in bare-A1 composition; verify disabling aborts and clears immediately, re-enabling affects only later runs, and comparison/non-interactive paths make no suggestion requests.

## 4. Race-safe suggestion controller

- [ ] 4.1 Implement the `idle`/`generating`/`available` controller with session generation, settled-run sequence, model identity, request epoch, and abort ownership; verify only the newest fully matching result can publish.
- [ ] 4.2 Apply generation eligibility for enabled interactive bare A1, at least two completed assistant messages, successful settled output, an active model, and no permission/modal/replacement input; verify every suppressed state produces zero requests.
- [ ] 4.3 Clear or invalidate pending and visible suggestions on typing, paste, acceptance, submission, clear, interruption, retry/compaction/new run, model change, session new/resume/import/fork/clone, feature disable, and shell disposal; verify deterministic late-result races for each lifecycle class.
- [ ] 4.4 Discard a valid result when the ordinary editor is no longer empty, focused, enabled, prompt-mode, or presentation-eligible; verify hidden results never reappear later when the editor becomes eligible again.

## 5. Prompt rendering and interaction

- [ ] 5.1 Add a semantic bare-A1 prompt prefix that reuses the shared settings-search `PROMPT_GLYPH` (`❯`) and its foreground style without entering editor text or offsets; verify empty, typed, selected, copied, autocomplete, and submitted values exclude the prefix while comparison-profile rows remain unchanged.
- [ ] 5.2 Add explicit suggestion state to the editor port and render it with the shared settings-search quiet/faint placeholder style and block-caret treatment; verify ANSI-aware snapshots at narrow and wide widths, Unicode/display-width wrapping after the prefix, theme invalidation, and hardware-cursor position.
- [ ] 5.3 Route the configured `tui.input.tab` action so active built-in or extension autocomplete wins, otherwise a visible contextual suggestion becomes ordinary text; verify no raw Tab special case bypasses customized bindings.
- [ ] 5.4 On acceptance, render the text in the ordinary prompt color, retain the grey `❯`, move the caret after the final grapheme, and do not submit; verify subsequent editing and one later submit send only the final edited text and add it to history once.
- [ ] 5.5 Preserve empty-Enter as a no-op while ghost text is visible and preserve selection, clipboard, undo/redo, paste chips, pointer hit testing, bash/prompt modes, and immediate input presentation; verify focused editor and session-shell interaction tests.
- [ ] 5.6 Implement the prompt/suggestion branch as semantic component state rather than rendered-string matching; if a coherent editor unit is ported, update attribution and the pinned source-port/provenance ledgers and verify architecture/documentation governance.

## 6. Integrated behavior and evidence

- [ ] 6.1 Add a deterministic end-to-end shell fixture covering settle → background request → grey `❯` plus quiet suggestion → Tab → normal white text with caret at end → Enter → one prompt; verify one primary request and at most one suggestion request.
- [ ] 6.2 Add integration cases for explicit approval, obvious non-approval follow-up, no suggestion, filtering, draft-preservation, autocomplete priority, modal/extension-editor ownership, model switch, session replacement, and disposal; verify no case leaks suggestion instructions or output into transcript/history.
- [ ] 6.3 Add comparison-route and non-interactive regression coverage proving `a1 pi` and unsupported modes retain their existing editor rendering, key routing, request count, and session behavior.
- [ ] 6.4 Add a credential-gated real-provider probe that uses the selected model without tools and reports bounded request/timing evidence while redacting prompt content and credentials; verify it is excluded from default local validation.
- [ ] 6.5 Run focused contract, settings, adapter, editor, shell, architecture, and documentation tests during implementation, then push and verify all required CI checks without running the prohibited broad local suites.
- [ ] 6.6 Build the exact implementation worktree and obtain user-controlled Windows Terminal acceptance for visual style, wrapping, typing cancellation, autocomplete precedence, Tab-then-Enter behavior, extra-request disclosure, and unchanged `a1 pi`; record any contradiction as reopened work before merge authorization.
