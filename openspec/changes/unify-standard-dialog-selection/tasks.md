## 1. Establish the Shared Selected Row

- [x] 1.1 Add an ANSI-aware owned dialog-row renderer that preserves semantic foreground fragments, clips to the supplied content width, applies `customMessageBg` only to the rendered item span, and never adds trailing selected cells or whole-row bold styling.
- [x] 1.2 Add focused helper coverage for accent primary text, muted supporting text, semantic marker preservation, item-bounded background, narrow clipping, and absence of width overflow.

## 2. Unify the Standard Dialogs

- [x] 2.1 Route Models rows through the shared treatment while preserving scope markers, provider badges, active-model checks, filtering, scrolling, and model-name details; verify selected and unselected ANSI roles at wide and narrow widths.
- [x] 2.2 Route Skills rows through the shared treatment while preserving search, scrolling, descriptions, empty states, selection wrapping, and apply/cancel behavior; verify the selected highlight ends with the skill label.
- [x] 2.3 Adapt Thinking Level row presentation to the shared treatment while preserving aligned level/current/default/description columns, focus, filtering, wrap navigation, Enter selection, and immediate Space default persistence; update the copied-source provenance note and verify selected semantic roles.

## 3. Validate the Unified Experience

- [x] 3.1 Run focused Models, Skills, Thinking, prompt-input, session-shell, modal-inventory, typecheck, architecture, and build scopes permitted by repository policy; record passing behavior and any explicit gap disposition in `evidence/validation.md`.
- [ ] 3.2 Build the interactive candidate and obtain maintainer review of `/models`, `/skills`, and the Thinking Level dialog at wide and narrow terminal widths, confirming they match Session Tree selection without changing dialog actions; record the physical result before finalization.
