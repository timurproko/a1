# Design

## Context

See `proposal.md` for motivation and the delta specifications for required behavior. The agent prompt currently uses Pi's multiline editor plus A1-owned selection, clipboard, pointer, and paste interception. Settings search instead owns a `LineInput`, calls `handleLineInputKey`, and uses the shared `PromptInput` only for rendering. As a result the two fields look related but do not share selection, copy/cut, multi-click, or capability policy, and Settings keeps a special `/` activation shortcut.

Settings is hosted as an owned route and currently receives no text-copy service. Any shared component must keep clipboard delivery outside the UI primitive, preserve direct and resident Settings hosting, and avoid importing shell implementation details into the component layer.

## Goals / Non-Goals

**Goals:**

- Make the bare-A1 agent prompt and Settings search instantiate the same interactive input component with explicit options.
- Preserve the agent prompt's existing multiline editing, selection, history, autocomplete, chip, submission, and paste behavior.
- Give Settings the same applicable text-editing and pointer-selection UX, including copy and cut, while keeping it single-line and forbidding paste.
- Open Settings search from the first printable input and retain that exact input in the query.
- Keep Settings list navigation and framed layout coherent while search owns text input.

**Non-Goals:**

- Enabling paste, multiline content, autocomplete, history recall, prompt chips, image input, or submission semantics in Settings search.
- Changing the pinned `a1 pi` editor or its settings UI.
- Changing Settings matching rules, result ordering, value editing, or scrollbar policy.
- Giving UI components direct operating-system clipboard access.

## Decisions

### 1. Share the interactive component, not only presentation

Factor the existing A1-owned editor interaction and `PromptInput` presentation behind one reusable input component contract. Both the ordinary agent prompt and Settings search will construct that component; callers provide behavior through options rather than rebuilding cursor, selection, mouse, and rendering logic.

The component options will distinguish at least single-line versus multiline behavior, placeholder visibility, acceptance/cancellation callbacks, clipboard copy/cut delivery, and paste capability. Agent-only facilities such as autocomplete, history, prompt chips, submission, and image/text paste remain attached through enabled options or adapters. Settings will no longer use `LineInput` as an independent editing implementation.

Keeping separate controllers with only shared colors and rules was rejected because it leaves the requested keyboard and pointer parity unenforced. Importing the complete session shell editor into Settings was rejected because it would couple an owned app to agent commands, history, and engine composition that Settings does not use.

### 2. Treat typing as Settings search activation

When Settings search is closed, an ordinary printable text input will create the shared input component and forward the same input to it, so the first character is never lost. The dedicated `/` search action and `/ search` guidance will be removed. Slash is ordinary query text when typed.

Navigation, value-changing, undo, close, and other declared Settings keys retain precedence over type activation. Escape cancels active search through the input contract. Result navigation keys that Settings owns continue to be intercepted before the input so arrows and content-boundary chords do not become query text.

The standing hint will use semantic `Type`/`search` roles, and the empty input placeholder will be exactly `Search settings`.

### 3. Put selection and editing parity in the shared input contract

The shared component will own the applicable agent-input editing behaviors for both surfaces: character and word cursor movement, deletion, select-all and selection extension, replacement of selected text by typing, pointer drag selection, double-click word selection, triple-click logical-content selection, `Ctrl+C` copy, and `Ctrl+X` cut. Settings' single logical line means triple-click selects the complete query.

Settings will pass a bounded text-copy callback supplied by composition. The callback will use the existing owned clipboard delivery boundary rather than writing the system clipboard from `ui/components`. Copy does not alter the query; cut copies first and then removes the selected range. Existing agent prompt clipboard behavior remains unchanged.

A new Settings-specific selection implementation was rejected because it would immediately recreate the drift this change is intended to remove.

### 4. Disable Settings paste as a component capability

The shared input's paste option will be enabled for the agent and disabled for Settings. When disabled, clipboard-paste bindings, bracketed terminal paste frames, and paste callbacks are consumed without inserting or replacing query text. This policy is enforced inside the component before caller-specific handling, rather than by omitting a Settings keybinding alone.

Ordinary typed text remains accepted, including multi-character keyboard chunks that are not paste-framed. No clipboard-read service is supplied to Settings. Agent paste preparation, chips, diagnostics, and async replacement retain their existing path.

Silently stripping paste after insertion was rejected because it can flash or filter on forbidden content. Letting Settings ignore only `Ctrl+V` was rejected because terminal bracketed paste and alternate bindings would bypass that check.

### 5. Route pointer and clipboard services through owned app boundaries

Settings will route pointer reports over the search row to the shared input before list hit-testing, using geometry produced by that same component. Wheel reports retain their existing result-list ownership. The owned route host will expose only the bounded text-copy operation needed by the app; tests and non-shell hosts may provide a no-op or fixture callback.

This keeps input selection geometry, visible selection paint, and clipboard extraction aligned without giving the app access to session-shell internals. Resident and direct Settings use the same route surface and therefore receive identical behavior.

## Risks / Trade-offs

- **[Shared refactoring regresses agent prompt behavior]** → Keep existing agent-focused selection, paste, history, autocomplete, chip, wrapping, and submission suites and add paired component configuration tests.
- **[Printable detection mistakes escape sequences for text]** → Reuse the shared input decoder and give declared Settings actions precedence before activation; cover legacy and extended key reports plus multi-character typed chunks.
- **[Disabled paste leaks through one transport]** → Test configured keybindings, bracketed paste in complete and fragmented frames, selection replacement attempts, and unchanged query state.
- **[Search pointer coordinates act on rows behind the input]** → Derive search-row hit geometry from the shared component and assert input ownership separately from wheel-to-results behavior.
- **[Clipboard composition broadens app authority]** → Expose a text-only callback with no clipboard read or shell object access, and retain existing bounded delivery and failure handling outside the component.

## Migration Plan

No persisted-data migration is required. Implement the shared configurable component first while retaining agent behavior, migrate Settings search to it, then switch activation and guidance and connect the text-copy boundary. Rollback restores the separate `LineInput` search and `/` activation without changing stored settings or session data.
