# Implementation evidence

## Reconciled recovery state

Read-only checks on 2026-09-29 confirmed the live partial-release identity:

- immutable `v0.2.2` still resolves to `694c8846ba1d96cb7048bde6eba84141d110e523`;
- documentation-only PR #620 first advanced `develop` to descendant `7c25be1f9549bbd66461fd687a5ee9f42888f893`, and UI PR #621 later advanced it to descendant `f11d40df1ab428d54fd8a0acbb0e374fd584ca23`; both preserve `0.2.2-dev` and the package identities;
- no GitHub Release exists for `v0.2.2`, and npm returns no `0.2.2` version for either `@timurproko/a1` or `@timurproko/a1-install`;
- npm `latest` is `0.2.1` for both packages, while `master` and `v0.2.1` both resolve to `51e8492c2aac79f120c157bb8db36a29819a136e`.

The implementation was reconciled with PRs #620 and #621 rather than moving the orphan tag or pretending it remained the `develop` tip. Recovery selects the immutable tagged ancestor as the package source, validates both tagged and current open-version snapshots, excludes later commits from `0.2.2`, and creates the reopening proposal on then-current `develop`.

## Implemented boundaries

- **Approve stable release** accepts only a version. Trusted default-branch code derives the actor, current `develop`, normal or orphan-tag source, Release database identity, exact normalized body, digest, and recovery disposition. Apps, bots, unauthorized users, local `--approve`, native publication, and direct technical-input dispatch have no stable authority.
- Stable preparation creates or exactly reuses one editable draft and prints its direct editing URL and the Actions URL once. Generated notes use the version/date heading and categorized Pi-style sections.
- Orphan recovery requires the tag source to be current `develop` or its ancestor, requires both source snapshots to preserve one open version and package identity, and requires npm `latest`, `master`, and the prior complete tag to agree. The recovery procedure contains no command to delete, move, force-update, or recreate the orphan tag; completion fails if that tag disappears or changes.
- Package assembly consumes one approved body snapshot. The Release stays draft through package, registry, tag, asset, and `master` gates; normal publication makes it public only as the final completion mutation.
- Trusted App automation creates or exactly reuses one non-auto-merged reopening PR on current `develop`, containing only synchronized next-development versions and the exact approved note. A human must merge it after required CI.
- Bare A1 retains newest-first packaged history, while `a1 pi` retains Pi's oldest-first in-feed order with the latest entry nearest the bottom.

## Local evidence

Build, typechecking, workflow YAML parsing, architecture, documentation governance, strict OpenSpec validation, and focused approval/recovery/publication/reopening/release-note tests passed. The real disposable-Git release-command suite exercises normal draft creation and reuse, authoritative-source races, ancestor orphan recovery after `develop` advances, immutable-tag mismatch refusal, and exact reopening PR reuse under one finite 45-second per-test budget. The package-smoke scope built one exact development candidate and passed six package-surface checks plus seven packaged session-resume checks.

An earlier final fast-suite run found only a startup-graph byte-budget excess caused by explanatory runtime comments. Those comments were removed rather than increasing the budget; the architecture policy then passed unchanged. After reconciling PR #621, the next run exposed its new prompt-chip consumer paths missing from the generated pinned Pi public-API baseline; the baseline was regenerated without changing public API or test policy. No assertion, timeout, release authority, package guard, or validation budget was weakened.

The local Windows host does not replace protected CI's Defender-enabled stable startup evidence. Finalized exact-head CI remains the delivery handoff gate and must pass before manual merge.

## Post-merge operational follow-through

No live `0.2.2` draft, approval, package publication, tag mutation, or `master` movement is performed from this unmerged branch. After authorized manual merge, preparation must create the replacement draft for the immutable tagged source; an authorized human reviews it and runs **Approve stable release**. The run must verify the exact npm pair, unchanged tag, Release body and asset, and `master`, then prepare the manually merged `0.2.3-dev` reopening PR. Stable startup, persistent newest-first bare-A1 `/changelog`, preview suppression, and unchanged `a1 pi` behavior remain post-merge acceptance checks.
