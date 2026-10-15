# Design

## Context

See `proposal.md` for motivation. The resident attach client receives structured `crossterm` key events, resolves tab-owned bindings, and then converts unmatched events back into terminal bytes. Its current converter preserves modifiers for character keys only partially and emits every navigation/editing key as an unmodified legacy sequence, so the child editor cannot distinguish Ctrl+Left from Left or Shift+Enter from Enter.

The direct path receives terminal-native sequences and the Pi input layer already recognizes legacy, xterm-modifier, modifyOtherKeys, and CSI-u forms. The resident fix should therefore stay at the attach boundary rather than add resident-specific prompt bindings.

## Goals / Non-Goals

**Goals:**

- Preserve Ctrl, Alt, and Shift identity for prompt-relevant character and non-character keys after tab-action dispatch.
- Emit canonical sequences already understood by the child input parser.
- Keep plain-key bytes and tab-owned shortcut precedence stable.

**Non-Goals:**

- Change editor word-boundary semantics or keybinding defaults.
- Change tab shortcut declarations or conflict resolution.
- Introduce a new wire-protocol message or dependency.

## Decisions

### Encode modifiers at the attach boundary

The existing key-event-to-bytes function will become modifier-aware. Plain keys retain their current legacy bytes. Modified arrows, Home/End, and tilde navigation keys use the conventional xterm modifier parameter; modified Enter, Backspace, Tab, and combinations that legacy control bytes cannot represent unambiguously use CSI-u. Character chords retain the established legacy form where it is lossless and use CSI-u for combined modifiers. On Windows, Ctrl+Enter forwards LF because Windows terminals send LF for that chord and ConPTY reports LF as Ctrl+Enter, so LF is what the direct prompt observes there.

This keeps the protocol and child unchanged while producing forms its shared key parser already understands. Forwarding the outer terminal's original bytes was considered, but `crossterm` has already parsed those bytes before attach dispatch and the implementation needs structured events to intercept tab actions.

### Test byte identity by key family

Focused Rust unit tests beside the encoder will cover plain-key stability and representative modifier combinations for word navigation, selection, deletion, newline, scrolling, and combined character shortcuts. Table-driven cases will make omissions visible without requiring a resident server integration fixture for deterministic byte conversion.

A child-editor-only test was considered, but it would not detect the modifier loss because that parser already handles the intended sequences correctly.

## Risks / Trade-offs

- [Terminal modifier encodings have legacy ambiguities] → Prefer explicit xterm/CSI-u forms accepted by the pinned child parser and retain legacy output only where identity is lossless.
- [A broad encoder change could alter tab shortcuts] → Keep tab-action resolution before encoding and test only unmatched forwarding behavior.
- [Outer terminals report lock-state or unsupported modifiers] → Encode only the supported Ctrl, Alt, and Shift mask used by A1 keybindings; do not reinterpret unrelated modifier state.

## Migration Plan

Ship the attach-client encoder change with the next native terminal-host build. No data migration is required. Rollback is the prior host binary and restores the previous forwarding behavior without changing persisted tab or session state.
