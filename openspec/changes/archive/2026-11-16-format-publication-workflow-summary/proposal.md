## Why

The successful workflow message is indented like a job row and directly follows the job list. The requested output separates workflow completion from individual job results and uses a bracketed status prefix consistent with the following develop summary.

## What Changes

- Print one empty line after the completed job list, then `[workflow] passed; verifying npm packages.` without indentation.
- Keep the following develop publication summary, job rows, counters, colors, registry verification, and failure behavior unchanged.
- Update plain-output and interactive terminal replay expectations for the new text and spacing.

## Capabilities

### Added Capabilities

None.

### Modified Capabilities

- `continuous-integration`: development publication workflow completion presentation.

## Impact

`scripts/release/publication-client.mjs` and its focused test file. No workflow execution, npm mutation, or publication authority changes.
