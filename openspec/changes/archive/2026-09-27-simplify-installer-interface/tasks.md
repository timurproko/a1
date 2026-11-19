## 1. Preserve the presentation incident

- [x] 1.1 Record the `.603` terminal capture showing stale phase text after the percentage and distinguish it from publication failure.
- [x] 1.2 Add focused TTY coverage requiring complete progress frames to end visibly at the percentage with no phase wording.
- [x] 1.3 Retain assertions for palette, progress cleanup, cancellation, redirected success, and terminal restoration.
- [x] 1.4 Add argument/resolution regressions for bare stable and `--develop [preview-or-version]`, including absent and ambiguous published previews.
- [x] 1.5 Prove `--version`, `--latest`, `--next`, malformed previews, and extra arguments are rejected without compatibility aliases.

## 2. Simplify interactive progress

- [x] 2.1 Remove the phase label from rendered progress frames while preserving internal progress classification and milestones.
- [x] 2.2 Erase terminal content to the right of every progress frame so no prior suffix survives a carriage-return redraw.
- [x] 2.3 Replace installer's exact `--version` form with `--develop <preview-or-version>` and resolve requested previews from npm's authoritative version list.
- [x] 2.4 Delegate exact existing-installation targets through the matching self-update `--develop <full-version>` form.
- [x] 2.5 Update root/installer README and package declarations to show only the aligned grammar.
- [x] 2.6 Preserve the exact final success line and all existing non-interactive, failure, activation, and verification behavior.

## 3. Validation and delivery

- [x] 3.1 Run focused installer, package-validation, and documentation-governance tests, typechecking, strict OpenSpec validation, and diff checks; do not run local full/release suites.
- [x] 3.2 Reconcile current `origin/develop`, complete evidence and known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
- [x] 3.3 Keep exact-head PR validation and one newly numbered post-merge development publication mandatory; require both OIDC publications, registry verification, all native published-pair lanes, completion, and aggregate success.
