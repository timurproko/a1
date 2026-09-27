## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the behavior contract.

The owned editor currently has one shared helper that produces centered upper and lower overflow borders. History browsing bypasses that helper for the top border and builds one dim left-aligned string containing both the history count and an optional ` · ↑ N more` suffix. The lower cue therefore retains vanilla Pi's centered border treatment while the upper cue changes position and semantic color whenever history is active.

The editor already owns semantic top-border rendering before the shared prompt presentation adds the A1 prompt prefix. The comparison profile uses the installed pinned editor rather than this persistent-history path and must remain unchanged.

## Goals / Non-Goals

**Goals:**
- Compose history position and editor overflow as independent semantic spans on one fixed-width border.
- Reuse the upper/lower overflow layout policy so their arrow/count wording, preferred centering, and border color stay aligned while history remains visible.
- Keep ANSI-aware width, prompt-prefix geometry, cursor layout, and editor body height unchanged.

**Non-Goals:**
- Change history numbering, navigation, storage, caret placement, or draft restoration.
- Change autocomplete's separate counter border, the lower overflow cue, or pinned `a1 pi` rendering.
- Add another row to the editor frame.

## Decisions

### 1. Compose the top border from semantic spans before styling

Refactor the editor-local border helper so top-border composition reserves the compact history count at its established four-cell inset before placing the overflow label. Apply history's dim style only to the count; apply the active border style to rules and the complete overflow cue.

This keeps style ownership explicit and avoids indexing or replacing text after ANSI sequences have been introduced. Continuing to concatenate one history string is rejected because it cannot independently center or color the overflow cue.

### 2. Use the existing overflow geometry as the source of truth

The upper cue will use the same `createScrollBorder` geometry policy as the lower cue: centered ` ↑ N more ` whenever that range does not overlap the reserved history span. At a collision width, move the complete cue right only to the end of the history span. The preferred center therefore stays identical to vanilla Pi and the lower cue at ordinary widths; history width influences placement only when keeping both labels visible requires it.

Centering within only the space remaining after history at every width is rejected because it would needlessly diverge from the lower cue. Adding a second border row is rejected because it changes editor and dock geometry.

### 3. Keep history visible when labels compete

The history position is the browsing state indicator and remains at its established inset whenever history is active. If a complete overflow cue fits to its right, shift that cue only enough to avoid overlap. If it does not fit, retain history on an ordinary rule and omit overflow for that frame. This preserves unambiguous complete labels without making history navigation look inactive.

Truncating one label into the other is rejected because it recreates the combined-label problem. Omitting history is rejected because user review showed that returning to a long previous prompt must continue to display its history position.

## Risks / Trade-offs

- **[Very narrow recalled editors can temporarily omit overflow context]** → Keep the complete history position, restore the cue deterministically as soon as it fits, and cover shifted and omitted-cue boundaries in focused tests.
- **[Mixed styling can leak dim color into the overflow cue or following rule]** → Compose explicit spans and assert effective style boundaries, not only stripped text.
- **[Refactoring shared border geometry can alter ordinary or lower borders]** → Retain existing no-history and bottom-border fixtures and add paired top/bottom placement checks at wide and narrow widths.
- **[Prompt prefix changes visual centering]** → Continue centering within the editor's existing rendered border width, as the lower cue does, and verify through the shell-level prompt composition test.

## Migration Plan

Implement and validate the editor-local composition without data migration or configuration changes. Rollback restores the former combined label; history data and session state remain compatible.
