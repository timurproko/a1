# Implementation evidence

## Result

- `PiModalFrame` now owns top-rule/title adjacency and a one-cell global left content inset. It renders top, bottom, and declared separator rules at full width while rendering semantic children against the reduced content width.
- Models, Skills, Thinking, scoped-model, session, tree, trust, extension selector/input/editor, provider-authentication, login, model/theme/image/message selectors, operation/reload loaders, and owned settings sub-dialogs use the shared inset policy at their component boundary.
- Representative renders keep the title immediately beneath the top rule, move titles, inputs, list rows, descriptions, statuses, and shortcuts inside the global left cell, retain relative row indentation, and preserve full-width rules.
- Interaction evidence preserves search/editing, navigation, completion, cancellation, nesting, focus, dynamic list replacement, resize, pointer ownership, restoration, and disposal.
- The explicit `a1 pi` comparison constructors and installed package bytes/prototypes remain unchanged. Parity evidence treats compact padded chrome as the named bare-A1 presentation difference while retaining pinned text and behavior as the oracle.
- PR #573 integrated exact implementation head `8aa3a7d9e2a4f2f9e2d06a6fbbe950f7e063531f` as merge commit `93f6928f55c35ae2e1d9c7b21deb5377557fdb65`; every selected exact-head lane and the protected aggregate succeeded, and the maintainer subsequently reported the modal behavior manually verified.

## Delivery repair state

- PR #573's body omitted its machine-readable implementation association at merge time. Trusted finalization therefore skipped it as unassociated, current `develop` still contains `openspec/changes/remove-modal-title-top-gap/`, and canonical modal requirements were not synchronized.
- Read-only reconciliation reports `unlinked`; local cleanup retains the original worktree with `source-association`.
- The corrective implementation preserves PR #573's immutable merged body and adds an exact `a1-openspec-association-repair-v1` record binding source PR/head/merge/validation run `573` / `8aa3a7d9e2a4f2f9e2d06a6fbbe950f7e063531f` / `93f6928f55c35ae2e1d9c7b21deb5377557fdb65` / `35967533362` to corrective PR #580.
- Trusted readiness and both publication paths now inspect immutable changed-file and base/head tree evidence before allowing an unassociated ready PR to fall through. New/restored active deliveries and mixed active-change/code candidates fail with `missing-implementation-association`; ordinary code, active-change removal, and documentation-only edits to an existing active change retain their established routes.
- Version-3 delivery validation parses any repair record before merge and verifies its exact corrective identity, original unassociated merged source, successful protected validation run, and authorized manual source merge. Cleanup then accepts only the same retained archive record and successful corrective version-3 chain, requires both remote topic refs absent, and leaves all local identity, ancestry, cleanliness, ownership, journaling, and non-force safeguards unchanged.

## Local validation

- `npm run build` — passed.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed, including the intentionally re-pinned startup graph at 157 files / 1,500,796 source bytes and source-port provenance.
- `npm run check:code-documentation` — passed.
- Corrective association policy, parser, readiness, workflow, publication, and version-3 delivery fixtures — 6 files and 40 tests passed, including missing, malformed, removed, valid, documentation-only, mixed-code, immutable-tree, exact corrective-chain, CI, manual-merge, and absent-ref cases.
- `node --test test/repository-governance/local-cleanup-evidence.node.mjs` — 14 tests passed.
- Naming-selection and validation-impact regression fixtures — 2 files and 21 tests passed with the Windows-appropriate extended per-test timeout after a concurrent full-directory run exceeded its default 5-second temporary-Git timeout.
- `npm run check:docs-governance` — passed.
- `npm run check:names` — passed across 1,056 files with zero violations.
- `npx vitest run test/integrations/pi/components` — 32 files and 309 tests passed.
- Focused modal inventory, project-trust, session-workflow, and dialog-panel run — 4 files and 26 tests passed.
- Focused owned-settings presentation and interaction run — 4 files and 59 tests passed.
- `npx vitest run test/app/session-shell/command-outcome-parity.test.ts` — 1 file and 4 tests passed in truecolor and 256-color modes.
- `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts` — 1 file and 5 tests passed; the consumer baseline is current.
- `npx openspec validate remove-modal-title-top-gap --strict` — passed.
- `node scripts/governance/finalize-openspec-delivery.mjs --change remove-modal-title-top-gap --repository timurproko/a1 --pr 580 --date 2026-09-24 --target <origin/develop> --body-file .pr-body.md` — passed with `would-finalize`, the expected archive path, acceptance manifest, four synchronized capabilities, and active-change removal.
- `git diff --check` — passed.
- `RUN_PROCESS_CONTAINMENT_INTEGRATION=1 STARTUP_BUDGET_ENFORCEMENT=record npm run test:scope -- package-startup` — environment-limited before launch measurement because Windows Defender real-time protection is disabled; the current `develop` candidate passed the required CI lane.

## Known gaps

- None. Corrective integration, exact-head CI, authorized manual merge, read-only archive verification, and candidate-scoped cleanup are lifecycle follow-through for the prepared version-3 candidate, not implementation gaps.
