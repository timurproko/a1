## Why

Session renaming should edit the existing name with familiar selection and clipboard controls. Users should be able to open it directly from the status footer without losing an unfinished prompt, and the footer already provides sufficient confirmation of a successful rename.

## What Changes

- Prefill bare-A1 `/name` with the current name and select it fully so typing immediately replaces it; unnamed sessions start empty.
- Support mouse drag selection, double-click word selection, triple-click full-name selection, Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V with prompt-matching selection colors and unchanged Enter/Escape hints.
- Give selected-text copying precedence over Ctrl+C dismissal; retain silent cancellation when no text is selected.
- Fit hover and click targets to footer text without added side spaces. Normal left-click opens the name dialog directly, retaining the prompt draft and attachments.
- Remove the initially implemented right-click Edit menu as explicitly superseded by the direct-click refinement.
- Give the footer's model name and thinking level matching text-only hover and direct-click access to their existing selectors, preserving the prompt draft.
- Show a visible provider as `model [provider] • thinking level`, matching the Models dialog while preserving existing qualifier visibility and narrow-layout priorities. The model and bracketed provider share one hover/click target, separate from the thinking level.
- Keep the active thinking level visible while its selector is open. Keep footer hover active over dock dialogs and make a same-control click cancel through Escape while a different control cancels and replaces the open dialog without exposing or submitting the prompt.
- Suppress bare-A1's successful `Session name set:` message; preserve genuine errors, naming normalization/persistence, unrelated dialogs, and comparison behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: selected prefill, mouse/clipboard naming, padded direct footer editing, and footer-only successful-name feedback.

## Impact

Session shell naming/feedback and footer pointer routing, neutral component contracts, Pi input/footer adapters, and focused tests. No data migration or upstream dependency changes.
