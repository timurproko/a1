## MODIFIED Requirements

### Requirement: Update failures are actionable
A1 SHALL surface relevant npm diagnostics and exit unsuccessfully when registry lookup, npm startup, permission acquisition, or global installation fails. It MUST NOT report a successful update unless npm completed the requested global installation successfully. The diagnostics of a failed child SHALL be the bounded text that child itself wrote, printed once immediately before the line that names the failed action, so the reason precedes the verdict.

#### Scenario: npm is unavailable
- **WHEN** the platform npm executable cannot be started
- **THEN** A1 reports that npm could not be executed and exits unsuccessfully

#### Scenario: Global installation is rejected
- **WHEN** npm rejects installation because of permissions, network access, registry policy, or package validation
- **THEN** A1 preserves npm diagnostics, reports that the update failed, and exits with an unsuccessful status

#### Scenario: A failed step wrote nothing
- **WHEN** a child of the update exits unsuccessfully without writing any text
- **THEN** A1 reports the failed action and status without referring the user to diagnostics that do not exist

### Requirement: Progress reports no detail beyond the bar
The file being copied, the number of files, and the count completed SHALL reach
the terminal only as the position of the update's single-line progress display.
A1 SHALL NOT print file names, counts, or per-file lines during an update, and
launch SHALL report nothing about activation at all.

No child process the update starts SHALL share the terminal: the update SHALL
capture what a child writes, keep a bounded tail of it, and show it only with
the failure it explains. A child that exits successfully SHALL leave nothing on
the terminal regardless of what it wrote. A helper entry that an older
installed updater still runs from the newly installed tree SHALL exit
successfully and silently, so that a step the newer tree no longer needs never
appears as a failure.

#### Scenario: An update is watched
- **WHEN** an update copies thousands of files
- **THEN** the terminal SHALL show one progress line and no per-file output

#### Scenario: A launch activates a release
- **WHEN** bare A1 launches and activates a materialized release
- **THEN** nothing about that activation SHALL be written to the terminal

#### Scenario: A child succeeds with warnings
- **WHEN** npm or another child of the update exits successfully after writing a notice or warning to its stderr
- **THEN** the terminal SHALL show the progress bar and the success line only

#### Scenario: An older updater runs a retired helper entry
- **WHEN** an installed updater older than 0.1.8-dev.479 runs `bin/sync-pi-tui-proxy.js` of the tree it has just installed
- **THEN** that entry SHALL exit with status 0 and write nothing, and the older updater SHALL print no diagnostic for it
