## ADDED Requirements

### Requirement: Same-name path chips expose distinguishing path suffixes

Bare A1 SHALL label a pasted file, image file, or folder with its basename when that chip label does not conflict with a different registered path. When a different platform-normalized path would produce the same chip label, A1 SHALL use the shortest trailing path suffix that makes the later chip label non-conflicting, adding parent segments from nearest to farthest and displaying separators as forward slashes. If parent suffixes remain ambiguous, the normalized full path SHALL be the deterministic final label; path-chip disambiguation SHALL NOT append an opaque random hash.

Repeated references to the same platform-normalized path SHALL reuse its established chip label. Disambiguation SHALL preserve the path kind's icon, atomic editing behavior, and exact full-path value for copying, history, and submission. The pinned `a1 pi` comparison route SHALL remain unchanged.

#### Scenario: Paste different folders with the same basename
- **WHEN** two pasted folders have different normalized full paths but the same basename
- **THEN** the first non-conflicting chip SHALL retain the basename-only label
- **AND** the later chip SHALL show the shortest distinguishing `parent/basename` suffix instead of a random hash

#### Scenario: Add more parent segments only when needed
- **WHEN** the nearest-parent suffix for a later same-name path already labels a different registered path
- **THEN** A1 SHALL add parent segments until the shortest non-conflicting trailing suffix is reached
- **AND** every displayed separator in that suffix SHALL be a forward slash

#### Scenario: Paste the same path repeatedly
- **WHEN** the same platform-normalized file or folder path is pasted more than once
- **THEN** every reference SHALL reuse that path's established chip label
- **AND** A1 SHALL NOT treat the repeated reference as a distinct path collision

#### Scenario: Expand disambiguated path chips
- **WHEN** a disambiguated file, image-file, or folder chip is copied, stored for history, or submitted
- **THEN** it SHALL expand to the exact full path associated with that chip
- **AND** its icon and atomic editing behavior SHALL match the corresponding non-conflicting path-chip kind

## MODIFIED Requirements

### Requirement: Oversized path lists use bounded compact paste presentation
Bare A1 SHALL budget individual path-chip presentation at 4,096 UTF-16 code units per successfully classified path-list paste, counting each occurrence and the icon, framing, and longest deterministic label that each path could require for path-suffix disambiguation, including its normalized full-path candidate. Classification and adoption SHALL use the same path-tag formatting. When this estimate exceeds the budget, the isolated preparer SHALL produce one existing text-paste chip representation before transfer/adoption rather than construct a giant editor string or thousands of provisional UI chips.

The compact chip SHALL retain the exact concatenation of classified full paths in occurrence order, including duplicates, without extra separators, content truncation, or further text normalization. It SHALL use existing text-paste chip identity, atomic editing, copying, history/submission expansion, reservation, cancellation, and undo/redo behavior. Individual member-chip editing is replaced by one atomic chip only for over-budget lists. In-budget file/folder/image-file chips SHALL retain their normal icons and deterministic path-suffix collision behavior. This policy SHALL apply equally to native and terminal-provided owned paste, SHALL NOT reread terminal-supplied content, and SHALL NOT change the pinned comparison path, existing draft/history chips, clipboard byte/image limits, or failed-probe original-text fallback.

#### Scenario: A successfully classified path list exceeds its display budget
- **WHEN** a supported native or terminal-provided path-list paste would exceed 4,096 budgeted UTF-16 units of individual-chip presentation
- **THEN** A1 SHALL insert one compact text-paste chip once and preserve every full expanded path in order
- **AND** the UI SHALL NOT adopt individual chips for that list before compacting it
- **AND** following input and eligible frames SHALL continue progressing without waiting for unbounded editor layout

#### Scenario: A path list fits the budget
- **WHEN** the complete per-paste estimate, including framing and each path's longest deterministic collision label, is at most 4,096 UTF-16 units
- **THEN** the existing individual file/folder/image-file chips and their editing semantics SHALL remain unchanged except for deterministic path-suffix disambiguation
- **AND** repeated occurrences and surrogate-pair labels SHALL count toward the same per-paste budget

#### Scenario: Copy, recall, submit, or undo a compact path-list paste
- **WHEN** a compact path-list chip is copied, persisted for history, submitted, selected, deleted, or restored by undo/redo
- **THEN** it SHALL behave as the existing atomic text-paste chip and expand to all of its classified full paths without loss or reordering
- **AND** cancellation or session replacement before insertion SHALL NOT restore obsolete content or overwrite later typing

#### Scenario: Path classification cannot finish safely
- **WHEN** filesystem classification fails or times out for a large candidate list
- **THEN** A1 SHALL preserve the established safe original-text fallback and its existing compact-text policy
- **AND** it SHALL NOT compact a partially classified prefix as though it represented the complete list
