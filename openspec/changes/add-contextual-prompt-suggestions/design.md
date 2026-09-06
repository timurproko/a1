## Context

See `proposal.md` for motivation and `specs/contextual-prompt-suggestions/spec.md` for behavior.

Bare A1 already has the boundaries needed for most of this feature:

- `PiEngineAdapter` owns the public Pi session, model runtime, selected model, event conversion, and session-generation counter.
- `OwnedUiSessionShell` receives semantic run events and owns transient interaction orchestration.
- `OwnedUiSessionShellRoot` owns the ordinary editor and knows whether a replacement surface is active.
- `PiShellEditorPort`, `OwnedEditor`, and `OwnedEditorUxInterception` provide the A1-owned seam around Pi's editor behavior.
- `tui.input.tab` already represents configurable Tab/autocomplete acceptance.

The current neutral event stream exposes `agent-run-started` and `assistant-message-completed`, but not final run settlement. `assistant-message-completed` is too early because an agent run can include multiple assistant messages and tool turns. Pi's underlying `agent_settled` event is the correct generation boundary.

The selected Pi runtime exposes its model, system prompt, messages, tools, thinking level, and authenticated `ModelRuntime`. The public model runtime can issue a simple completion against an explicit context. The suggestion path must use those public objects at the integration boundary; it must not deep-import Claude Code, Pi internals, or installed distribution files.

Claude Code research was performed against `D:/Git/claude-code-source` at commit `d43bd40690853fd323758e038cb686930d53a39f`. Relevant evidence is:

- `src/query/stopHooks.ts`: starts generation fire-and-forget after a main-thread turn.
- `src/services/PromptSuggestion/promptSuggestion.ts`: inherits cache-relevant parent context, disables tool execution, asks for a short user-voiced prediction, and filters results.
- `src/utils/forkedAgent.ts`: isolates the request while retaining the parent model, system prompt, messages, tools, and thinking configuration for cache reuse.
- `src/hooks/usePromptSuggestion.ts`: tracks shown, accepted, ignored, and cancelled lifecycle state.
- `src/components/PromptInput/PromptInput.tsx` and `src/hooks/useTypeahead.tsx`: show the result only in an empty prompt and accept it through Tab/right-arrow handling.

This source is behavioral evidence only. No Claude implementation or prompt text will be copied.

## Goals / Non-Goals

**Goals:**

- Preserve the user's selected model and conversation context while isolating suggestion inference from the main session.
- Keep generation asynchronous, cancellable, race-safe, and invisible to the persisted transcript.
- Represent suggestion state explicitly rather than inferring it from rendered rows.
- Integrate with the existing editor and keybinding semantics without weakening autocomplete, extension, or responsiveness guarantees.
- Make the extra-request behavior visible in the setting description and deterministic in tests.

**Non-Goals:**

- Predict multiple alternatives or present a selectable suggestion menu.
- Auto-submit a suggestion on empty Enter; acceptance and submission remain separate.
- Execute speculative agent work before the user submits the suggestion.
- Parse only explicit phrases such as `Please say ...`; the model predicts from conversation context.
- Persist suggestions, reuse them after resume, or add them to prompt history before submission.
- Change `a1 pi`, upstream Pi, permission dialogs, or extension-owned editors.
- Copy Claude Code source or reproduce its analytics/speculative-execution subsystem.

## Decisions

### 1. Generate at final run settlement through a neutral capability

Add an `agent-run-settled` semantic event to the owned event contract and emit it only for the final settlement of a run, after authoritative transcript reconciliation. Add a narrow, vendor-neutral prompt-suggestion generator port whose request includes immutable session generation, run identity, and cancellation signal and whose result contains candidate text plus request identity.

The bare-A1 composition will provide the Pi-backed implementation and a shell-local controller will invoke it only when the feature is enabled and the ordinary editor can eventually display a suggestion. The explicit comparison path will not install the controller or call the generator.

This keeps model-specific context assembly at the integration boundary while allowing lifecycle and UI policy to remain independently testable. It also avoids treating `assistant-message-completed` as settlement.

Alternative considered: generate directly inside `PiEngineAdapter` on every `agent_settled`. Rejected because comparison or non-interactive consumers could pay for requests they never display, and presentation eligibility would leak into the engine adapter.

Alternative considered: trigger on `assistant-message-completed`. Rejected because tool loops can produce several such events within one run.

### 2. Use the selected model through the existing authenticated ModelRuntime

At request creation, the Pi implementation will capture the active model and a snapshot of the parent agent context: system prompt, messages, tool schemas, and thinking configuration. It will call the authenticated public `ModelRuntime.completeSimple` capability with the same selected model and a final user message containing an A1-owned prediction instruction.

