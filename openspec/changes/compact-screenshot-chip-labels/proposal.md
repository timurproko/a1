# Compact screenshot chip labels

## Why

PR #934 removes the icon separator from filename-bearing attachment labels but explicitly leaves clipboard screenshot chips unchanged. Screenshots should use the same icon-adjacent label presentation.

## What Changes

- Present screenshot chips without the space after the camera icon in the live editor, queued input, and submitted prompts.
- Preserve screenshot identifiers, resized/failed state, stored chip syntax, attachment payloads, and source-copy/history/submission behavior.
- Keep filename-bearing attachment presentation and unrelated chips unchanged.

## Impact

- Affected capability: custom-session-viewport.
- Affected owners: owned-ui chip contracts and their existing session-shell/Pi presentation consumers.
- No Herdr changes, transferred filename reconstruction, or removal of screenshot identifiers.
