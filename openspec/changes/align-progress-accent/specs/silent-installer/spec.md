## MODIFIED Requirements

### Requirement: Successful installation shows controlled progress and one success message
In an interactive terminal, the installer SHALL display one carriage-return progress row conforming exactly to A1 self-update's 40-cell bar width, glyphs, shared semantic-accent completed segment, grey remaining track, grey percentage treatment, and style reset. The completed segment SHALL consume the dependency-free installer form of the same release-owned palette contract as self-update, derived from the pinned Pi theme's semantic `accent` role and byte-equivalent to the main-package form. Progress SHALL be non-decreasing, SHALL use measured activation progress where available, and MAY creep toward but SHALL NOT render an unreached milestone during opaque npm work. The visible row SHALL end at the numeric `<percentage>%` treatment and SHALL contain no phase, status, package, or other wording after it. Every redraw SHALL erase terminal content to the right of the current frame so no suffix from an earlier longer row remains visible. Internal child-event classification MAY continue without becoming terminal text.

Every main-install child process SHALL have stdout and stderr captured rather than inherit the terminal. The installer MAY run npm verbosely into a private temporary log and classify recognized events internally. Output from a successful child SHALL otherwise be discarded, including deprecation warnings, funding text, audit summaries, lifecycle-script policy warnings, package counts, and npm version notices. After all installation and verification work succeeds, the progress row SHALL be completed and removed or replaced, and stdout SHALL contain exactly `a1 successfully installed` followed by one newline in the terminal's unstyled default foreground, matching update success and appearing white under the maintainer's current terminal theme. It SHALL NOT use green or another fixed success color.

Normal installer output SHALL NOT disclose the npm prefix, package root, launcher path, user home, data directory, target version, dependency names, or package/file counts. A path MAY appear only in a bounded actionable failure or explicit verbose diagnostic when identifying it is necessary to recover safely. When output is not interactive, the animated row and ANSI styling SHALL be omitted and the same final success line SHALL remain.

#### Scenario: npm succeeds after writing warnings
- **WHEN** npm installs the exact target successfully while writing deprecation, funding, lifecycle-policy, package-count, or version notices
- **THEN** none of that child output SHALL reach the terminal
- **AND** the user SHALL observe one progress row ending at its percentage followed by exactly `a1 successfully installed`

#### Scenario: A shorter progress frame replaces earlier content
- **WHEN** an interactive progress frame redraws a row that previously contained additional text
- **THEN** the new visible row SHALL end at `<percentage>%`
- **AND** no characters from the previous row SHALL remain visible to its right

#### Scenario: npm work has no measured completion
- **WHEN** the global npm child remains active without reporting usable progress
- **THEN** the progress row MAY continue moving toward its next milestone
- **AND** SHALL remain visibly below that milestone until npm exits successfully

#### Scenario: Normal installation output is inspected
- **WHEN** a stable, development, or exact-version installation proceeds normally
- **THEN** no installation destination, npm prefix, launcher path, user path, target version, dependency identity, or count SHALL be printed

#### Scenario: Output is redirected
- **WHEN** the installer succeeds without an interactive output terminal
- **THEN** stdout SHALL contain exactly `a1 successfully installed` followed by one newline
- **AND** SHALL contain no carriage-return progress frames or ANSI styling

#### Scenario: The installer package is inspected
- **WHEN** the exact installer artifact is unpacked
- **THEN** its executable and one declared shared palette asset SHALL remain dependency-free
- **AND** the palette asset SHALL export the same accent value as the corresponding A1 release
