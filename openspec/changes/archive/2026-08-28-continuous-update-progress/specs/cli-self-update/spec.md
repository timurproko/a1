## ADDED Requirements

### Requirement: Update progress follows the work
When A1 shows update progress, the display SHALL advance with the work being done
rather than only at the boundaries between steps. The step that copies the
installed package into an immutable release SHALL report the files it has written
against the files it must write, and that report SHALL drive the display across a
span reserved for it.

Where a step cannot report its own progress, the display MAY approach the next
milestone without reaching it, but SHALL NOT come to rest on a value that renders
as that milestone — otherwise arriving at the milestone changes nothing on screen
and a working update is indistinguishable from a hung one.

Progress SHALL never move backwards, and SHALL end at completion.

#### Scenario: The release is copied
- **WHEN** the update copies the installed package into an immutable release
- **THEN** the display SHALL advance repeatedly across the span reserved for copying as files are written
- **AND** SHALL NOT cross that span in a single step

#### Scenario: A step cannot report progress
- **WHEN** a step such as the global npm installation runs without reporting progress
- **THEN** the display SHALL keep moving toward the next milestone
- **AND** SHALL remain below the value that milestone will show

#### Scenario: The update completes
- **WHEN** the update finishes successfully
- **THEN** the display SHALL show completion, and every value it showed SHALL have been non-decreasing

### Requirement: Progress reports no detail beyond the bar
The file being copied, the number of files, and the count completed SHALL reach
the terminal only as the position of the update's single-line progress display.
A1 SHALL NOT print file names, counts, or per-file lines during an update, and
launch SHALL report nothing about activation at all.

#### Scenario: An update is watched
- **WHEN** an update copies thousands of files
- **THEN** the terminal SHALL show one progress line and no per-file output

#### Scenario: A launch activates a release
- **WHEN** bare A1 launches and activates a materialized release
- **THEN** nothing about that activation SHALL be written to the terminal
