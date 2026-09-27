## Why

The interactive installer currently appends phase wording after the percentage. Besides adding text that provides little value, shorter phase names can leave characters from the previous longer phase on the carriage-return row, producing combinations such as `Installingpackages`. The progress row should end visibly at the percentage.

## What Changes

- Remove all phase wording after the installer percentage while retaining the existing bar, percentage, colors, progress measurements, and final success line.
- Erase stale terminal content to the right of each progress frame so prior phase text cannot remain visible.
- Add focused terminal-output coverage requiring the interactive row to contain no phase labels.
- Publish and verify a newly numbered development installer before considering the presentation corrected on npm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `silent-installer`: Interactive progress ends at `<percentage>%` with no phase wording or stale suffix.

## Impact

- Changes `packages/a1-install/bin/a1-install.js` and focused installer presentation tests.
- Does not alter progress calculation, npm execution, activation, package verification, failure diagnostics, publication tags, or stable-release policy.
- A development publication will advance npm `next`; npm's package-list page will continue displaying the version under `latest` until a stable publication intentionally moves that tag.
