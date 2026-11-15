## Why

Development publication now reports compact job transitions, but repeated prefixes, varying status widths, and grouped job names still make progress difficult to scan. The approved presentation uses a single publication header, one job per line, aligned neutral-text labels, and small colored dots rather than colored text or emoji bulbs.

## What Changes

- Print the publication version/run header once; omit the repeated publication prefix from the log link, progress, and completion lines.
- Give each changed job its own append-only line with a single-column dot and a fixed-width status field.
- Color only dots: yellow running, green passed, red failed, gray skipped. Leave labels and job names in the terminal's default text color.
- Preserve plain readable redirected or color-disabled output, transition deduplication, failure diagnostics, and all existing publication checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: aligned publication progress with dot-only color and a single publication header.

## Impact

Development-publication client, its focused tests/declarations, and runbook presentation guidance. No product runtime, recovery protocol, workflow validation, npm authority, stable-candidate watcher, animation, or in-place terminal rewriting changes.
