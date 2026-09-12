## Context

See `proposal.md` for motivation. At planning base `2ad5e2e0`, `scripts/release/release.mjs` requires an argument, strips prerelease text before incrementing explicit bumps, and invokes `gh pr merge --squash --auto` for both version PRs. It commits version edits in the caller's `develop` checkout and hard-resets that checkout twice. `README.md` calls the PR self-merging and does not explain patch promotion from a development version. The maintainer clarified that the existing `--patch` behavior should be corrected; no no-argument release mode is wanted.

The current publisher already verifies exact authoritative source, final package bytes, registry state, and immutable release records. It refuses existing stable versions. Those protections stay in place. The repository permits auto-merge only for its documentation allowlist; manifest and lockfile changes are operational changes even when they change only the version.

## Goals / Non-Goals

**Goals:**
- Make the existing patch command promote a prerelease to its stable core and increment an already stable input.
- Require manual version-PR integration while preserving publication-before-reopening order.
- Keep caller state and immutable release identity safe across waits and failures.
- Make README examples, CLI help, runbook, and tests agree.

**Non-Goals:**
- Publish a real release while implementing or testing this change.
- Add a no-argument release mode or change minor/major arithmetic, nightly preview numbering, dist-tags, release gates, or branch protection.
- Add a background release daemon, general deployment state store, or bypass for existing stable versions.

## Decisions

### 1. Resolve a release target before any mutation

Extract a pure, testable target resolver and use the existing semver dependency's patch increment on the original validated version, without first stripping its prerelease component. Thus `0.1.8-dev`, `0.1.8-dev.123`, and other valid prereleases of that core promote to `0.1.8`; stable `0.1.8` increments to `0.1.9`. The next-development calculation remains separate and operates on the selected stable result, yielding `0.1.9-dev` after releasing `0.1.8`.

Keep the required-target interface: `patch`, `minor`, `major`, or a valid stable `x.y.z`. No target, malformed version, invalid exact target, unknown target, or extra positional arguments must produce actionable usage errors before version edits, worktree creation, pushes, PR creation, or publication. Do not introduce an implicit retry or release when no target was supplied.

Retain existing minor/major core-version arithmetic and exact-target selection. From `0.1.8-dev`, `patch` now selects `0.1.8`, `minor` selects `0.2.0`, and `major` selects `1.0.0`; an exact `0.4.0` still selects `0.4.0`. All targets remain subject to existing registry/tag protection. Print the source version, stable target, and prospective next-development version before mutation.

Alternative rejected: add `npm run release` without arguments as a separate promotion command while leaving `--patch` incorrect. Fixing the existing patch command provides the desired behavior without a second release entry point.

### 2. Replace automatic version merges with explicit handoff

Keep one invocation's existing sequential, bounded PR-wait structure, but remove all programmatic merge and auto-merge enablement for version PRs. Print the PR URL, phase, required CI/manual-validation steps, and instruction to merge manually after acceptance. Observe actual PR state; successful CI alone does not advance the release. A closed-unmerged PR, timeout, query failure, or cancellation stops the phase with its PR identity and truthful progress.

Use detached version-preparation worktrees under the invocation's repository `.worktrees/` directory, each based on fresh authoritative `origin/develop`, rather than committing and hard-resetting the caller. Address every operation explicitly. Preserve the preflight requirement that the launch checkout is clean `develop` at the remote tip. Edit only the root package version and root lockfile package entry. Never alter dependency versions with text replacement. Refuse a conflicting existing branch/PR; an exact matching pending version PR can be reported and observed without overwriting it. Retain failed or pending work for inspection and remove only clean, owned, confirmed-merged phase worktrees.

The caller's branch remains `develop`. Refresh remote state without resetting local work. A final local fast-forward is permitted only if the caller is still clean at its original expected HEAD; otherwise leave it untouched and report the authoritative remote version and safe synchronization instructions. Work appearing during a release wait must not be discarded.

Alternative rejected: simply replace `--auto` with a direct merge. That still bypasses the requested manual gate. Retaining hard resets in the shared checkout also risks unrelated changes created while the helper waits.

