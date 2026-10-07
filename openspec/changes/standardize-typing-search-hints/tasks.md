## 1. Standardize typing guidance

- [ ] 1.1 Change the Models typing hint to semantic `type`/`search` key-action data and verify its component frame renders exact `Type search` wording with separate quiet-key and action-text ANSI roles.
- [ ] 1.2 Extend the Session Tree help declaration to carry the same semantic `type`/`search` data, update its copied-source modification note, and verify wide and wrapped tree footers preserve ordering while styling `Type` separately from `search`.

## 2. Regression coverage and evidence

- [ ] 2.1 Update shared semantic-renderer and shell workflow expectations so keyless prose remains supported while Models and Session Tree consistently render `Type search`; verify the focused shortcut-hint, Models, Tree, and session-shell tests pass.
- [ ] 2.2 Run strict OpenSpec validation, source typechecking, the applicable architecture check, and diff hygiene; record exact results and any explicit gap disposition in `evidence/validation.md`.