Tool schemas remain in the request where needed to preserve the same cacheable prefix, but the simple completion is never connected to an execution loop. A response containing tool calls is rejected. This makes the request tool-free in effect while retaining the best available prompt-cache reuse. No output-token or reasoning override will be introduced initially because changing cache-relevant request configuration can defeat prefix reuse; the request is bounded by cancellation/deadline and strict output validation instead.

The generator will select the first plain text response, trim it, validate it, and return no candidate for tool calls, non-text output, API errors, aborts, or filtered text. Provider failures remain silent in the conversation; bounded debug diagnostics may record a reason without recording sensitive conversation or suggestion text.

Alternative considered: create a new full `AgentSession`. Rejected because it adds session/extension lifecycle side effects and is unnecessary for one tool-free completion.

Alternative considered: use a fixed cheap model. Rejected because the user selected Claude-like behavior and the selected model has the compatible provider context and conversational style. A future setting may introduce a separate model only through a new proposal.

Alternative considered: deterministic extraction from the final answer. Rejected because it cannot produce Claude-like follow-ups when no explicit reply string exists.

### 3. Use an A1-owned prediction instruction and validator

The instruction will ask for the single most likely thing the user would naturally type next, use recent user intent over generic recommendations, return only a short user-voiced phrase, and return no text when the continuation is unclear. Examples may cover approval, testing, committing, pushing, choosing an offered option, and silence after an error, but wording will be independently authored.

Validation is deterministic and provider-independent:

- trim surrounding whitespace;
- reject empty, multiline, ANSI/control-bearing, markup-bearing, multi-sentence, error-like, or meta output;
- allow 2–12 words and fewer than 100 characters;
- allow a small reviewed set of single-word affirmations, negations, actions, and slash commands;
- reject common assistant-voice prefixes and evaluative pleasantries;
- never truncate an invalid candidate into a valid one.

The validator does not classify a suggested command as safe to execute. Safety comes from inert presentation and the required two-step accept/submit interaction; ordinary agent/tool permission policy still applies after submission.

Alternative considered: accept any model text and truncate it. Rejected because truncation can change meaning and can expose provider errors or terminal-control content.

### 4. Keep suggestion state transient and identity-checked

Introduce a controller state machine with `idle`, `generating`, and `available` states. Each generation carries:

- session generation;
- settled-run sequence;
- provider/model identity;
- monotonically increasing request epoch;
- `AbortController`.

Publishing succeeds only if all captured identities still match, the setting remains enabled, the shell has not been disposed, no newer request exists, and the ordinary editor is still empty and eligible. Every invalidating action aborts the controller and increments its epoch before changing other state, so a provider that resolves after abort still cannot publish stale text.

Acceptance atomically clears available suggestion state and inserts its text into the editor. The editor's normal submit path remains the only path that sends it. Suggestions are shell-transient and do not enter the backend view snapshot or session file.

Alternative considered: store suggestion text in the persistent session/view model. Rejected because it is ephemeral presentation state, would complicate resume semantics, and risks leaking a stale suggestion across replacement.

### 5. Add a semantic suggestion seam and shared prompt affordance to the ordinary editor

Extend `PiShellEditorPort` with explicit operations to set/clear a prompt suggestion and register an acceptance callback. The A1-owned editor implementation will hold suggestion text separately from its text buffer.

The bare-A1 ordinary prompt row will reuse the shared `PROMPT_GLYPH` presentation (`❯` and its foreground style) already used by `renderInputRow` for the settings search field. The prefix is visual only: selection, caret offsets, copied text, history, autocomplete replacement ranges, and submitted text remain indexed against the editor buffer. Prompt layout reserves the glyph's display width before wrapping both typed and suggested content. Comparison profiles retain their existing editor rows.

When the buffer is empty, focused, submit-enabled, in prompt mode, and autocomplete is not showing, the editor will render a source-owned empty-input suggestion branch. Its suggestion text reuses the shared settings-search placeholder treatment (`faint`/quiet styling), including the block caret over the first suggestion cell. After Tab acceptance, the same characters are rendered by the ordinary prompt-text path with normal text color and the caret immediately after the final grapheme; the grey `❯` prefix remains unchanged. The implementation will use the same border, padding, cursor marker, display-width wrapping, and theme invalidation rules as the ordinary editor and must not discover or replace placeholder cells by matching rendered strings. If the current public editor surface cannot support that branch cleanly, port the minimum coherent editor rendering unit with provenance rather than inspect private fields or patch the dependency.

`OwnedEditor.handleInput` will preserve this precedence:

1. extension shortcut and active surface ownership;
2. active built-in/extension autocomplete;
3. contextual suggestion acceptance through the configured `tui.input.tab` action;
4. existing editor and application actions.

