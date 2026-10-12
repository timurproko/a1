## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for behavior. The source-derived tool execution component currently delegates its generic collapsed-result hint to Pi's `keyHint`, which preserves pinned `ctrl+o to expand` presentation. A1 already exposes a shared semantic shortcut renderer that display-capitalizes effective keys and applies separate quiet-key and muted-action roles.

## Goals / Non-Goals

**Goals:**
- Route only the generic collapsed fallback tool-result hint through A1's existing semantic shortcut presentation.
- Continue resolving the displayed key from the active `app.tools.expand` binding.
- Keep the source-derived component's intentional deviation documented and directly testable.

**Non-Goals:**
- Changing the preview line limit, expansion input handling, omitted-line count, structured tool renderers, or tool-call headers.
- Broadening dialog grammar enforcement to arbitrary transcript prose.
- Changing the pinned `a1 pi` comparison component.

## Decisions

### Compose the existing semantic hint inside the existing suffix

The fallback renderer will continue composing the omitted-line prose and parentheses itself, but will replace Pi's generic `keyHint(..., "to expand")` fragment with one shared semantic entry whose key comes from `app.tools.expand` and whose action is `expand`. This preserves exact surrounding geometry while reusing display casing and key/action theme roles.

Recoloring or rewriting the string returned by `keyHint` was rejected because it would infer semantic boundaries from rendered text and retain a second casing/wording authority. Hardcoding `Ctrl+O` was rejected because customized bindings must remain truthful.

### Treat the change as a narrow declared bare-A1 deviation

Focused component coverage will assert the final plain suffix and separate ANSI spans for the key and action, while existing parity coverage remains for unaffected built-in and structured tool paths. The copied-source modification note will name this deviation. This avoids weakening broad parity checks or changing package code.

## Risks / Trade-offs

- **[A customized binding could regress to a hardcoded label]** → Resolve the hint from the live keybinding manager and cover a non-default binding in focused evidence where the available test seam permits it.
- **[Broad parity assertions include generic fallback output]** → Split the intentional fallback presentation assertion from unaffected parity cases rather than normalizing styling away.
- **[Reusing a modal-named adapter outside a modal could blur ownership]** → Reuse the underlying semantic contract through the existing Pi-theme adapter only for key/action painting; retain transcript punctuation and layout at the tool renderer.

## Migration Plan

No data migration is required. Deploy the renderer and focused expectations atomically. Rollback restores the pinned hint call and removes the declared presentation difference without affecting tool state or user configuration.
