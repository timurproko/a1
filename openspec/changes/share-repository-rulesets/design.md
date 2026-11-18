## Context

`delivery protect` reads `protection/repositories.json` in the shared workflow repository, finds the live ruleset that governs the same refs, and renames and updates it in place. For this repository it declares the default branch, `master`, and `v*` release tags with the release-automation App as the only tag bypass.

## Goals / Non-Goals

**Goals:** one declaration of the rulesets; the repository governance check does not fail because of a shared, reviewed ruleset change.

**Non-Goals:** changing repository settings, Actions policy, environments, labels or workflow inventory, which stay declared and checked here.

## Decisions

- **Remove the local declaration instead of renaming it.** Keeping a second copy with new names would still need an edit here for every shared change.
- **Remove `protectedRefs` with it.** It was derived from the live rulesets' ref patterns, and the shared default-branch ruleset targets the default branch by the `~DEFAULT_BRANCH` token of GitHub, not by name.
- **The governance apply command no longer writes rulesets.** `delivery protect --apply` is the only writer; an undeclared live ruleset is reported by that command, not by this check.
- **The admin may bypass `develop` for pull requests only.** This is the escape hatch the maintainer chose: any pull request can be merged without waiting for checks, and nothing can be pushed to `develop` without a pull request.

## Risks / Trade-offs

- The nightly governance check of this repository no longer notices ruleset drift → `delivery protect --repo timurproko/a1` reports it on demand, from the shared declaration.
- The live rulesets change outside this pull request → they are applied immediately after the merge, and the dry run shows exactly what changes.
