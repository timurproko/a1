## Context

#976 replaced the four delivery workflows with one caller of the shared reusable workflow. PR #977 then ran the whole shared path live: promotion, finalization, re-finalization, re-promotion, the shared check, merge and branch deletion. The local scripts are no longer executed by any workflow except the two CI jobs and the documentation auto-merge manager removed here.

## Goals / Non-Goals

**Goals:** one owner for delivery rules; this repository's CI runs tests only; nothing that stays imports a removed script.

**Non-Goals:** changing the product (`src/`), the release pipeline, the nightly triage, or the live rulesets.

## Decisions

- **A small local reader instead of a dependency.** Readiness, the full-regression selector and release reopening need three facts from the pull-request body: whether it links a change, the archive path and the finalized head. `scripts/release/delivery-record.mjs` reads exactly that. A Git dependency on the shared repository was rejected: it would enter the published package's lockfile and its dependency and identity checks for forty lines of parsing. The body format is the contract; the shared workflow remains its only validator.
- **Readiness keeps deferring an unfinalized linked head.** This is test routing, not delivery policy: running suites on a head the bot is about to replace wastes a run. Association checks leave readiness; the shared check owns them.
- **The auto-merge manager handles release reopening only.** It ignores every other pull request, so a maintainer's auto-merge arm is no longer cancelled. Its merge is made with `GITHUB_TOKEN` and emits no event, so it deletes its own exact merged head and the Delivery caller keeps forwarding its completion to the shared refresh.
- **`.a1/worktree.json` is removed, not repointed.** The product runs the declared command without a shell, which cannot start an npm command shim on Windows. `worktree complete` reports that cleanup is not declared and keeps the checkout; `delivery cleanup --apply` removes it.
- **Capabilities are retired with `retire_capabilities: true`.** The three specifications describe only removed automation, so their deltas remove every requirement.

## Risks / Trade-offs

- The shared check is not yet required by the ruleset → an unlinked pull request that adds an active change is blocked only by a visible failing check until the ruleset change lands.
- Release reopening auto-merge cannot be exercised before the next stable release → its classifier and planner keep their unit tests, and a failed verification falls back to manual merge.
- Documentation pull requests now wait for a maintainer merge.
