## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for behavior. The source-derived tool execution component owns generic fallback composition but delegates built-in Bash, read, find, grep, ls, and write presentation to public Pi renderers. Those renderers still emit pinned `ctrl+o to expand` spans. A1 already exposes a shared semantic shortcut renderer that display-capitalizes effective keys and applies separate quiet-key and muted-action roles.

## Goals / Non-Goals

**Goals:**
- Route generic fallback and package built-in collapsed tool hints through A1's existing semantic shortcut presentation.
- Continue resolving the displayed key from the active `app.tools.expand` binding.
- Preserve built-in renderer state, layout, interaction, and output apart from the intentional hint presentation.
- Keep the source-derived component's deviation documented and directly testable.

**Non-Goals:**
- Changing preview limits, expansion input handling, omitted-line counts, or tool-call content.
- Rewriting custom extension renderer output or arbitrary transcript prose.
- Changing the pinned `a1 pi` comparison component.

## Decisions

### Compose the semantic hint in fallback output and adapt known built-in spans

The fallback renderer will continue composing its omitted-line prose and parentheses while inserting one shared semantic entry whose key comes from `app.tools.expand` and whose action is `expand`.

Public built-in renderers do not expose a shortcut-presentation injection seam: their expansion hints call Pi's package-global helper internally. The owned tool boundary will therefore decorate only components returned by the internally selected built-in call or result renderer. At render time it will replace the exact upstream-styled expansion fragment with the same shared semantic entry, including the compact-read parenthetical variant. Matching exact ANSI fragments avoids interpreting arbitrary output prose, and renderer identity prevents custom extension output from being rewritten. Copying six renderers was rejected as a larger, drift-prone source fork. Hardcoding `Ctrl+O` was rejected because customized bindings must remain truthful.

### Treat the change as a declared bare-A1 presentation deviation

Focused coverage will assert Bash's user-visible omitted-line hint, all built-in hint-producing paths, fallback output, separate ANSI roles, custom bindings, unchanged custom renderers, and pinned comparison wording. Existing geometry and expansion assertions remain. The copied-source modification note and source-port ledger will continue naming this deviation.

## Risks / Trade-offs

- **[An upstream renderer changes its exact ANSI fragment]** → Focused built-in coverage fails, requiring an explicit adapter update rather than silently rewriting unrelated text.
- **[A customized binding regresses to a hardcoded label]** → Resolve both matched and replacement spans from the live keybinding manager and cover a non-default binding.
- **[A custom renderer happens to emit pinned wording]** → Decorate only components returned by internally selected built-in renderer functions.
- **[The wrapper alters interaction or renderer reuse]** → Delegate rendering, invalidation, keyboard, and mouse behavior to the original component and retain the original component as renderer state.

## Migration Plan

No data migration is required. Deploy the boundary adapter and focused expectations atomically. Rollback removes the adapter and restores the fallback hint call without affecting tool state or user configuration.
