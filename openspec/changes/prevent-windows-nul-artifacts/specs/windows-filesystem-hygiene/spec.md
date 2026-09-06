## Purpose

Ensures Windows agent sessions do not leave reserved-name `nul` artifacts behind after ordinary Pi tool activity.

## ADDED Requirements

### Requirement: Windows sessions remove residual NUL files at cleanup boundaries
A1 SHALL remove a regular file named `nul` from the active working directory when a Windows session starts and after each tool result. After Bash tool results, A1 SHALL additionally clean a directory selected by a simple `cd` command resolved from the active working directory. After write or edit tool results, A1 SHALL additionally clean the resolved parent directory of the tool's target path. Cleanup SHALL complete as part of the corresponding event handling so later session work does not observe the residual artifact.

#### Scenario: Session starts with a residual artifact
- **WHEN** a Windows session starts in a working directory containing a regular file named `nul`
- **THEN** the file SHALL be absent after session-start handling completes

#### Scenario: Bash leaves an artifact in the active directory
- **WHEN** a Bash tool finishes in a Windows session and its active working directory contains a regular file named `nul`
- **THEN** the file SHALL be absent after tool-result handling completes

#### Scenario: Bash changes to a simple target directory
- **WHEN** a Bash tool command contains a simple `cd` to a relative or absolute directory and that directory contains a regular file named `nul`
- **THEN** A1 SHALL resolve that directory from the active working directory and remove the file after tool-result handling completes

#### Scenario: A file mutation targets another directory
- **WHEN** a write or edit tool finishes in a Windows session and the target file's resolved parent directory contains a regular file named `nul`
- **THEN** the residual file in that parent directory SHALL be absent after tool-result handling completes

### Requirement: NUL cleanup is bounded and failure-isolated
A1 SHALL perform NUL cleanup only on Windows, only at the explicitly derived directories, and only when the candidate is a regular file. A missing candidate, a directory or symbolic link named `nul`, an inaccessible path, or a failed deletion SHALL NOT change the originating tool result, fail session startup, or trigger recursive filesystem traversal. The safeguard SHALL be supplied by the runtime and SHALL NOT create or modify extension or settings files in the A1 or ordinary Pi user profile.

#### Scenario: Session runs on another platform
- **WHEN** an equivalent session starts or completes tools on a non-Windows platform
- **THEN** A1 SHALL perform no NUL cleanup filesystem operations

#### Scenario: Candidate is not a regular file
- **WHEN** a derived Windows cleanup path is missing or names a directory or symbolic link
- **THEN** A1 SHALL leave it unchanged and continue the session normally

#### Scenario: Filesystem cleanup fails
- **WHEN** inspecting or deleting a derived `nul` path fails
- **THEN** A1 SHALL preserve the original session or tool outcome without presenting the cleanup failure as a tool failure

#### Scenario: Cleanup is provisioned
- **WHEN** A1 constructs its owned Pi runtime on Windows
- **THEN** the safeguard SHALL be available without writing an extension or setting into the selected user profile
