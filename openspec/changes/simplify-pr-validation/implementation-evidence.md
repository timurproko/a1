# Implementation evidence

## Authorization and baseline

The maintainer explicitly requested implementation with `implement pr 428`. Implementation continues in PR #428, branch `refactor/simplify-pr-validation`, and its existing worktree. The proposal commit is `41b82e7248411a14c7348f8ab7458a873cb26cf8`; its accepted base is `29cc4c03684ca05451c5e6f93b45810f261eb95b`. This authorization is not final acceptance or merge authority.

The machine-readable ownership report at `evidence/ownership-ledger.json` accounts for all retained tests under one coarse owner and records PR-core, complete-fast, explicit integration, and platform/runtime ownership. The durable-oracle classification at `evidence/durable-oracle-audit.json` maps each recurring historical-evidence or exact-prose assertion to current behavior, hermetic evidence tooling, structured stable policy, or one-time finalization evidence.

## Historical observations (not speedup evidence)

These observations are deliberately separate and are not treated as comparable proof of a speedup:

- Development run [34961661496](https://github.com/timurproko/a1/actions/runs/34961661496) succeeded at `1b7859fe08f6b5d1abf2b7953cb706c2445021f4` after conservative manual selection. Fast validation lasted about 4m45s, resource-sensitive validation about 3m14s, startup about 4m54s, and its complete promoted-owner cell about 10m36s. This was a successful broad baseline, not an ordinary selective path.
- Full regression run [34973476437](https://github.com/timurproko/a1/actions/runs/34973476437) succeeded at `4a22f53e4ac00aa89c9156ebfb6df4b4edd54b4a`: macOS Node 24 took about 10m, Linux Node 24 about 11m22s, Windows Node 24 about 30m8s, and Windows Node 22 about 39m32s. It is complete-cadence evidence, not PR-core timing.
- PR #425 Development run [35061215617](https://github.com/timurproko/a1/actions/runs/35061215617) succeeded at `ed6baa1d18d05aa327037e8928b5812deb31e7aa`. Its fast cell took about 4m48s and its complete promoted-owner cell about 15m35s. Earlier runs `35060412082`, `35009856258`, `35009367059`, `35008030730`, `35006946913`, and `35006312931` were cancelled and remain distinct from the successful observation.
- The predecessor archive retains failed Development attempts and their causes separately from its successful runs, including package readiness, workflow envelope, aggregate scanner, resource contention, startup, and Full regression failures. This change neither relabels those attempts nor infers an unmeasured ordinary-path result from them.

No new three-to-five-minute PR-core claim is made before exact-head hosted evidence. Queue time, setup differences, changed test populations, and conservative selection make these historical runs non-comparable.

## Local implementation checkpoint

Exact worktree dependencies were installed with `npm ci --ignore-scripts --no-audit --no-fund`; this did not build or run a product suite.

The first focused selector/aggregate run passed 113 of 115 tests. One rendering fixture still expected an unsupported rendering asset to fail closed to full coverage, and one excluded-owner fixture supplied an incomplete owner scope that the aggregate correctly did not recognize as that owner. The implementation restored unsupported-extension fallback and made any same-target excluded-owner evidence contradictory. The first typecheck also found six test-only implicit `any` parameters in the new ownership audit; those callbacks were typed. These failed local attempts are debugging evidence, not acceptance.

After correction:

- `npx vitest run test/repository-governance/validation-ownership.test.ts test/repository-governance/validation-impact.test.ts test/repository-governance/integration-selection.test.ts test/repository-governance/integration-impact.test.ts test/repository-governance/modular-validation-aggregate.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/validation-suite-policy.test.ts test/repository-governance/validation-tier.test.ts test/repository-governance/full-regression-policy.test.ts test/repository-governance/integration-owner-registry.test.ts test/repository-governance/development-validation-required.test.ts test/repository-governance/package-download-cache.test.ts test/features/launch/terminal-colour-fidelity.test.ts test/repository-governance/terminal-host-proof-gate.test.ts test/repository-governance/terminal-host-provenance.test.ts test/repository-governance/validation-receipt.test.ts test/repository-governance/validation-receipt-workflows.test.ts --maxWorkers=1 --minWorkers=1` passed **178 tests across 17 files**.
- `npm run typecheck` passed.
- `npm run check:architecture` passed architecture, product/package identity, pinned Pi provenance, and the stable terminal-host provenance check.
- `node scripts/governance/check-code-documentation.mjs --mode changed --selection .artifacts/validation/impact-local.json --result .artifacts/validation/code-documentation-local.json` passed before subsequent bookkeeping-only evidence edits; the final full tracked-file documentation check also passed.
- `npm run check:docs-governance` passed.
- `npx openspec validate simplify-pr-validation --strict --no-interactive` passed.
- Workflow YAML parsed successfully, `git diff --check` passed, and the regenerated ownership ledger accounts for **354 retained tests**.

A local changed-naming invocation was rejected because that gate intentionally compares a committed head diff while the debugging selection included uncommitted worktree files. No naming result is claimed from that unsuitable invocation; exact-head CI remains authoritative.

No local `test:fast`, `test:full`, `test:release`, product UI, package startup, or publication command was run.

## Deterministic selection replay

`evidence/selection-replay.json` records ten policy-bound scenarios without GitHub or mutable history: unrelated governance, UI/rendering, launch/startup, release/package/update, Pi, native containment, image/history, shared support, validation authority, and an unknown operational path. Ordinary fixtures select only their coarse owners plus linked integration; shared support and both fail-closed fixtures select complete coverage. The report binds policy identity `4aca3b7475be969b4005494728d4f77582796657fb1ef6723b95e3162d45fc08` and all 354 retained tests.

## Post-finalization hosted evidence plan

Acceptance remains blocked until all of the following run against the finalized exact head:

1. Mark the finalized PR ready so normal `pull_request` Development validation runs. Because this implementation changes workflow, selector, suite, and aggregate authority, the exact PR run must classify conservatively. Record the run/head/attempt, every job conclusion, selected core/integration owners, aggregate identity, failed attempts, PR-core setup/gate/runner milliseconds, critical path, and total runner milliseconds from `development-validation-impact`, the attempt-qualified core outcome, and `development-validation-aggregate-<head>-<run>-<attempt>`.
2. Report the PR-core three-to-five-minute target as met or unmet from that hosted core job. The deterministic ordinary replay may explain intended selective membership but must not be represented as hosted timing or as a speedup.
3. Dispatch the **Full regression** workflow against the same finalized branch/head because validation authority and complete-suite composition changed. Record each Windows Node 22/24, Linux Node 24, macOS Node 24, and documentation conclusion plus exact-candidate identities. Any advanced head invalidates this evidence and requires a new run.
4. Preserve every failed Development/Full regression attempt. If a failed-jobs-only rerun is used, record both attempt numbers and verify the aggregate identifies prior-attempt reuse; never rerun a semantic failure automatically. Any missing result requires an explicit known-gap disposition before acceptance.

These hosted gates occur after version-3 in-branch finalization by repository policy. They are mandatory acceptance evidence even though they cannot be preconditions of the task-completeness check that permits finalization. No three-to-five-minute result is claimed yet.

## Acceptance scenarios

The PR body and eventual conditional manifest use these exact ordered scenarios:

- An ordinary owned-path change runs the bounded PR core and only its reviewed unit and integration owners, while unknown or validation-authority paths select complete coverage.
- Re-running failed jobs on an unchanged run reuses untouched successful attempts, while a current failure or changed head or selection blocks the aggregate.
- Fast, full, and release commands retain complete tests and platform coverage, and exact-artifact gates reject stale or tampered build and package evidence.
