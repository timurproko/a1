## 1. Standardize typing guidance

- [x] 1.1 Change the Models typing hint to semantic `Type`/`search` key-action data and verify its component frame renders exact `Type search` wording with separate quiet-key and action-text ANSI roles.
- [x] 1.2 Extend the Session Tree help declaration to carry the same semantic `Type`/`search` data, update its copied-source modification note, and verify wide and wrapped tree footers preserve ordering while styling `Type` separately from `search`.
- [x] 1.3 Prepend the same typing guidance to the Skills footer and verify wide, narrow, filtered, empty, and interaction states retain their established rows and behavior.
- [x] 1.4 Prepend the same typing guidance to the Thinking Level footer, refresh its copied-source provenance, and verify filtering, selection, default persistence, close behavior, and constrained widths remain unchanged.
- [x] 1.5 Prepend the same typing guidance to Resume Session's first ordinary footer row, refresh its copied-source provenance, and verify search syntax, actions, feedback states, clipping, and empty/result layouts remain unchanged.

## 2. Regression coverage and evidence

- [x] 2.1 Update shared semantic-renderer and shell workflow expectations so keyless prose remains supported while Models and Session Tree consistently render `Type search`; verify the focused shortcut-hint, Models, Tree, and session-shell tests pass.
- [x] 2.2 Run strict OpenSpec validation, source typechecking, the applicable architecture check, and diff hygiene; record exact results and any explicit gap disposition in `evidence/validation.md`.
- [x] 2.3 Run the refined Skills, Thinking Level, Resume Session, shell workflow, typecheck, architecture, strict OpenSpec, and diff checks; update `evidence/validation.md` with exact results and gap disposition.
