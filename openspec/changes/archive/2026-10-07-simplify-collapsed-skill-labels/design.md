## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for behavior. The Skills dialog receives normalized skill summaries whose names are already separated from the engine command prefix. It currently reconstructs `skill:<name>` only for the visible row label; selection callbacks already pass the bare name, and submission later restores the engine syntax.

## Goals / Non-Goals

**Goals:**

- Change only the row presentation in the collapsed Skills dialog.
- Preserve the existing skill identity from discovery through filtering, selection, and engine submission.
- Keep command-oriented labels in expanded autocomplete and the `/skills:` tunnel unchanged.

**Non-Goals:**

- Renaming engine commands or changing accepted `/skill:` and `/skills:` input.
- Changing sorting, filtering, descriptions, selection geometry, or comparison-profile behavior.

## Decisions

### Render the existing normalized name directly

The dialog will use each summary's `name` as its visible label instead of prepending the shared engine command prefix. This keeps presentation separate from command construction and avoids changing the summary model or callbacks. Changing the catalog's command names was rejected because expanded mode and direct engine submission still require `skill:<name>`.

### Verify the boundary at component and shell levels

Focused component expectations will cover bare labels across ordinary, filtered, selected, and overflow states. Shell workflow expectations will verify that opening the collapsed dialog shows bare labels while Enter still submits `/skill:<name>`. Tunnel and expanded-menu tests remain command-oriented safeguards rather than being rewritten to bare labels.

## Risks / Trade-offs

- [A broad label change removes prefixes from expanded or tunnel menus] → Limit the production edit to the Skills dialog row renderer and retain focused command-menu assertions.
- [Display and submitted identity diverge] → Assert the selected bare row still produces the exact engine-facing `/skill:<name>` prompt.

## Migration Plan

No data migration is required. The presentation change ships with the existing collapsed mode and can be rolled back by restoring the dialog-only prefix without affecting settings, history, or stored sessions.
