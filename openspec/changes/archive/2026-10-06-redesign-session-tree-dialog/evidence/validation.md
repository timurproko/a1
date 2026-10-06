# Implementation Validation Evidence

Recorded: 2026-10-06

## Passing evidence

- Session-tree component coverage verifies compact outer chrome, accent title, four-mode Models-style filter status with concise `all` active initially, no separate `standard` or raw-bookkeeping mode, Tab cycling and `Tab filter` guidance, shell-routed PageUp/PageDown selection and viewport paging without transcript interception, Home/End first/last selection, Left/Right nearest-branch collapse/expand from descendant selections, omission of raw label/context/custom/session/usage/model/thinking bookkeeping from rows and counters while retaining resolved labels, standard input rendering and focus, cursor placement after typed text, menu-arrow selection with a subtle purple accent-tinted background and no path bullets, muted descriptions, accent entry labels, bracketed accent label timestamps, and plain `label time` counter status, green user/yellow assistant role labels, muted `session` naming for system roots, absence of whole-row bold styling, retained non-empty counters, empty search without `(0/0)`, narrow-width clipping with single-character ellipses on both clipped edges, `…]` preservation for bracketed tool rows, and complete selected-fragment highlighting, bottom shortcut placement in Models-style typing/navigation/filter/secondary-action order without an Enter-select hint, and focused label editing with `Label` title, `Empty to remove` subheader, one input, save/cancel-only hints, and complete tree-control restoration.
- Session-shell workflow coverage verifies exactly one blank row between prior status and the tree rule, direct tree-to-summary replacement without an intermediate default-input surface, direct summary-cancellation restoration without an intermediate default-input surface, summary footer adjacency, title-case nested titles, single-line custom-summary input with accent-bold title and semantic submit/cancel footer, atomic custom-input cancellation back to the summary choice, custom-summary submission, and skipped-summary direct navigation.
- Engine and shell workflow coverage verifies successful in-place tree navigation rebuilds the selected branch transcript, propagates returned user-message prompt text into an empty editor with the cursor at the end, and preserves an existing non-whitespace draft or editor state when no prompt text is returned.
- Focused tree, owned-keybinding, extension-UI, shell-component, session-shell, modal-inventory, and engine-workflow run: 122 tests passed.
- Regenerated copied-source provenance records the owned Session Tree deviation and changed copied-source hashes; ledger validation passed through the architecture gate.
- TypeScript project typecheck, production build, intentionally re-pinned startup-source budget, architecture and identity boundaries, pinned Pi source provenance, terminal-host provenance, code-documentation governance, docs-sensitive governance, strict OpenSpec validation, and diff whitespace checks passed.

## Physical acceptance

Maintainer review through the built `./scripts/dev` candidate passed after iterative checks of compact spacing, title-case nested dialogs, standard search, concise filters, selection and clipping, label presentation, tree paging/folding, selected-branch editor restoration, and prompt-free cancellation transitions. The maintainer confirmed the final physical result looks good and requested ready-for-review CI validation.

## Gap disposition

No known implementation or physical-acceptance gaps remain. Full regression and native host gates remain CI-owned under repository policy.