### 3. Bind each phase to its verified predecessor

The sequence is:

```text
0.1.8-dev
   --> stable-version PR, manual merge
   --> verify exact merge commit/version and authoritative origin/develop
   --> explicit stable publication, await confirmed success
   --> next-development PR for 0.1.9-dev, manual merge
   --> verify remote develop and report completion
```

Capture the stable version PR's merged SHA and verify it is still the publication source required by the existing workflow. Never replace a stale selected SHA with whatever happens to be the newest `develop` commit. If it changed, stop with the discrepancy. Preserve the existing exact-source dispatch client and wait for its verified successful result before preparing the next version PR.

Compute the reopening version from the released stable core, not from an independently reread or automatically bumped local prerelease. For `0.1.8`, it is `0.1.9-dev`. If publication fails or is uncertain, do not create that PR. If publication succeeds but reopening fails or its PR remains pending, report that `0.1.8` is published and reopening is incomplete; do not suggest rerunning a stable publication that now exists. Document manual inspection/recovery instead of silently republishing or moving tags. Before publication, recovery may use the exact intended stable target after verifying any already-prepared matching PR. Repeating `patch` from an already-stable checkout would deliberately select the next patch, so recovery instructions must not suggest that as a retry of the same release. Invocation without a target remains a usage error in every phase.

Alternative rejected: update to `0.1.9-dev` before publication completes, or describe opening its PR as already reopening `develop`. Both report state that has not been achieved.

### 4. Update documentation with the implementation

Use `npm run release -- patch` as the primary README release example, showing `0.1.8-dev -> 0.1.8`, then `0.1.9-dev` only after verified publication and manual merge. Separately show `0.1.8 -> 0.1.9` for the same command on an already-stable input, and keep minor/major/exact examples with a clearly stated source version. Do not advertise a no-argument command. Remove self-merging claims. Update `docs/ci-release-runbook.md` with clean-checkout prerequisites, both manual PR gates, next-version timing, explicit-target recovery before publication, and inspection rather than republish after registry success. Check adjacent release documentation for contradictory automation claims without rewriting unrelated workflows.

The specification PR does not edit README or executable files. Documentation and behavior must land together in the implementation PR.

### 5. Verify with isolated command fakes, not a real release

Use pure resolver tables and temporary repositories with fake GitHub/publication boundaries. Verify exact Git/PR/dispatch ordering, absence of merge/auto-merge calls, version-only manifest/lockfile edits, caller-state preservation, authoritative SHA checks, failed/closed/pending PRs, registry/tag refusal, and publication-before-reopening. Test the public `--patch` command path for both prerelease and stable inputs through a safe mocked harness, and verify missing targets remain mutation-free usage errors; do not call the live release command as a smoke test. Update existing source-policy tests where helper extraction changes source shape, while retaining their publication and lockfile invariants. README/runbook checks should exercise the examples against the same resolver expectations.

## Risks / Trade-offs

- **[Manual merges take longer than the existing bounded wait]** -> Print phase/PR details and recovery instructions; timeout never implies acceptance or permission to merge.
- **[Concurrent work advances develop or edits the caller checkout]** -> Verify source SHA and version at phase boundaries, isolate commits, and never hard-reset or overwrite the caller.
- **[An already published version is retried]** -> Preserve registry/tag refusal and distinguish published-but-not-reopened failures from unpublished failures.
- **[Patch promotion is confused with incrementing a stable version]** -> Use the same prerelease-versus-stable input table across help, README, runbook, and resolver tests; keep the next-development calculation based on the published stable version.
- **[Release helpers accidentally make network mutations during tests]** -> Inject fake boundaries and assert no real publication, tag, branch-protection, or merge operation occurs.

## Migration Plan

No package version or persisted product data changes with this feature. After the specification is accepted, implement resolver/orchestration changes and documentation in a separate candidate, run focused tests and required CI, and obtain user acceptance using a safe command harness. A real `0.1.8` release remains a separate deliberate maintainer operation. The explicit-target interface is retained. Rollback reverts implementation changes, not any published version or immutable tag.
