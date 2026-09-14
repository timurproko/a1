## Why

The timestamp-specific changes in #360 and the first #368 candidate restyled ordinary prompts instead of simply reusing their existing behavior for compactions. During review the user explicitly approved restoring pre-#360 prompt styling, including white text and timestamp on hover, and applying that unchanged behavior to compactions.

## What Changes

- Restore ordinary submitted-prompt source, prominent-pinned, quiet-pinned, and hover styling from develop `53e924c8`, immediately before #360.
- Reuse that same styling for completed compactions; retain their full inline summary, normal-weight generated header, anchors, and navigation.
- Remove #368's timestamp-column metadata and quiet-intensity exemption. Quiet styling again applies to the whole pinned row, including its timestamp; hovering restores the baseline prominent row.
- Undo #360's pinned timestamp recoloring to the `dim` metadata role. Naturally visible source timestamps retain their baseline metadata styling; pinned timestamps use the existing prompt foreground role, white in the default dark theme.
- Preserve layout, original event times, width omission, selection/copy, native links, caches, input ownership, and the comparison route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require compactions to reuse the established submitted-prompt state styling, without timestamp-specific exceptions or ordinary-prompt restyling.

## Impact

This user-approved review revision supersedes the original timestamp-exemption proposal from #367. Keep the existing change identifier, worktree, and open implementation PR #368; revise planning artifacts before applying the correction. No dependency, session-format, compaction-generation, unrelated renderer, or palette changes are intended. Earlier compaction acceptance remains unrecorded; this revision is not evidence of acceptance.
