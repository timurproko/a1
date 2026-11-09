# Proposal

## Why

When image display is disabled, standalone hidden-image blocks repeat information already present in submitted screenshot chips and clutter the transcript. Hiding images should omit their presentation instead of replacing them with redundant metadata.

## What Changes

- Omit automatic hidden-image placeholders and image-only spacers for existing and subsequent user and tool-result attachments when `showImages` is disabled.
- Preserve ordinary transcript text, submitted screenshot chips, authoritative attachment content, and model-facing images.
- Keep live visibility toggles, supported-terminal image rendering, unsupported-terminal omission, and enabled-image failure diagnostics intact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-settings-runtime`: Change disabled-image presentation from a textual fallback to complete omission of automatic attachment blocks.

## Impact

- Transcript attachment composition in `src/integrations/pi/components/shell-presenters-transcript.ts`.
- Owned tool output fallback composition in `src/integrations/pi/components/upstream/components/tool-execution.ts`; custom tool renderers continue receiving original result content.
- Focused shell transcript and image presentation tests.
- No new setting, dependency, persistence migration, image deletion, or change to provider image policy.

## Delivery

Planning artifacts only. Code and tests require explicit maintainer plan approval and an implementation request in this same branch, worktree, and draft PR.
