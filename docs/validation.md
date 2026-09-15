# Validation ownership and evidence

Development validation computes one exact base/head impact document with:

```bash
npm run select:validation-impact -- --base <full-base-sha> --head <full-head-sha> --output .artifacts/validation/impact.json
```

A manual Development dispatch has no trusted PR comparison and uses `--manual-no-comparison`, which selects every development integration owner. Unknown operational inputs, unavailable history, unsupported dependency loads, malformed policy, and classifier errors also select conservatively. Documentation-only and version-only changes retain their explicit exemptions. Use each owner's `reasons` and `paths` in `impact.json` to explain selection; do not infer a skip from a missing owner.

## Commands

The public commands remain:

```bash
npm run test:fast                  # typecheck, changed docs, complete fast composition
npm run test:scope -- <scope...>   # named atomic scopes
npm run test:full                  # complete deduplicated local composition
npm run test:release               # release gates; publication authority is unchanged
```

Important atomic scopes are `fast-remainder`, `fast-resource-sensitive`, `dist-integration`, `pi-engine-conformance`, `release-update`, `package-smoke`, `package-contracts`, `package-startup`, `image-compatibility`, `history-compatibility`, and `unix-containment`. `fast` still composes both fast partitions. `package-install` still composes package contracts and startup. `full-release` includes every successor scope and deduplicates files.

## Receipts and cache boundaries

A build receipt binds checkout head, complete build inputs, toolchain, emitted files, and native artifacts. A package receipt additionally binds exact tarball bytes, packed entries, manifest/bin identity, producer, and its verified build receipt or release source identity. `VALIDATION_BUILD_READY` and `VALIDATION_CANDIDATE_TARBALL` only locate prerequisites; they never authorize reuse without matching receipts. Input, toolchain, output, native, candidate, entry, manifest, or producer drift invalidates reuse and performs fresh preparation or fails.

Npm download bytes may be reused with integrity checks and `--prefer-offline`, with normal network fallback. Every install prefix remains fresh. Installed package trees, dependency certification, startup/profile/compile state, mutable fixture repositories, passing outcomes, and publication evidence are never restored from validation caches.

## Evidence inspection

Download these artifacts from the exact workflow run:

- `development-validation-impact`: base/head, selection identity, decisions, and reasons.
- `development-validation-outcome-*`: content-free job envelope, exact selected scopes, head/run/selection authority, gate durations, receipts, and bounded fixture phases.
- `development-validation-aggregate-*`: selected owners, evidence count, critical-path estimate, runner time, setup/gate time, cache state, and invocation counts.
- startup/resume phase JSONL and performance JSON: first-attempt launch evidence and retained failed setup/readiness records.

A selected job failure, cancellation, missing or duplicate artifact, stale head/run/selection, malformed outcome, unexpected skip, or evidence from an excluded owner fails `Development validation required`. Queue availability is reported as unavailable when GitHub does not expose a runner-side availability timestamp; it is calculated from the Actions API during final run analysis instead of guessed.

## Rollback

To disable impact skips without removing coverage, make the selector use conservative mode (or dispatch Development manually). To disable prerequisite reuse, unset the readiness/tarball variables and their receipt paths; tier orchestration rebuilds and repacks. To audit from entirely fresh download state, use a new npm cache directory and fresh install prefix. Rollback must keep all scopes, startup budgets, Defender, retries/timeouts, platform/runtime lanes, exact-package identity, and the stable required aggregate. Receipts and PR evidence never change release publication authority.
