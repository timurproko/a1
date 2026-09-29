## Context

`streamline-release-publish-handoff` kept one invariant above usability: a public Release and tag never exist without both npm packages. Because the reviewed note is packed inside the application package, the note must be final before packing, so npm had to be staged from a draft. GitHub emits no workflow event for draft edits, which forced the waiting command to poll for a fresh **Save draft** and forced the documentation to warn the maintainer away from the primary **Publish release** button.

Common practice for npm packages publishes from the `release: published` event (GitHub's Node.js publishing guide and most libraries), recovers a failed upload by rerunning the job, and accepts that the Release briefly precedes the registry. Release-PR tools (changesets, release-please) keep the tag after npm but move changelog review out of the Release editor. The maintainer chose to keep review in the Release editor and make **Publish release** the trigger.

## Goals / Non-Goals

**Goals:**

- One command, one edit, one click: `npm run release -- patch`, edit the draft, choose **Publish release**.
- The command exits after preparing the draft; nothing requires a terminal to stay open.
- Slow source validation runs while the maintainer edits, so publication after the click is short.
- A failure before npm leaves the maintainer where they started: an editable draft and no tag.

**Non-Goals:**

- Changing nightly or numbered development publication.
- Moving changelog review into a pull request.
- Guaranteeing that no public Release ever exists without npm; the window is bounded and self-healing instead.

## Decisions

- **Trigger.** `release: published` on a stable, non-prerelease Release is the only stable publication trigger. GitHub runs `finalize-release.yml` from the tag it just created; that wrapper only calls the default-branch `publish.yml` with the event's version and Release ID. Trusted code requires `GITHUB_WORKFLOW_REF` to be that wrapper at `refs/tags/v<version>`, the tag to be a lightweight tag at the event commit and at the Release's `target_commitish`, that source to be in `develop` history, and the publishing actor to be a GitHub `User` with `write`, `maintain`, or `admin`. Requiring the published source to still equal the `develop` tip would fail most releases, because other pull requests merge while the maintainer edits; the bound source and its successful candidate run are the authority instead. Apps, bots, tag pushes, and dispatch payloads grant no authority.
- **Validation before the click.** Preparation dispatches `release-candidate.yml`, a default-branch wrapper that calls `publish.yml` in `candidate` mode on the bound source with the stable version stamped and the draft's generated note. Candidate mode runs the documentation review and the complete `full-release` suite on every publication lane with startup budgets enforced, and skips every npm, asset, and `master` job. The command reuses a running or successful candidate run for the same source and version, prints its link, and exits. Publication requires a successful candidate run for the exact source and version, then repacks with the published body and reruns only `package-contracts`, `package-smoke`, `package-startup`, and `package-install` on the final bytes.
- **Return to draft.** If publication fails or is cancelled, the `rollback` job runs `scripts/release/rollback-publication.mjs` from `develop`. It returns the Release to draft and then deletes the tag only when both npm versions are absent, no npm upload step started in any attempt of the run, the complete job listing was read, and the tag is a lightweight tag at the bound source. A started upload keeps both, because npm ingests provenance uploads asynchronously and a 404 does not prove rejection. Otherwise the Release and tag stay and the maintainer reruns failed jobs; the final registry check makes the rerun an exact-byte no-op for an already-published package. A rerun after rollback fails at the pre-npm published-body check, so it cannot publish from a draft.
- **Tag deletion authority.** The `a1-protect-release-tags` ruleset blocks deletion with no bypass, and `GITHUB_TOKEN` cannot bypass it. The ruleset now declares exactly one bypass actor, the existing `openspec-ci` App (ID `4942462`, already used for reopening), with `always` mode. The rollback job mints its token with only `permission-contents: write`. Governance validation rejects any branch bypass, a second or non-App tag bypass, or another bypass mode.
- **Reopening.** After npm, asset, and `master` succeed, the same workflow creates or exactly reuses `chore/release-<next>-dev`, unchanged from today, and never merges it. It reads version, source, and note digest from `publish.yml`'s new `workflow_call` outputs and the approved-note artifact of the same run.
- **Removed.** Save-draft polling and its one-second arming window, `dispatchStableStaging`, `approve-release.yml`, the `a1-stable-release-reviewed` event, and the `a1-stable-staging-v1.json` receipt with its validator. `finalize-release.yml` becomes the publisher trigger rather than a verifier.

## Risks / Trade-offs

- A published Release and tag are visible for the few minutes publication takes, and briefly after a failure until the rollback job runs. Mitigation: publication after the click is limited to exact-package gates, and rollback is automatic when npm is untouched.
- A GitHub notification or watcher may observe a Release that later returns to draft. Accepted as the cost of the native button being the trigger.
- The edited note is not covered by the full suite. Mitigation: the note is validated by the packaged-release-note gate and exact-package gates on the final bytes.
- Deleting an unconsumed tag relaxes an existing rule. It remains limited to one App, requires both packages absent and no upload started, and never repoints a tag.
- The release event runs the wrapper file from the tag commit rather than `develop`. That commit is the bound `develop` source, and the wrapper only selects the `@develop` publisher, which re-derives every identity.

## Migration Plan

Land the change while no stable draft is open. `approve-release.yml` and the receipt code are removed in the same pull request. `publish.yml` remains the npm publisher, so npm trusted-publisher settings are unchanged. After merge, a maintainer applies the reviewed tag-ruleset bypass (`node scripts/governance/check-github-repository-governance.mjs --apply --confirm apply-a1-github-governance`) before the first stable release; until then, rollback returns the Release to draft but its tag deletion fails visibly and needs that apply and a rerun of the rollback job.

## Resolved Questions

- Exact-package gates are sufficient after the click. The note is data rendered by the packaged-release-note path, which those gates exercise on the final bytes, and the source already passed the full suite in candidate validation.
- The validation run link is printed only in command output. The draft body is the packaged note, so an automation comment there would ship to users.

## Evidence

- `npm run release` now prepares or reuses the draft, starts or reuses candidate validation, prints the draft and run links, and exits. Save-draft polling, staging dispatch, and receipt resumption are removed, and existing npm versions are refused.
- `publish.yml` gained `candidate` mode and release-event `stable` mode. `stable` binds tag, source, version, Release, and body, requires the successful candidate run, runs exact-package gates, guards the published body immediately before npm, and completes asset upload and `master` without a receipt. `workflow_call` outputs feed reopening.
- `finalize-release.yml` identifies the Release, calls the publisher, rolls back through `rollback-publication.mjs` on failure, and prepares reopening on success. `release-candidate.yml` is new, and `approve-release.yml`, `staging-receipt.mjs`, and its test are deleted.
- Governance declares the single tag bypass and the new workflow inventory. Inference recognizes `stable-release-candidate-validation`, `stable-release-publication`, and contents-scoped `unconsumed-release-tag-rollback`. All 14 declared workflows match inferred local state.
- Focused tests: the release command, publication client, approval and candidate-run gating, rollback planning, rulesets, governance, pipeline policy, runbook, target, and full-regression policy suites pass. The full `test/repository-governance` directory passed except load-sensitive suites (local cleanup, naming selection, startup descriptor, development replay, and terminal architecture), which pass when run alone or require a build.
- `tsgo -p tsconfig.json --noEmit`, YAML parsing of the three edited workflows, `node scripts/release/check-release-documentation.mjs`, and `git diff --check` pass.
- No live stable draft, candidate run, npm package, tag, ruleset change, or reopening PR was created during implementation. The live ruleset bypass and the first native publication remain post-merge operations.
