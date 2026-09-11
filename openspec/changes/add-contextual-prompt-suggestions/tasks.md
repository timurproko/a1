## Recorded implementation and verification

[PR #277](https://github.com/timurproko/a1/pull/277) merged on 2026-09-07 at `4654f0cb0b205038f9c3cef9220872ab1dbdccef`. The PR records a successful build/typecheck, 288+ focused contract/settings/adapter/component/session/composition tests, architecture and documentation checks, and strict change validation. Its final required CI checks passed, including fast validation, Windows Node 22/24 startup budgets, rendering, Linux/macOS containment, and `Development validation required`.

Task 6.5 records the original automated implementation/CI gate. On 2026-09-11, after the current suggestion behavior and its outstanding acceptance areas were summarized, the maintainer replied "yes accepted archive it". Task 6.6 now records that feature-level acceptance, without inventing a specific tested build, terminal geometry, per-case physical verdict, provider-probe execution, or pre-merge authorization.

Before archival, the maintainer requested one further adjustment: place Prompt suggestions in Agent instead of A1, then confirmed the presentation-only amendment with "yes do it". Preserve the original acceptance and completed implementation tasks; tasks 3.3, 3.4, 6.7, and 6.8 are new, unfinished corrective work. The change remains active until that placement is implemented, validated, and accepted. This request does not revive the abandoned suggestion-cache optimization or authorize implementation in the specification-only amendment PR.

## 1. Contract and lifecycle boundaries

- [x] 1.1 Add vendor-neutral suggestion request/result/state ports, enrich completed-assistant events with response/run identity and terminal-stop metadata, and add an `agent-run-settled` event; verify owned-contract validation rejects malformed, oversized, or mismatched identities.
- [x] 1.2 Emit an eligible completed-response boundary before settlement only for successful terminal text responses without tool continuation, and emit final-run settlement after authoritative transcript reconciliation; verify focused adapter event-order and continuation tests.
- [x] 1.3 Extend Pi capability conformance for the public authenticated simple-completion operation used by suggestions and verify an incompatible or missing operation fails closed at the integration boundary.

## 2. Suggestion generation

- [x] 2.1 Implement the independently authored next-user-prompt instruction and pure candidate validator; verify accepted approval/follow-up examples and rejection of empty, meta, assistant-voiced, evaluative, multiline, formatted, control-bearing, error-like, over-word, and over-length outputs.
- [x] 2.2 Implement the Pi-backed generator with a snapshot of the settled run's selected model, system prompt, messages, tool schemas, and thinking configuration through the authenticated public model runtime; verify the fake provider receives the selected model and cache-compatible parent prefix.
- [x] 2.3 Keep the completion outside an execution loop, reject tool-call/non-text responses, and prevent transcript/session mutation; verify no tool executes and serialized session entries are byte-for-byte unchanged by successful and failed generation.
- [x] 2.4 Add abort and bounded-deadline handling with silent user-facing failure; verify abort, timeout, provider error, and late resolution all return no publishable suggestion without delaying primary run settlement.

## 3. Setting and composition

- [x] 3.1 Add the live, default-enabled `promptSuggestions` A1 setting, its extra-selected-model-request disclosure, and any required settings-version migration; verify declaration, resolution, persistence, settings-screen grouping, and unknown-key preservation tests.
- [x] 3.2 Bind the setting and generator only in bare-A1 composition; verify disabling aborts and clears immediately, re-enabling affects only later runs, and comparison/non-interactive paths make no suggestion requests.
- [ ] 3.3 Move the declared Prompt suggestions control into the existing Agent presentation group through the owned settings section projection, preserving its A1 backend, stable identity, label, stored key/value, default, live effect, and request disclosure; verify one Agent group, one suggestion row after the unchanged engine-entry order, no A1 duplicate or empty A1 heading, unchanged other groups, and continued editability when engine settings are absent, failed, or not writable.
- [ ] 3.4 Add focused declaration, section, session, and settings-surface regressions for the relocation; verify a stored false value survives restart, toggles write only A1 storage and drive the existing live controller, engine settings retain capability filtering, search/section navigation/pointer/keyboard/refresh target the same row, and `a1 pi` plus accepted suggestion interactions remain unchanged without a settings-format migration.

## 4. Race-safe suggestion controller

- [x] 4.1 Implement the `idle`/`generating`/`prepared`/`available` controller with session generation, run sequence, assistant-response sequence, model identity, request epoch, settlement state, and abort ownership; verify only the newest fully matching result can publish.
- [x] 4.2 Start generation at the earliest eligible successful terminal assistant-response boundary for enabled interactive bare A1 with at least two assistant messages, an active model, and no permission/modal/replacement input; verify incomplete, failed, tool-continuing, and otherwise suppressed states produce zero requests.
- [x] 4.3 Clear or invalidate pending, prepared, and visible suggestions on later assistant/tool continuation, typing, paste, acceptance, submission, clear, interruption, retry/compaction/new run, model change, session new/resume/import/fork/clone, feature disable, and shell disposal; verify deterministic late-result races for each lifecycle class.
- [x] 4.4 Hold an early valid result without painting until its matching run settles, publish it in the settlement presentation when eligible, publish a slower current result immediately after settlement without artificial delay, and discard it when the editor is no longer eligible; verify hidden or stale results never reappear later.

## 5. Prompt rendering and interaction

- [x] 5.1 Add a semantic bare-A1 prompt prefix that reuses the shared settings-search `PROMPT_GLYPH` (`❯`) and its foreground style without entering editor text or offsets; verify empty, typed, selected, copied, autocomplete, and submitted values exclude the prefix while comparison-profile rows remain unchanged.
- [x] 5.2 Add explicit suggestion state to the editor port and render the complete suggestion atomically with the shared settings-search quiet/faint placeholder style and block-caret treatment; verify there is no staged reveal or animation timer and verify ANSI-aware snapshots at narrow and wide widths, Unicode/display-width wrapping after the prefix, theme invalidation, and hardware-cursor position.
- [x] 5.3 Route the configured `tui.input.tab` action so active built-in or extension autocomplete wins, otherwise a visible contextual suggestion becomes ordinary text; verify no raw Tab special case bypasses customized bindings.
- [x] 5.4 On acceptance, render the text in the ordinary prompt color, retain the grey `❯`, move the caret after the final grapheme, and do not submit; verify subsequent editing and one later submit send only the final edited text and add it to history once.
- [x] 5.5 Preserve empty-Enter as a no-op while ghost text is visible and preserve selection, clipboard, undo/redo, paste chips, pointer hit testing, bash/prompt modes, and immediate input presentation; verify focused editor and session-shell interaction tests.
- [x] 5.6 Implement the prompt/suggestion branch as semantic component state rather than rendered-string matching; if a coherent editor unit is ported, update attribution and the pinned source-port/provenance ledgers and verify architecture/documentation governance.

## 6. Integrated behavior and evidence

- [x] 6.1 Add deterministic end-to-end shell fixtures covering final response → concurrent background request → prepared result → settlement-time grey `❯` plus complete quiet suggestion → Tab → normal white text with caret at end → Enter → one prompt, plus settlement-before-result; verify one primary request and at most one suggestion request.
- [x] 6.2 Add integration cases for explicit approval, obvious non-approval follow-up, no suggestion, filtering, draft-preservation, autocomplete priority, modal/extension-editor ownership, tool or assistant continuation, model switch, session replacement, and disposal; verify no case leaks suggestion instructions or output into transcript/history and no working/status row remains for suggestion generation.
- [x] 6.3 Add comparison-route and non-interactive regression coverage proving `a1 pi` and unsupported modes retain their existing editor rendering, key routing, request count, and session behavior.
- [x] 6.4 Add a credential-gated real-provider probe that uses the selected model without tools and reports bounded request/timing evidence while redacting prompt content and credentials; verify it is excluded from default local validation.
- [x] 6.5 Run focused contract, settings, adapter, editor, shell, architecture, and documentation tests during implementation, then push and verify all required CI checks without running the prohibited broad local suites.
- [x] 6.6 Record the maintainer's acceptance of the existing suggestion behavior after reviewing settlement-time appearance without animation or retained status, visual style/wrapping, typing cancellation, autocomplete precedence, Tab-then-Enter behavior, extra-request disclosure, and unchanged `a1 pi`. The 2026-09-11 reply "yes accepted archive it" is the accepted feature-level verdict; it does not supply an unreported exact build, physical measurements, provider-probe result, or earlier merge authorization, and it does not accept the subsequently requested Agent placement.
- [ ] 6.7 After this amendment merges and implementation is explicitly requested, deliver the placement correction in a fresh code PR citing this change; verify focused settings/regression evidence and all required current-head CI checks pass, with no unrelated paths or auto-merge.
- [ ] 6.8 Provide the correction's exact worktree/commit and build-first `./scripts/dev` handoff, then obtain maintainer acceptance that `/settings` shows one editable Prompt suggestions control in Agent, no A1 duplicate/empty heading, preserved saved value and live toggle behavior, and unchanged other controls and `a1 pi`; record acceptance and explicit merge authorization, then synchronize both delta specs and archive only in the required post-merge OpenSpec-only follow-up.
