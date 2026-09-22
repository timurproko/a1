## Context

Bare A1 presents the transcript and bottom prompt through one fullscreen shell, but keyboard delivery still depends on runtime/component focus. The viewport's pre-input path already gives selected transcript copy, paste, and content-boundary navigation explicit precedence, while the editor owns prompt selection, clipboard edits, undo/redo, and cursor movement. A pointer interaction in content can disturb the focus state used by the ordinary editor even though no modal or replacement input has taken ownership, leaving the prompt visible but requiring another click before its shortcuts work.

The effective editor bindings are configurable and already resolved by the owned keybinding manager. Reimplementing a list of raw `Ctrl` sequences in the viewport would diverge from custom bindings, terminal encodings, shortcut help, and editor undo/selection semantics.

Physical testing of candidate `c50bf418` showed that restoring only the outer runtime component was insufficient: that bridge could already report focused while the nested ordinary input surface remained unfocused. Physical testing of the follow-up candidate `a6b4d8dc` showed that pointer-time nested focus restoration was also insufficient: focus could still be absent when the later key or terminal-provided bracketed paste reached TUI dispatch. The correction must reassert the ordinary root as keyboard owner at each non-modal keyboard receipt, immediately before established viewport/editor dispatch, rather than relying on remembered pointer-time focus.

## Goals / Non-Goals

**Goals:**
- Keep all effective ordinary-prompt editing actions available after content-area pointer interaction.
- Preserve the existing owner and precedence for transcript copy, viewport navigation, modals, replacement inputs, and autocomplete.
- Continue dispatching through the editor's resolved keybindings and existing edit implementation.

**Non-Goals:**
- Make prompt shortcuts operate through a focused modal or replacement editor.
- Change clipboard acquisition, paste preparation, transcript selection semantics, shortcut defaults, or shortcut help.
- Change the pinned `a1 pi` comparison profile or patch installed Pi/TUI packages.

## Decisions

### 1. Separate pointer ownership from ordinary keyboard ownership

On the default bare-A1 screen, transcript selection, scrolling, scrollbar use, sticky-prompt activation, and empty-content clicks may own their pointer gesture but SHALL NOT leave the ordinary prompt unfocused for subsequent keyboard editing. After pointer routing, restore the nested default input surface for presentation. More importantly, whenever no overlay or replacement input owns a later keyboard event, reassert the ordinary root through the runtime focus boundary before normal dispatch; this preserves runtime listeners, key-release filtering, viewport precedence, and terminal-provided bracketed paste while making stale focus irrelevant. Pointer latches remain owned through release.

Do not synthesize a click into the prompt or move its caret. Focus restoration changes only keyboard eligibility and cursor presentation; the draft, prompt selection, atomic-chip focus, history position, undo/redo stacks, autocomplete state, and pending paste reservations remain intact.

Alternative rejected: require a prompt click after every content interaction. This is the reported behavior and makes keyboard editing depend on pointer location.

### 2. Let the editor dispatch its complete effective action set

Once ordinary prompt ownership is established, deliver keyboard input through the existing editor facade and keybinding manager. This automatically covers current and future declared prompt actions—including selection, copy, cut, paste, undo, redo, deletion, and caret/word/line navigation—and honors custom bindings and supported terminal encodings.

The viewport may identify ownership/preemption, but SHALL NOT maintain a second hardcoded inventory or invoke private editor operations for each chord. Regression fixtures will derive representative keys from effective declarations and prove that dispatch still reaches the editor after content interaction.

Alternative rejected: intercept only `Ctrl+V` or enumerate common platform shortcuts in the pre-input listener. Either leaves the same bug for other editing actions and can diverge from configuration.

### 3. Preserve existing routing precedence

Routing remains ordered by semantic owner:

1. A focused modal, nested overlay, or replacement input retains its local keyboard input.
2. On the ordinary screen, `Ctrl+C` with a real transcript selection copies that transcript selection exactly once; prompt selection retains its existing copy precedence where already established.
3. Declared viewport actions such as content-boundary and prompt-anchor navigation retain their current ownership.
4. Remaining input reaches the ordinary prompt and its effective bindings.

An unextended transcript click creates no synthetic selection and therefore does not consume copy. Pointer focus restoration does not let the hidden ordinary editor intercept modal paste, save, cancel, navigation, or editing keys. Closing a modal returns to the established ordinary prompt path without rewriting its state.

Alternative rejected: globally forward editor shortcuts regardless of active surface. That would violate modal and replacement-input ownership.

### 4. Verify focus, dispatch, and state rather than only final text

Tests will click or complete gestures over selectable transcript text, blank viewport content, scrollbar/control regions, and the prompt boundary, then invoke representative effective prompt bindings. Evidence will assert the keyboard owner, action count, draft/caret/selection state, undo/redo results, and clipboard/paste admission. Include transcript-copy precedence, custom remapped bindings, modal/replacement isolation, autocomplete continuity, mixed mouse/keyboard chunks, and comparison-profile controls.

Use shell/runtime integration fixtures in addition to controller unit tests so a controller that reports input correctly while runtime focus still drops cannot pass. Physical handoff will verify the user's exact click-then-paste sequence and representative copy/cut/undo/redo/navigation flows in the built candidate.

## Risks / Trade-offs

- **[Focus restoration changes caret placement]** -> Restore only keyboard focus and assert the existing caret, prompt selection, chip focus, and history state are unchanged.
- **[Transcript copy starts editing the prompt]** -> Keep real transcript-selection copy ahead of ordinary editor dispatch and test exact-once behavior.
- **[A modal leaks keys to the prompt]** -> Gate restoration and dispatch on the default input surface with no focused overlay; test every surface family through shared ownership seams.
- **[Hardcoded tests miss configurable bindings]** -> Resolve keys from the effective declarations and include a remapped-binding fixture.
- **[Related viewport performance work touches pointer routing]** -> Reconcile the implementation base before editing shared files and preserve semantic ownership independently of presentation coalescing.

## Migration Plan

1. Capture the failing runtime focus/dispatch sequence after content interaction on the fresh implementation base.
2. Add the smallest owned focus/routing correction at the shell/runtime boundary, retaining editor dispatch as the action authority.
3. Validate pointer regions, editor state, precedence, overlays, custom bindings, and comparison behavior.
4. Build and hand off the exact candidate for click-then-shortcut testing. No settings or stored-session migration is required; rollback removes the focus/routing correction without modifying user data.
