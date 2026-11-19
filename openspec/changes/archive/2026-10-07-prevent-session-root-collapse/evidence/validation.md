# Implementation Validation Evidence

Recorded: 2026-10-07

## Passing evidence

- Initial manual review exposed that a real persisted session can place hidden model and thinking entries before the system message, so the first input-root identity check did not protect the visible `session` row. The corrected fold eligibility records semantic system-message identities during flattening and rejects those entries regardless of persisted or visible ancestry.
- Focused component coverage now models the production-shaped model-change → thinking-change → system chain and verifies Left/Right leave the visible `session` row expanded, Left on a simple descendant does not fall through to collapse the whole tree, eligible nested branches still collapse to their branch root and expand in place, and user-only filtering retains folding for a non-system branch whose system ancestor is hidden.
- The focused Session Tree and copied-source governance run passed 35 tests across the component, pinned-source ledger, and owned-UI customization prerequisite suites.
- TypeScript project and bin typechecks passed after a production build generated the bin declarations.
- Copied-source ledger regeneration/checking, provenance validation, and diff whitespace checks passed. Strict archived-change validation reports `2026-10-07-prevent-session-root-collapse` complete; its repository-wide command remains nonzero because it also reports pre-existing incomplete historical archives.

## Gap disposition

No known implementation gaps remain after correcting the production-shaped hidden-metadata case reported during manual review. Full regression and native host gates remain CI-owned under repository policy; the corrected interactive key handling remains available for maintainer recheck through the rebuilt candidate.
