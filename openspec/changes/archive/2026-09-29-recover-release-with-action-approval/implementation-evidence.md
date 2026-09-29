# Implementation evidence

## Reconciled live state

Read-only checks on 2026-09-29 established that GitHub Release `v0.2.2` and both npm `0.2.2` packages were absent, npm `latest` was `0.2.1`, and `master` plus `v0.2.1` identified `51e8492c2aac79f120c157bb8db36a29819a136e`. Current `develop` at `f11d40df1ab428d54fd8a0acbb0e374fd584ca23` consistently declared `0.2.2-dev` for both package identities.

At the maintainer's explicit direction, the orphan `v0.2.2` tag at `694c8846ba1d96cb7048bde6eba84141d110e523` was deleted. Repository rules correctly blocked direct deletion. Only ruleset `a1-protect-release-tags` was temporarily changed from active to disabled, the exact tag was deleted remotely and locally, and the ruleset was immediately restored to active. Verification then found the remote and local tag absent and the ruleset active. No Release, package, `master`, or branch publication occurred during that operation.

The implementation was refined so the next `0.2.2` attempt uses ordinary current-`develop` authority. Release automation no longer contains an orphan-source disposition or standalone tag creation.

## Implemented boundaries

- **Approve stable release** accepts only a version. Trusted default-branch code derives and validates the human actor, current source, exact draft, normalized body, digest, absent npm pair, and absent target tag.
- Preparation creates or exactly reuses one editable source-bound draft and prints one direct editing URL plus one Actions URL. Generated notes use a version/date heading and categorized Pi-style sections.
- Package assembly consumes one approved body snapshot. Validation, npm publication, published-pair checks, asset upload, and `master` completion occur while the Release remains draft and the target tag remains absent.
- There is no independent release-tag write. The final Release PATCH publishes the source-bound draft; GitHub creates its tag at the bound source, and the workflow verifies both exact identities afterward. A pre-publication failure therefore needs no manual tag removal.
- Trusted App automation creates or exactly reuses one non-auto-merged reopening PR on current compatible `develop`, containing only synchronized next-development versions and the exact approved note. A human merges it after required CI.
- Bare A1 retains newest-first packaged history, while `a1 pi` retains Pi's oldest-first feed ordering with the latest entry nearest the bottom.

## Validation evidence and handoff

Before the final tag-lifecycle refinement, focused approval, release-command, pipeline, governance, documentation, workflow-YAML, architecture, typechecking, package-smoke, and strict OpenSpec checks passed. A prior full fast run exposed explanatory runtime comments exceeding the startup-graph byte budget; the comments were removed instead of increasing the budget. After PR #621 advanced `develop`, another run exposed missing prompt-chip consumer entries in the generated pinned Pi public-API baseline; only that generated baseline was refreshed and its focused policy test passed.

The maintainer then directed that further local suites stop and PR CI become the validation authority. The first ready-PR run failed only OpenSpec finalization with `acceptance-layout-sections` because the PR body lacked its final `## Acceptance` list. This refinement supplies that list and leaves exact-head CI, including protected Windows Defender-enabled startup evidence, as the delivery handoff gate. No assertion, release authority, package guard, or validation budget was weakened.

## Post-merge operational follow-through

After authorized manual merge, run preparation from clean current `develop`, review and save the new `0.2.2` draft, and use **Approve stable release**. Any pre-publication failure must leave both the draft and absent `v0.2.2` tag inspectable; retry the same immutable run when npm may already contain either package. Success must show the exact npm pair, approved public Release/body/asset, GitHub-created tag, and `master` at the approved source. Required CI must then pass on the generated `0.2.3-dev` reopening PR before manual merge, followed by stable startup, newest-first bare-A1 `/changelog`, preview suppression, and unchanged oldest-first `a1 pi` checks.
