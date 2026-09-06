## ADDED Requirements

### Requirement: Bare-A1 word editing treats filesystem paths as one token
The bare-A1 prompt editor SHALL recognize a whitespace-delimited filesystem path with a drive-rooted, UNC, POSIX-rooted, dot-relative, parent-relative, or home-relative prefix as one semantic word. A matching singly or doubly quoted path SHALL allow spaces and include its balanced quotes in the token. Path recognition SHALL be syntactic and SHALL NOT access the filesystem.

Ctrl+Left from the end of a recognized path or from within it SHALL move directly to the path's beginning, and Ctrl+Right from the beginning or within it SHALL move directly to its end, without intermediate stops at `/`, `\\`, `:`, `.`, `_`, or `-`. Ctrl+Backspace at the path end and Ctrl+Delete at its beginning SHALL delete the complete path token. When deletion begins within a path, it SHALL delete only the portion between the caret and the corresponding path boundary.

#### Scenario: Navigate a Windows path
- **WHEN** the bare-A1 prompt contains `D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl` and the user invokes word-left at its end or word-right at its beginning
- **THEN** the caret SHALL move directly to the opposite path boundary without stopping at internal punctuation

#### Scenario: Delete a Windows path
- **WHEN** the caret is at the end of that Windows path and the user invokes delete-word-backward, or is at its beginning and invokes delete-word-forward
- **THEN** the complete path SHALL be removed by the single action

#### Scenario: Navigate a quoted path containing spaces
- **WHEN** the bare-A1 prompt contains a balanced quoted path such as `"D:/Project Files/source/file.ts"`
- **THEN** word navigation and deletion SHALL treat the opening quote, path contents, spaces, and closing quote as one token

#### Scenario: Navigate other explicit path forms
- **WHEN** the prompt contains a UNC path, POSIX-rooted path, dot-relative path, parent-relative path, or home-relative path
- **THEN** the same path-token navigation and deletion behavior SHALL apply regardless of slash direction

#### Scenario: Begin inside a path
- **WHEN** the caret is inside a recognized path
- **THEN** word-left and delete-word-backward SHALL use the path's beginning as their boundary
- **AND** word-right and delete-word-forward SHALL use the path's end as their boundary

### Requirement: Path-aware word editing preserves other editor semantics
Path-aware word boundaries SHALL affect only semantic word movement and word deletion in the bare-A1 prompt editor. Character movement and deletion SHALL remain grapheme-based, and path deletion SHALL retain the editor's established undo, kill-ring, change notification, history, selection, and autocomplete behavior. Existing prompt-chip atomicity SHALL remain unchanged. Non-path prose SHALL retain Pi's punctuation-oriented word boundaries, and the `a1 pi` comparison profile SHALL retain pinned Pi behavior.

#### Scenario: Edit a path one character at a time
- **WHEN** the user invokes unmodified Left, Right, Backspace, or Delete on a recognized path
- **THEN** the editor SHALL move or delete one complete grapheme rather than the whole path

#### Scenario: Undo or yank a deleted path
- **WHEN** a path is removed with a word-deletion action
- **THEN** undo SHALL restore the pre-deletion prompt
- **AND** the deleted path SHALL participate in the existing kill-ring behavior for that direction

#### Scenario: Navigate punctuation in ordinary prose
- **WHEN** a prompt token does not match a recognized filesystem-path form
- **THEN** word movement and deletion SHALL preserve pinned Pi's existing punctuation boundaries

#### Scenario: Use a prompt chip
- **WHEN** the prompt contains an existing file, folder, URL, image, or paste chip
- **THEN** its existing atomic navigation, deletion, selection, rendering, and submission behavior SHALL remain unchanged

#### Scenario: Use the Pi comparison profile
- **WHEN** the same path text is edited through `a1 pi`
- **THEN** word movement and deletion SHALL retain the pinned Pi boundary behavior rather than the bare-A1 path-aware override
