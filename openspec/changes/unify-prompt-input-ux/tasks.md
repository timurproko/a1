## 1. Shared input presentation

- [x] 1.1 Extract the shared A1 input presentation component with semantic body/rule composition, prefix and caret integration, and exposed geometry; verify component tests cover empty, filled, multiline, narrow, and wide-grapheme rows without per-instance chrome styling.
- [x] 1.2 Centralize neutral rules matching the existing Settings reference and undimmed arrows matching the submitted-prompt foreground; verify effective foreground/intensity tests and that quiet placeholders do not dim the prefix or rules.
- [x] 1.3 Migrate Settings search to the shared component while retaining its single-line controller; verify filtering, horizontal scrolling, placeholder/caret behavior, cancellation, and focus restoration in Settings tests.
- [x] 1.4 Migrate the bare-A1 agent editor to the same component using semantic layout boundaries, retaining neutral rules through thinking-level and bash-mode changes; verify shared composition is used and editor render tests preserve suggestions, history annotations, wrapping, and cursor markers without ANSI border rewriting.
- [x] 1.5 Connect selection and pointer geometry to the shared component; verify editing regressions cover multiline selection/copy, wide graphemes, paste chips, history, suggestions, resize, and unchanged submitted text.

## 2. Status-bar level styling

- [x] 2.1 Add a bare-A1 footer presentation option that colors only the authoritative level-name span through the existing thinking color mapping, including off with an active model and max where supported; verify each level's effective foreground and unchanged neighboring model/provider/separator styling.
- [x] 2.2 Preserve current footer fitting, provider omission, usage, extension statuses, and no-model behavior; verify narrow-width ANSI-aware rendering and level updates after cycling, settings changes, model clamping, and session restoration.

## 3. Shortcut defaults and discoverability

- [x] 3.1 Set the A1 level-cycle default to Ctrl+L and model-selection default keys to empty, leaving Shift+Tab unassigned; verify default declarations contain no replacement key for model selection and no agent-input action for Shift+Tab.
- [x] 3.2 Verify dispatch across supported legacy and extended terminal encodings: Ctrl+L cycles exactly once without opening model selection or inserting text, and Shift+Tab leaves draft, focus, selection, suggestions, and level unchanged; add focused regressions for empty/nonempty drafts and visible suggestions.
- [x] 3.3 Preserve `/model` access, explicit user override/conflict behavior, and dialog-local Ctrl+L scope; verify model selection still works by command and a modal-local key cannot also cycle the agent level.
- [x] 3.4 Derive affected A1 startup/help labels from resolved bindings and document the default shortcut change; verify defaults show Ctrl+L for level cycling, no model-selector key, no Shift+Tab agent action, and customized labels reflect actual bindings.

## 4. Integration and acceptance

- [x] 4.1 Add paired bare-A1/pinned-profile regressions proving `a1 pi` retains its editor border mappings, footer, shortcut defaults, and help while A1 uses the new presentation; verify without replacing pinned expected outputs with A1-generated baselines.
- [ ] 4.2 Validate the change with strict OpenSpec validation and publish the implementation pull request citing this accepted specification; verify required CI checks pass and report the result without enabling code auto-merge.
- [ ] 4.3 Provide an exact build-first, color-preserving implementation-worktree handoff and obtain user visual/interaction acceptance; verify white reference bars, undimmed matching arrows, colored level labels, Ctrl+L cycling, inert Shift+Tab, `/model` access, Settings filtering, and unchanged pinned comparison under Windows Terminal, including resize and active streaming.
- [ ] 4.4 After explicit user acceptance and merge authorization, merge the code pull request and record acceptance in a specification-only follow-up; verify merged state before synchronizing deltas, archiving the completed change, and cleaning retained worktrees.