Acceptance sets normal editor text and caret-at-end, requests an immediate render, and does not call submit. Because ghost text never enters the buffer, Enter on the empty editor keeps its existing no-op behavior.

Alternative considered: render a widget above the editor. Rejected because the requested experience is in-prompt ghost text and a widget would have different focus, geometry, and lifetime.

Alternative considered: post-process `Editor.render()` output to replace its blank cursor row. Rejected because it couples semantics to ANSI output and violates the repository's rendered-string-substitution boundary.

### 6. Suppress generation and display independently

Generation is skipped when disabled, non-interactive, before two assistant messages, after an errored response, without an active model, or while a permission/dialog/replacement input is active. A request already running is aborted on typing or paste, submission, clear, interruption, retry/compaction/new run, model change, session replacement, settings disable, or disposal.

Display has an additional final gate: ordinary editor active and focused, prompt mode, empty semantic text, submit enabled, and no active autocomplete. A valid result that cannot pass that gate at publication time is discarded rather than retained for surprise display later.

This deliberately prefers predictability over delayed suggestions. It also avoids displaying leader-context text in future secondary-agent input surfaces.

Alternative considered: retain hidden suggestions until the editor becomes empty. Rejected because the suggestion may be stale by then and its sudden appearance is harder to reason about.

### 7. Add one live A1 setting, enabled by default

Add an A1-owned boolean setting named `promptSuggestions`, defaulting to enabled. Its description explicitly says that eligible turns make one additional background request with the selected model. The settings owner applies it live to the controller: disabling aborts and clears immediately; enabling affects only later settlements.

The setting belongs to the existing A1 settings metadata/store, not Pi-generated settings metadata, because it controls a declared A1 addition. No environment-only rollout flag is required for the first implementation; rollback is available through the setting and release rollback.

Alternative considered: no setting. Rejected because an automatic paid/background inference needs direct user control.

### 8. Validate behavior at pure, integration, and physical-terminal levels

Use a fake generator port to cover eligibility, filtering, cancellation, stale-result races, request count, and no-transcript mutation deterministically. Add editor-level tests for ghost rendering, display width, semantic emptiness, autocomplete priority, configurable Tab, acceptance without submission, editing, and Enter behavior. Add shell/adapter integration tests for settled-run timing, model/session replacement, settings, and tool-call rejection.

A credential-gated real-provider test will prove that the selected model path can produce a suggestion without tools or transcript mutation. It must not be a default local test. Final acceptance uses the exact implementation worktree in Windows Terminal and verifies visible latency, wrapping, cancellation while typing, Tab-then-Enter, autocomplete coexistence, and `a1 pi` non-interference.

## Risks / Trade-offs

- **[Additional latency and token cost]** → Run after settlement, never await it on the primary path, preserve the parent cacheable prefix, disclose the extra request in settings, and allow immediate disable.
- **[Prompt-cache reuse varies by provider]** → Treat cache reuse as an optimization rather than correctness; preserve parent request context without claiming a guaranteed hit.
- **[Prompt injection influences the prediction]** → Keep output inert, reject controls/formatting/tool calls, require separate acceptance and submission, and retain normal downstream permission policy.
- **[Race publishes stale text]** → Validate session, run, model, request epoch, editor state, and setting at publication even after abort.
- **[A slow provider leaves background work alive]** → Use a bounded deadline and abort on every lifecycle invalidation and disposal path.
- **[Editor rendering diverges from Pi geometry]** → Add a semantic source-owned render branch, reserve the shared prompt glyph width explicitly, test empty/ghost/accepted/typed states at narrow and wide widths, verify cursor positions, and avoid ANSI string matching.
- **[Tab conflicts with autocomplete]** → Give existing autocomplete strict precedence and use the configured action id rather than raw byte matching.
- **[Broad suggestions feel intrusive]** → Require strict eligibility and filtering, show only in an otherwise empty prompt, discard rather than defer, and provide a live disable setting.
- **[Hidden request usage is confused with conversation context]** → Keep it out of transcript/context accounting, document it as a separate request, and report request counts in acceptance evidence rather than pretending it is part of the main prompt.

## Migration Plan

1. Add the neutral settlement event and suggestion generator/test ports without enabling generation.
2. Implement and conformance-test the Pi model-runtime generator and deterministic validator.
3. Add the controller, setting, and cancellation lifecycle while keeping presentation disabled.
4. Add semantic editor ghost rendering and Tab acceptance for bare A1 only.
5. Run focused contract, adapter, component, shell, settings, race, and architecture tests; then run CI-required validation.
6. Perform credential-gated provider and physical Windows Terminal acceptance before merge authorization.

Rollback is non-destructive: disable `promptSuggestions` live or revert the implementation. No persisted session migration is required because suggestions are never stored.
