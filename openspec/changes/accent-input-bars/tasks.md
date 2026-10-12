## 1. Establish semantic rule styling

- [ ] 1.1 Replace the shared prompt rule's fixed RGB styling with the injected theme's semantic `border` role, including exported helpers, and verify focused component tests cover plain and annotation-bearing rules.
- [ ] 1.2 Keep rule fragments and trailing fill on one semantic style while preserving ANSI-aware width and geometry, and verify narrow, multiline, history, scroll, and autocomplete-counter fixtures remain aligned.

## 2. Preserve shell boundaries and live behavior

- [ ] 2.1 Verify the bare-A1 agent prompt and Settings search match modal border cells across representative accents while arrows, text, caret, placeholder, and thinking-level styling retain their established roles.
- [ ] 2.2 Verify a live accent change repaints visible shared input rules without changing draft, cursor, selection, focus, or dimensions.
- [ ] 2.3 Verify thinking-level and bash-mode transitions do not replace bare-A1's semantic border styling and the `a1 pi` comparison retains pinned border behavior.

## 3. Complete focused evidence

- [ ] 3.1 Run the focused shared-input, prompt UX, theme/accent, Settings, and comparison-profile tests plus type checking and strict OpenSpec validation, recording results and any known-gap disposition in implementation evidence.
- [ ] 3.2 Review the final diff for fixed color literals, accidental multipane scope, geometry changes, and comparison drift; document the resulting active-input behavior and manual color-check steps.
