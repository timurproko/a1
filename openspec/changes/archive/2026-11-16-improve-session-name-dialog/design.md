## Context and approved refinements

The initial implementation added current-name prefill, prompt-colored selection and clipboard editing, and a footer-name right-click Edit menu. Follow-up user instructions explicitly replace that menu with direct left-click editing, add one cell of hover padding on each side, select the current name on opening, add double/triple-click selection, and suppress the redundant successful-name message. Continue the same branch and PR; retained checked outcomes describe unchanged delivered work, and affected/new outcomes remain unchecked until their updated code and tests are written.

## Goals / Non-Goals

Goals: a name editor immediately ready for replacement; familiar drag, repeated-click, clipboard, and undo behavior; direct footer access without losing prompt text or attachments; footer-only successful rename confirmation.

Non-goals: change persistence or normalization, alter the comparison profile, add history/autocomplete/images to the name field, or add new visible shortcut guidance.

## Decisions

### Selected prefill

Read the actual current name on each invocation. Initialize the name field with the entire nonempty value selected and the caret at its end. Unnamed sessions remain empty. Initial text/selection is the undo baseline, not an editable user action. Explicit caret movement collapses selection for appending; immediate typing or paste replaces it. Public extension inputs retain their existing behavior.

### Single-line editing and repeated clicks

Retain the compact shared modal frame and Enter/Escape hints. Reuse the prompt's selection painter and existing clipboard boundary. Keep input single-line, sanitized, grapheme-aware, horizontally scrollable, and bounded. Double-click selects the contiguous word/whitespace/punctuation class under the pointer using the prompt's 500 ms repeat interval; triple-click selects the entire field, including horizontally hidden text. Button release must not collapse these selections. Ordinary drag and intervening edits reset repeat tracking. Clipboard completion cannot modify a stale or dismissed field.

### Padded footer direct click

Reserve one blank cell before and after the painted footer name without moving text on hover. The same padded span is both the highlight and left-click target. Preserve normal foreground over the current subtle accent-selected background. Derive hit geometry from the current footer render, including clipping, gutters, extension status rows, and resize; neighboring labels, unnamed/comparison sessions, and extension-replaced footers have no name target. A normal left press opens the existing naming workflow directly and consumes its remaining gesture so release cannot act on the new dialog. Prompt text, attachments, and selection state stay owned by the retained prompt editor. Remove the superseded menu component and its factory contract rather than leaving a hidden right-click route.

The pre-pivot reference (parent of `9f0307c0`, native attach popup/strip painter) established the subtle accent-selected hover background and normal foreground. Retain that hover treatment, but no context menu remains after the explicit user refinement.

### Consistent model and thinking controls

The visible active model name and thinking level use the same padded hover/left-click convention. Explicit footer spans distinguish model, level, and name from provider metadata, separators, and clipping markers. Clicking invokes the existing Models or Thinking Level workflow without prompt submission. Missing or suppressed spans, comparison and extension-replaced footers remain noninteractive. Preserve each span's semantic foreground and retained prompt/attachment lifecycle.

### Footer-only successful-name feedback

Bare-A1 successful naming must update persisted session state, footer, and terminal title without appending `Session name set:` to transcript or notices. Suppress only the successful name result at the owned presentation boundary. Preserve genuine errors, other workflow output, and comparison naming messages; do not hide results by matching message text.

### Lifecycle and startup

Optional name-field code loads on demand behind the existing compact input placeholder with ordered bounded keyboard/pointer buffering. Footer interaction prepares after the first synchronous frame; ordinary input routing remains untouched until ready. Use owning controllers for state so the shell/root size ratchets and startup budget remain unchanged. Retain copied-source provenance and existing cancellation/disposal boundaries.

## Risks and delivery

Cover complete shell pointer routing, not only direct component input. Check word selection on wide graphemes and scrolled names, selection retention on release, padded target exclusion of neighboring metadata, and prompt/attachment retention. Deliver the six ordered task groups in the PR; trusted automation owns refinalization and exact-head CI. No migration is required.
