## Context

See [proposal.md](proposal.md) for motivation. `parseImplementation` already uses an own-property check for version 2 and a positive-integer check for legacy version 1. Existing tests cover a truthy legacy field on version 2, but not the full falsey-value table. The extra coverage is useful without inventing production behavior solely for an acceptance exercise.

This design records the migration and evidence boundaries because the change also exercises a newly provisioned write-capable archive identity.

## Goals / Non-Goals

**Goals:** Lock the distinction between an absent property and an explicitly present falsey property; keep a real test-only implementation in one draft PR through final review; obtain independently observable automatic archival of this accepted change.

**Non-Goals:** Production/parser changes, credential changes, new permissions, canonical-spec changes, acceptance of the bootstrap, legacy adoption, or automatically merging the source test PR.

## Decisions

- Add `test/repository-governance/openspec-archive-version-compatibility.test.ts`, calling the public parser with ordinary fenced JSON. Use table-driven cases for `null`, `0`, `false`, and `""`; require `metadata-fields` for forbidden version-2 linkage and `specification-pr` for invalid version-1 linkage. Positive controls accept a minimal version-2 link and version 1 with a positive integer. Do not weaken existing tests or mock the parser. A separate focused file keeps the live change easy to review; modifying production code is unnecessary.
- Declare `skip_specs: true`. Regression coverage does not change the contract, so inventing a new requirement or editing canonical specs would misrepresent scope. Successful archival must preserve canonical specs unchanged.
- Use the minimal version-2 PR association without a specification PR or mechanical task mapping. Finish all test/validation/handoff-preparation tasks before the final acceptance comment. Actual maintainer review, current-head required CI, manual source integration, and automatic archive integration are external gates, not checkboxes predicting future operations.
- Preserve the initial draft identity. Any approved refinement must revise the affected planning artifacts before its test changes in this same PR. Record approval and refinement identities in PR reporting, rather than calling initial permission to run a live test final acceptance.

## Risks / Trade-offs

- A passing dry-run or a bot API response is mistaken for live success → require the actual archive PR/head, ordinary required CI, automatic squash merge commit, and exact-head cleanup evidence.
- Extra evidence commits change the accepted source head → renew final-head acceptance; collect post-merge lifecycle evidence in the bootstrap follow-up instead of modifying accepted active artifacts.
- A regression exposes an implementation defect → report it and obtain authorization before expanding this test-only change into a production fix.
- The isolated no-delta path does not exercise a live canonical transformation → report that boundary explicitly; do not replace or claim new results for existing multi-capability sync fixtures.

## Migration Plan

Open the planning-only draft and obtain explicit plan/implementation approval. Apply any approved refinement in that stream before adding tests. Run focused tests, typecheck, changed-file documentation checks, strict OpenSpec validation, and required PR CI. Hand off the exact final candidate for actual maintainer review and a no-delta synchronization attestation, then record the authorized acceptance comment before separately authorized manual integration.

After source integration, observe the ordinary merge-triggered archive workflow without an extra archive dispatch or manual archive merge. Record its real lifecycle identities under `automate-post-merge-openspec-archive` in the eventual specification-only acceptance follow-up. Keep the still-planning/rejected PR and ordinary docs controls separate so they cannot accidentally certify this positive case. If the source is rejected, close it unmerged and retain unmerged local/remote work until cleanup is separately authorized.
