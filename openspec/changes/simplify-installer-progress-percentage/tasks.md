## 1. Preserve the presentation incident

- [ ] 1.1 Record the `.603` terminal capture showing stale phase text after the percentage and distinguish it from publication failure.
- [ ] 1.2 Add focused TTY coverage requiring complete progress frames to end visibly at the percentage with no phase wording.
- [ ] 1.3 Retain assertions for palette, progress cleanup, cancellation, redirected success, and terminal restoration.

## 2. Simplify interactive progress

- [ ] 2.1 Remove the phase label from rendered progress frames while preserving internal progress classification and milestones.
- [ ] 2.2 Erase terminal content to the right of every progress frame so no prior suffix survives a carriage-return redraw.
- [ ] 2.3 Preserve the exact final success line and all existing non-interactive, failure, activation, and verification behavior.

## 3. Validation and delivery

- [ ] 3.1 Run focused installer tests, typechecking, changed-code documentation governance, strict OpenSpec validation, and diff checks; do not run local full/release suites.
- [ ] 3.2 Reconcile current `origin/develop`, complete evidence and known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
- [ ] 3.3 Keep exact-head PR validation and one newly numbered post-merge development publication mandatory; require both OIDC publications, registry verification, all native published-pair lanes, completion, and aggregate success.
