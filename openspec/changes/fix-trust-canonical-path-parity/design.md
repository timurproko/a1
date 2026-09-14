## Context

See `proposal.md` for motivation. The failing native job is [macOS Node 24, 104009697994](https://github.com/timurproko/a1/actions/runs/34854247359/job/104009697994), source `f3cbdc64f9316089c6b764e54c4cfa023c9ee876`. Both command-outcome color cases fail at `dark/0/trust/open/80`: pinned renders `Trust parent folder` and `(/private/var/folders/.../T)` on separate rows, whereas owned renders `Trust parent folder (/var/folders/.../T)` on one row. Linux Node 24 and Windows Node 22/24 lanes succeeded; this is not evidence of complete macOS parity or post-merge package acceptance.

Source comparison against pinned Pi 0.84.2:

- `core/trust-manager.js` uses `canonicalizePath(resolvePath(cwd))` to construct project options and computes the parent from the canonical project path. `utils/paths.js` uses `realpathSync` and falls back to its input on lookup failure.
- The pinned trust selector uses those options for labels, saved-state matching, and update payloads, but renders the supplied cwd separately in its heading.
- `ProjectTrustStore` already canonicalizes lookup/write identities and walks canonical ancestors. It cannot repair an incorrectly chosen parent: resolving the alias's parent is not necessarily the same as taking the target's parent.
- A1's `PiEngineAdapter.pinnedProjectTrustContext()` currently builds options from `resolve(this.#cwd)` and `dirname(cwd)`. The owned trust selector faithfully consumes the supplied options, so fixing rendered strings there would leave action identity wrong.
- `getProjectTrustOptions` is not exported by the pinned package's public root. The production fix must not introduce a private upstream import. Independent test producers can continue invoking the real pinned selector.

## Goals / Non-Goals

**Goals:** Keep the canonical trust identity separate from the session-cwd presentation; ensure options and their effects use the same identity; retain the unchanged store and trust-security lifecycle; prove the difference on real alias topology rather than only mocked platform names.

**Non-Goals:** Change session cwd globally, migrate `trust.json`, extend path syntax or session-only choices, modify startup resource gating, load resources on `/trust` selection, alter dependencies/workflows, modify source-synchronized presentation, or complete the earlier nightly/scoped-model changes by implication.

## Decisions

### 1. Canonicalize at the owned trust-context boundary

Use the adapter's resolved absolute cwd as the presentation input. Derive a separate trust path with the pinned-equivalent synchronous real-path lookup and resolved-path fallback; derive its parent only after canonicalization. Build every `savedPath` and update path from that trust path. Keep the current option order, parent-root exclusion, saved store lookup, and `projectTrusted` source. A small owned engine helper is acceptable if it makes these invariants testable without growing the adapter unnecessarily.

This runtime boundary already supplies resolved filesystem cwd values; this fix does not add a new user-facing path parser. Retain native path behavior, including drive roots and junctions. Do not substitute `realpathSync.native` or a platform-specific `/private` prefix rewrite without proving pinned equivalence. Do not cache an alias resolution across selector openings.

Alternatives rejected: normalize all captured paths or canonicalize both fixture homes before capture (hides the defect); canonicalize the entire rendered cwd (changes a distinct pinned presentation); fix only the label (leaves saved-state and parent-update defects); canonicalize the lexical parent (can select the wrong ancestor); import a private upstream helper into production (breaks the owned dependency boundary).

### 2. Preserve the trust lifecycle and minimize provenance impact

Keep `ProjectTrustStore` as the authority for saved decisions and writes. Parent confirmation still submits parent-true plus project-null; project trust/deny still submit a single project update. The selector closes on save/cancel and saves require restart; no active settings/resource mutation is introduced. Only the real-path lookup uses fallback; do not broaden catches around trust-store operations.

The expected changes are confined to the owned adapter/helper and tests. The mapped adapter record has no `localSha256`, and the source-synchronized trust selector needs no change; no ledger or pinned source bytes are expected to change. If implementation reveals a need to modify a protected presentation port or provenance scope, reconcile this plan before doing so, rather than relaxing verification.

### 3. Exercise actual alias identity and independent output

Add focused context tests with a temporary target directory and an alias under a different parent. Use directory symlinks on Unix and directory junctions on Windows so normal test permissions suffice. Assert canonical project/parent paths, unchanged cwd heading, root exclusion, lookup-failure fallback, direct trusted/denied selection, inherited-parent and higher-ancestor states, and saved checkmarks. Verify parent confirmation clears the canonical child override without trusting the alias parent or changing unrelated entries. Cover explicit project save/deny, cancellation, and unchanged session trust/resource loading.

Keep test homes and stores isolated; clean only fixture-owned paths and restore any injected filesystem failure. Alias creation failure must be reported, not silently skipped. Missing-path and injected lookup-error tests cover fallback without relying on platform permission quirks.

Extend the existing independent command-outcome case/state/worker support only enough to provide the same raw cwd, alias topology, trust seeds, and action inputs to both producers and to capture trust updates or resulting store state. Expected rows remain produced by untouched pinned code; no owned helper may author the pinned expected result. Retain the full 80/28, dark/light, padding 0/1, and both-color matrix and all existing cases. Add negative path/ANSI/wrapping checks using real captures. A path-length assumption must not be the sole proof: explicit alias identity and action assertions catch the defect regardless of temporary-directory length.

### 4. Preserve validation ownership and delivery boundaries

This draft contains only planning artifacts. After explicit approval/request, implement in this same worktree/branch/PR, retain draft status while incomplete, and obtain current-head required CI plus all four native Full regression lanes without added skips, retries, timeout inflation, or widened exceptions. A remaining unrelated gate gets its own stream; do not declare a blocked run green.

Manual acceptance must cover the exact final candidate through a build-first color-preserving launch, disposable profile, and alias cwd: parent label/wrapping, saved state, trust/deny/parent, and cancel. Record actual exact-head acceptance using the repository runbook; CI, approval to implement, and merge state are not substitutes. Auto-merge remains disabled.

The prior `fix-nightly-platform-validation` and `fix-scoped-model-platform-hints` changes retain their own incomplete merged-package validation/acceptance obligations. After the trust fix merges, a newly numbered merged implementation package still needs full nightly-equivalent evidence, including source/version/digest and all four lane outcomes, under those existing obligations. Do not edit published bytes or mark those changes complete from this PR's source regression alone. This change's mechanical archive preparation can proceed only after its own substantive tasks and actual acceptance are satisfied; incomplete legacy tasks are not auto-completed.

## Risks / Trade-offs

- [Alias and target have different parents] → Compute the target first and test persistence, not just labels; this is a trust-scope correctness issue.
- [Missing/unresolvable paths] → Match pinned resolved-path fallback without changing store error handling or granting trust.
- [Filesystem changes between display and save] → Preserve pinned synchronous behavior and store canonicalization; stronger race guarantees are outside this compatibility correction.
- [Native platform differences] → Use real filesystem fixtures and all four CI lanes; synthetic failures supplement rather than replace native evidence.
- [Another mismatch appears later in the strict matrix] → Preserve exact comparisons and report that blocker separately; no baseline or exception relaxation.

## Migration Plan

No data migration is required: the existing store already uses canonical keys. Ship only after explicit implementation approval, automated validation, actual maintainer acceptance, and manual merge authorization. Rollback is a normal code revert restoring the old option builder, not a trust-store rewrite; it would also restore the known alias-parent defect. Synchronize the added requirements only in the verified OpenSpec-only archive follow-up, then clean retained worktrees after archive integration.
