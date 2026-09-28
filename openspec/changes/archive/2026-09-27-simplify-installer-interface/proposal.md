## Why

The interactive installer currently appends phase wording after the percentage. Besides adding text that provides little value, shorter phase names can leave characters from the previous longer phase on the carriage-return row, producing combinations such as `Installingpackages`. The progress row should end visibly at the percentage.

The installer's exact-preview syntax also diverges from the established self-update API: installation uses `--version <full-preview>`, while `a1 update` uses one `--develop [preview-or-version]` grammar. This is a new installer API, so it should adopt the update grammar directly rather than introduce `--latest`, `--next`, or compatibility aliases.

## What Changes

- Remove all phase wording after the installer percentage while retaining the existing bar, percentage, colors, progress measurements, and final success line.
- Erase stale terminal content to the right of each progress frame so prior phase text cannot remain visible.
- Align fresh installation with self-update: bare command for stable, `--develop` for the moving preview, and `--develop <preview-or-version>` for an exact preview.
- Remove `--version`, reject `--latest`/`--next`, update README/help examples, and add focused command/presentation coverage.
- Publish and verify a newly numbered development installer before considering the new interface corrected on npm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `silent-installer`: Interactive progress ends at `<percentage>%` with no phase wording or stale suffix, and installation uses the same stable/development target grammar as `a1 update`.

## Impact

- Changes `packages/a1-install/bin/a1-install.js`, installer declarations and READMEs, plus focused installer presentation/argument tests.
- Does not alter progress calculation, npm mutation, activation, package verification, failure diagnostics, publication tags, or stable-release policy.
- A development publication will advance npm `next`; npm's package-list page will continue displaying the version under `latest` until a stable publication intentionally moves that tag.
