## Context

See `proposal.md` for motivation. The version-3 body validator accepts exactly the sections `Proposal`, `Implementation`, `Acceptance`, and `Automation`; under `Implementation` a checklist allows two to ten `- [x]` items of 20 to 300 bytes with no links, fences, HTML, `@` handles, or nested lines, and draft promotion also rejects items that name validation. A body with no checkbox item at all is a historical plain list that trusted readiness skips. The upgrade report needs nested bullets, package names with `@`, and changelog quotes with links, so the generated proposal body cannot be made a checklist by editing it in place.

The regression triage solved the same problem in `regression-repair-checklist-body`: fixed generated outcomes in the body, evidence in a comment and the change design, and no body edits after opening.

## Goals / Non-Goals

**Goals:**
- A finished upgrade advances to finalization and CI through the same readiness path as every other draft, with no new promotion rule.
- The reviewer only checks the generated outcomes; it never writes or rewrites body items for a proposal.
- Every verdict and review item stays on the pull request, and a re-run never overwrites a checked outcome.

**Non-Goals:**
- Changing readiness, finalization, branch ownership, skip, freeze, or refresh rules.
- Retrofitting existing proposal bodies automatically.
- Deriving outcomes from the report at open time.

## Decisions

### Generate four fixed outcomes

The body carries four fixed implementation outcomes, one per review-item family the sync reports: merge conflicts and kept-copy carry-over, the public API delta, pending feature rows with orphaned or unmapped inventory entries, and stale pin mentions with user-visible release notes. The reviewer checks an outcome the report shows nothing for. The acceptance outcome names the new version and short upstream commit. The report test parses the generated body through the real validators, incomplete as generated and complete once checked, and checks the proposal stays within the layout bounds when every gate fails.

Alternative considered: generate only the outcomes whose family has findings. Rejected because the body is fixed at open while a refresh can surface new findings, and a fixed set matches the regression precedent the maintainer chose.

### Report through sync report comments

The proposal script writes `comment.md` beside `body.md`: a heading with the version and date, an intro that distinguishes a scheduled run from a refresh, the version delta, the changelog excerpt, and the report. The workflow posts it after `gh pr create` and on every later run against an open proposal, whether or not the branch was rebuilt, and never calls `gh pr edit`. The scaffold's `design.md` records the opening report under `Sync report at proposal` when the sync writes the scaffold. The report markers and `refresh-pi-upgrade-body.mjs` have no remaining reader and are removed.

### Describe the track where agents read it

The delivery context in `openspec/config.yaml`, the CI runbook, and the toolchain guide say that the generated outcomes are checked as they complete and never rewritten, and that the report lives in the comments.

## Risks / Trade-offs

- **[Risk] The generated wording drifts out of the checklist rules** → the report test parses the generated body through the real validator, including the validation-item filter.
- **[Trade-off] An outcome may have nothing to do** → the reviewer checks it; a fixed set keeps the body stable across re-runs.
- **[Trade-off] Several comments accumulate across nightly runs** → each is headed with its version and date, and the newest is authoritative.

## Migration Plan

1. Merge the generator change; the next published Pi version opens its proposal in the new layout.
2. Rewrite the open proposal `#783` by hand into the generated layout and post its existing report as a sync report comment, so it promotes under the unchanged readiness rule once its outcomes are checked.
3. Roll back through an ordinary corrective PR that restores the previous renderer; historical bodies are never rewritten by automation.

## Evidence

Recorded in `implementation-evidence.md`.
