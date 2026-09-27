## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the behavior contract.

The owned editor currently has one shared helper that produces centered upper and lower overflow borders. History browsing bypasses that helper for the top border and builds one dim left-aligned string containing both the history count and an optional ` · ↑ N more` suffix. The lower cue therefore retains vanilla Pi's centered border treatment while the upper cue changes position and semantic color whenever history is active.

The editor already owns semantic top-border rendering before the shared prompt presentation adds the A1 prompt prefix. The comparison profile uses the installed pinned editor rather than this persistent-history path and must remain unchanged.

## Goals / Non-Goals

**Goals:**
- Compose history position and editor overflow as independent semantic spans on one fixed-width border.
- Reuse the upper/lower overflow layout policy so their arrow/count wording, centering, narrow fallback, and border color stay aligned.
- Keep ANSI-aware width, prompt-prefix geometry, cursor layout, and editor body height unchanged.

**Non-Goals:**
- Change history numbering, navigation, storage, caret placement, or draft restoration.
- Change autocomplete's separate counter border, the lower overflow cue, or pinned `a1 pi` rendering.
- Add another row to the editor frame.

## Decisions

### 1. Compose the top border from semantic spans before styling

Refactor the editor-local border helper so top-border composition knows the plain-cell range occupied by the overflow label. Build the full-width overflow border first, then place the compact history count at its established four-cell inset only when that range does not collide. Apply history's dim style only to the count; apply the active border style to rules and the complete overflow cue.

This keeps style ownership explicit and avoids indexing or replacing text after ANSI sequences have been introduced. Continuing to concatenate one history string is rejected because it cannot independently center or color the overflow cue.

### 2. Use the existing overflow geometry as the source of truth

The upper cue will use the same `createScrollBorder` geometry policy as the lower cue: centered ` ↑ N more ` when it fits, with the existing bounded narrow rendering when it does not. The history label is an overlay with a separate left range, not an input to centering, so changing history count width cannot move the overflow cue.

A layout that centers within only the space remaining after the history label is rejected because it would not line up with the lower cue or vanilla Pi. Adding a second border row is rejected because it changes editor and dock geometry.

### 3. Prefer an intact overflow cue when labels collide

At widths where the independent ranges overlap, omit the history span for that frame and retain the complete width-safe overflow border. This prevents ambiguous mixed text and preserves the cue needed to understand that content is hidden. The history count returns automatically when the width grows or the editor no longer has hidden lines above.

Truncating one label into the other is rejected because it recreates the combined-label problem. Moving the history count or overflow cue is rejected because their requested anchors are left inset and full-border center respectively.

## Risks / Trade-offs

- **[Very narrow recalled editors can temporarily omit the history count]** → Keep the complete overflow cue and restore the count deterministically as soon as both ranges fit; cover the collision boundary in focused tests.
- **[Mixed styling can leak dim color into the overflow cue or following rule]** → Compose explicit spans and assert effective style boundaries, not only stripped text.
- **[Refactoring shared border geometry can alter ordinary or lower borders]** → Retain existing no-history and bottom-border fixtures and add paired top/bottom placement checks at wide and narrow widths.
- **[Prompt prefix changes visual centering]** → Continue centering within the editor's existing rendered border width, as the lower cue does, and verify through the shell-level prompt composition test.

## Migration Plan

Implement and validate the editor-local composition without data migration or configuration changes. Rollback restores the former combined label; history data and session state remain compatible.
