## 1. Establish the focus and routing baseline

- [x] 1.1 Reconcile the implementation base with current viewport selection, clipboard, input coordination, autocomplete, and related active-change boundaries; verify the compatibility map identifies ordinary prompt, viewport, overlay, and replacement-input ownership without modifying unrelated artifacts.
- [x] 1.2 Add a runtime-level reproduction for clicking selectable and blank content before invoking paste and other prompt-editing bindings; verify evidence distinguishes controller consumption, runtime focus, editor focus, and final dispatch rather than asserting only unchanged text.
- [x] 1.3 Inventory prompt-editing actions from effective keybinding declarations and representative terminal encodings; verify the implementation does not create a second hardcoded shortcut registry.

## 2. Keep the ordinary prompt keyboard-ready

- [x] 2.1 Preserve or restore ordinary prompt keyboard focus after transcript clicks, completed selections, wheel/scrollbar actions, sticky/bottom controls, and suppressed blank-content gestures; verify no synthetic prompt click, caret movement, draft mutation, or selection/history reset occurs.
- [x] 2.2 Route subsequent keyboard input through the existing editor facade and effective keybinding manager; verify selection, copy, cut, paste, undo, redo, deletion, and cursor/word/line navigation actions dispatch through the established editor path after content interaction.
- [x] 2.3 Preserve editor state across focus repair; verify prompt selection, atomic-chip focus, autocomplete, undo/redo stacks, paste reservations, prompt history position, and submission readiness remain unchanged except for the requested action.

## 3. Preserve semantic input precedence

- [x] 3.1 Keep selected-transcript copy and viewport-owned navigation ahead of ordinary prompt dispatch; verify transcript `Ctrl+C` copies exactly once, unextended clicks do not synthesize a selection, prompt selection copy remains correct, and viewport shortcuts do not also edit the draft.
- [x] 3.2 Keep focused overlays, nested modals, and replacement inputs authoritative; verify their paste, save, cancel, editing, and navigation keys do not reach the hidden ordinary prompt and closing them restores normal prompt availability.
- [x] 3.3 Preserve configurable bindings and terminal key variants; verify the focus repair hands input back to declaration-driven editor dispatch without adding fallback behavior for displaced defaults.
- [x] 3.4 Preserve the pinned `a1 pi` path and installed dependency boundary; verify no comparison focus, selection, keybinding, or clipboard behavior changes and no installed package is patched.

## 4. Validate and hand off

- [x] 4.1 Run focused controller, shell, runtime, editor, clipboard/paste, selection, autocomplete, overlay, and keybinding regression coverage; verify mixed mouse/keyboard input and declared pointer-region routing retain exact action counts and state.
- [x] 4.2 Build the candidate and prepare the required validation scopes; verify focused runtime and shell integration checks pass without treating controller-only tests as proof of runtime focus behavior.
- [x] 4.3 Prepare exact-candidate handoff steps for click-then-paste, copy, cut, undo, redo, and navigation; verify the steps exercise prompt shortcuts without clicking the prompt first and include modal/transcript precedence controls.
