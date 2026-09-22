## Why

Bare A1 currently inserts a space between `Compacting` and its parenthesized percentage. The requested compact label removes that gap so the progress value reads as part of the status word while preserving all compaction behavior.

## What Changes

- Render measured compaction progress as `Compacting(n%)...` instead of `Compacting (n%)...` in bare A1.
- Keep the percentage calculation, spinner, lifecycle, and no-percentage fallback unchanged.
- Keep the pinned `a1 pi` comparison route unchanged.
- Add focused regression coverage for the compact zero, intermediate, and maximum progress labels.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Remove the space before the parenthesized percentage in bare-A1 compaction progress labels.

## Impact

- Affects compaction working-status composition in `src/integrations/pi/components/shell-footer-status.ts`.
- Updates focused shell-component expectations for measured compaction progress; no engine, estimation, or persisted-session behavior changes.
