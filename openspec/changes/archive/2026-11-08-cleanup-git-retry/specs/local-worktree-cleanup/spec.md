## ADDED Requirements

### Requirement: Required Git values are retried and fail closed
Local cleanup SHALL read every Git value it requires, including the repository's common Git directory during discovery, through one bounded reader. On Windows an empty successful answer SHALL be retried a bounded number of times; a value that stays empty SHALL fail the operation with `git-operation-failed` before any filesystem call uses it.

#### Scenario: Git returns an empty common directory once on Windows
- **WHEN** repository discovery asks for the common Git directory on Windows and Git first answers successfully with empty output
- **THEN** discovery SHALL ask again and continue with the non-empty answer

#### Scenario: The common directory stays empty
- **WHEN** every bounded attempt returns empty output, or the first one does on another platform
- **THEN** discovery SHALL fail with `git-operation-failed`
- **AND** it SHALL NOT resolve an empty path
