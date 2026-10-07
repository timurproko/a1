## 1. Keep the session root expanded

- [ ] 1.1 Refine bare-A1 Session Tree fold eligibility so persisted top-level roots are never collapsible, while filtered ordinary entries that merely appear at the visible root retain existing branch eligibility.
- [ ] 1.2 Preserve nearest eligible nested-branch collapse and selected-branch expansion; make Left/Right inert when the session root is the only applicable branch without changing rows or selection.

## 2. Verify branch controls

- [ ] 2.1 Add focused component coverage for Left Arrow on the session root and a simple descendant, proving neither can collapse the whole tree to the single `session` row.
- [ ] 2.2 Add or refine nested and filtered branch coverage proving eligible non-root branches still collapse to their branch root and expand with Right Arrow while all other Session Tree behavior remains unchanged.
- [ ] 2.3 Run the focused Session Tree component scope and applicable type/provenance checks permitted by repository policy; record implementation evidence and any explicit gap disposition before finalization.
