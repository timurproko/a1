## Candidate validation evidence

Recorded 2026-09-15 from `D:/Git/a1/.worktrees/visible-openspec-acceptance`. These are scoped implementation checks, not a complete local fast/full/release run and not post-deployment live acceptance.

- `npm run typecheck`: passed.
- `npm run check:architecture`: passed architecture, product identity, package identity, pinned Pi ledger, and terminal-host provenance checks.
- `node scripts/governance/check-docs-governance.mjs`: passed; 75 inventoried legacy occurrences matched.
- `npm run check:code-documentation`: passed with no violations.
- `openspec validate visible-openspec-acceptance --strict`: passed.
- Focused governance run: 15 files and 277 Vitest tests passed. It covered acceptance schemas/task reconciliation, App publication constraints, manual-only merge provenance, documentation auto-merge exclusions, receipt/archive compatibility, actual pinned OpenSpec staging, archive publication, workflow policy, local cleanup's 42-case native bridge, resource-sensitive partition policy, and validation-suite ownership.
- Read-only live repository audit for implementation #400: passed identity/CI discovery and proposed no mutation. It bound source head `adca201ee0df4a0d64a34b4d00f1230699a8b31f`, implementation merge `710447d99f1bdf28415deeee10e73ead2a361667`, reviewed base `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`, and required CI run `34935418502`. It reported genuine pending tasks `6.2`, `7.1`, `7.2`, and `7.3`; it did not classify them complete or publish an acceptance request.

## First hosted CI result and same-PR repair

Required run `34942002242` on head `838da76fc566c04e0da6d619457b2b9da4dffb4a` failed for three narrow governance assertions, not acceptance runtime behavior:

- Changed-file documentation validation found four new implementation comments without the repository's required semantic prefix. They now use `Provenance`, `Invariant`, or `Concurrency` while retaining their original meaning.
- `change-delivery-guidance.test.ts` still required the superseded pre-merge acceptance-comment placeholder and phrase. It now asserts the visible record path, manual-merge statement, renewed implementation review, and exact human PR-backed acceptance policy.
- `impact-aware-validation-workflows.test.ts` still expected the old required-job dependency list. It now requires the added `Acceptance record validation` job and dependency.

Repair validation passed: the exact 17 affected Vitest assertions, typecheck, changed-file code-documentation validation using a regenerated impact selection, docs governance, strict all-OpenSpec validation, and whitespace checks. No assertion, required job, coverage behavior, or timeout was removed.

## Deliberately unclaimed evidence

- Required normal PR CI for the completed implementation head is pending task 5.4.
- Maintainer review/handoff is pending task 6.1.
- No acceptance PR was published or manually merged, no archive was published, and no local cleanup registration/release/watch/mutation occurred.
- The isolated post-deployment implementation → acceptance → archive lifecycle and its negative controls require separate authorization and remain pending task 6.2.
- This implementation cannot prove its own future deployed acceptance/archive lifecycle. The acceptance job on this bootstrap PR may be visibly present but its trusted base does not yet contain the new validator; it is not accepted as live receipt evidence.
