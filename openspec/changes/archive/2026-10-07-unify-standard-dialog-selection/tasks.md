## 1. Establish the Shared Selected Row

- [x] 1.1 Add an ANSI-aware owned selection renderer that preserves semantic foreground fragments, clips modal rows to the supplied content width, applies `selectedBg` only to the rendered item span, and never adds trailing selected cells or whole-row bold styling.
- [x] 1.2 Add focused helper coverage for the accent arrow, normal-text primary label, muted supporting text, semantic marker preservation, item-bounded background, narrow clipping, and absence of width overflow.

## 2. Unify the Standard Dialogs

- [x] 2.1 Route Models rows through the shared treatment while preserving scope markers, provider badges, active-model checks, filtering, scrolling, and model-name details; verify selected and unselected ANSI roles at wide and narrow widths.
- [x] 2.2 Route Skills rows through the shared treatment while preserving search, scrolling, descriptions, empty states, selection wrapping, and apply/cancel behavior; verify the selected highlight ends with the skill label.
- [x] 2.3 Adapt Thinking Level row presentation to the shared treatment while preserving aligned level/current/default/description columns, focus, filtering, wrap navigation, Enter selection, and immediate Space default persistence; update the copied-source provenance note and verify selected semantic roles.
- [x] 2.4 Apply the shared palette to the bare-A1 slash-command menu while preserving its `→`, aligned descriptions, clipping, navigation, completion behavior, and pinned comparison-profile presentation.
- [x] 2.5 Apply the shared palette to Settings list rows, structured-value rows, and floating choices while preserving item-bounded geometry, values, steppers, search, scrolling, pointer affordances, and persistence.
- [x] 2.6 Replace Session Tree's purple selected span with the shared blue palette while preserving its arrow and every selected entry's semantic foreground roles, hierarchy, horizontal clipping, and selected ellipsis coverage.
- [x] 2.7 Give Resume Session the blue `selectedBg` full-row surface and checkmark-green selected title without bold, while preserving its cursor, muted metadata, delete-error role, navigation, and actions.
- [x] 2.8 Remove Resume Session's redundant leading frame spacer and verify a retained `Resumed session` notice has the same one-row control adjacency with the dialog open or closed.

## 3. Validate the Unified Experience

- [x] 3.1 Run focused Models, Skills, Thinking, prompt-input, session-shell, modal-inventory, typecheck, architecture, and build scopes permitted by repository policy; record passing behavior and any explicit gap disposition in `evidence/validation.md`.
- [x] 3.2 Build the interactive candidate, incorporate the maintainer's physical-terminal feedback across `/models`, `/skills`, `/thinking`, `/resume`, `/tree`, `/settings`, and the `/` command menu, and receive the explicit request to advance the corrected candidate to ready CI; record the reviewed wide presentation and deterministic narrow-width evidence before finalization.
