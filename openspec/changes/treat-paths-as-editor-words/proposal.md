## Why

The bare-A1 prompt editor currently inherits Pi TUI's punctuation-oriented word boundaries, so a path such as `D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl` is split at every slash, dot, colon, and hyphen. Ctrl+Arrow and Ctrl+Backspace/Delete therefore require many operations instead of treating the path as the single editing token users expect.

## What Changes

- Recognize high-confidence absolute and explicitly relative filesystem path tokens in the bare-A1 prompt editor.
- Treat each recognized path as one word for semantic word navigation and word deletion, including quoted paths with spaces.
- Preserve character-by-character Left/Right and Backspace/Delete behavior, Unicode grapheme safety, undo, kill-ring, selection, autocomplete, history, and existing prompt-chip behavior.
- Preserve pinned Pi word-boundary behavior in the `a1 pi` comparison profile and preserve ordinary punctuation behavior for non-path prose.
- Add focused unit and owned-shell coverage for Windows, UNC, POSIX, relative, quoted, adjacent-text, and non-path cases.

## Capabilities

### New Capabilities

### Modified Capabilities
- `owned-pi-ui-foundation`: Extend the bare-A1 prompt editing contract with path-aware word navigation and deletion while retaining comparison-mode parity.

## Impact

- Affects the A1-owned prompt editor UX interceptor and focused editor/session-shell tests.
- Reuses the existing owned segmentation boundary around Pi's public editor component; no Pi dependency patch, filesystem probe, setting, profile migration, or new dependency is required.
- Does not change the separate single-line settings filter component.
