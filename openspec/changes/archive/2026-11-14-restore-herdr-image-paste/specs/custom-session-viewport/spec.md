## MODIFIED Requirements

### Requirement: Same-name path chips expose distinguishing path suffixes

For content retained as path references, bare A1 SHALL label a pasted file, image file, or folder with its basename when that chip label does not conflict with a different registered path. When a different platform-normalized path would produce the same chip label, A1 SHALL use the shortest trailing path suffix that makes the later chip label non-conflicting, adding parent segments from nearest to farthest and displaying separators as forward slashes. If parent suffixes remain ambiguous, the normalized full path SHALL be the deterministic final label; path-chip disambiguation SHALL NOT append an opaque random hash. A single supplied image file prepared as an actual image attachment SHALL instead use the image-attachment chip and history contract; a decorative path chip SHALL NOT substitute for attachment readiness.

Repeated references to the same platform-normalized path SHALL reuse its established path-chip label. Disambiguation SHALL preserve the path kind's icon, atomic editing behavior, and exact full-path value for copying, history, and submission. The pinned `a1 pi` comparison route SHALL remain unchanged.

#### Scenario: Paste different folders with the same basename

- **WHEN** two pasted folders have different normalized full paths but the same basename
- **THEN** the first non-conflicting chip SHALL retain the basename-only label
- **AND** the later chip SHALL show the shortest distinguishing `parent/basename` suffix instead of a random hash

#### Scenario: Add more parent segments only when needed

- **WHEN** the nearest-parent suffix for a later same-name path already labels a different registered path
- **THEN** A1 SHALL add parent segments until the shortest non-conflicting trailing suffix is reached
- **AND** every displayed separator in that suffix SHALL be a forward slash

#### Scenario: Paste the same path repeatedly

- **WHEN** the same platform-normalized file or folder path is pasted more than once as a path reference
- **THEN** every reference SHALL reuse that path's established chip label
- **AND** A1 SHALL NOT treat the repeated reference as a distinct path collision

#### Scenario: Expand disambiguated path chips

- **WHEN** a disambiguated file, image-file, or folder path chip is copied, stored for history, or submitted
- **THEN** it SHALL expand to the exact full path associated with that chip
- **AND** its icon and atomic editing behavior SHALL match the corresponding non-conflicting path-chip kind

#### Scenario: Distinguish prepared image attachments from path references

- **WHEN** one supplied supported image file is admitted for actual image preparation
- **THEN** A1 SHALL use an attachment-backed image chip rather than a path-only chip
- **AND** ordinary multiple/mixed path-list chips SHALL retain their existing path labels and expansion behavior
