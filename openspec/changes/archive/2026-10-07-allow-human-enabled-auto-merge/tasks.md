## 1. Model Authorized Human Integration Provenance

- [x] 1.1 Generalize the shared acceptance merge verifier to distinguish direct manual merge, disabled auto-merge attempts followed by manual merge, and active native auto-merge armed by the same authorized human; verify exact merge identity/time, final-head timeline ordering, actor permission, and absence of merge-queue or App/Bot authority.
- [x] 1.2 Update every version-3 and applicable legacy GitHub reader/type declaration to consume the shared decision and attribute acceptance to the human actor; verify status, archive audit, and cleanup use one result without mutating historical records.
- [x] 1.3 Add policy and GitHub-reader fixtures for valid manual, PR-#709-shaped enable/disable/manual, valid human auto-merge, stale-head arm, later-disable ambiguity, mismatched actors, bots/Apps, merge queue, malformed fields, and insufficient permission; verify focused suites fail closed outside the two authorized routes.

## 2. Preserve Human Arms Without Granting Automation Authority

- [x] 2.1 Update documentation auto-merge enforcement to recognize a finalized same-repository version-3 PR armed by an authorized human, leave that arm intact, and never invoke the enable or merge mutation for implementation-bound work; verify documentation and release-reopening routes remain unchanged.
- [x] 2.2 Disable or reject a human arm after synchronize, finalization/body change, draft conversion, malformed lifecycle data, stale head, unauthorized actor, or ambiguous timeline evidence; verify the maintainer must arm the new candidate again.
- [x] 2.3 Extend documentation-manager and workflow fixtures to cover human preservation, stale-arm disabling, automated-arm refusal, and unchanged documentation integration behavior.

## 3. Align Delivery Guidance and Durable Wording

- [x] 3.1 Update delivery configuration, agent/runbook guidance, acceptance status text, and conditional-manifest wording so maintainers may choose manual merge or personally enabled exact-head auto-merge while agents, Apps, bots, merge queue, and repository automation remain forbidden from arming implementation PRs; verify guidance governance tests enforce the distinction.
- [x] 3.2 Update affected declarations and code documentation, preserving legacy manual-acceptance wording where its lifecycle remains unchanged; verify changed-documentation and type checks pass.

## 4. Validate Historical Recovery and Policy Safety

- [x] 4.1 Run the candidate shared reader against merged PR #709 and record an `accepted-and-archived` dry-run result from its immutable enable/disable/manual timeline without editing the PR, archive, manifest, or `develop`.
- [x] 4.2 Run focused governance suites, strict OpenSpec validation, architecture checks, and diff checks; record results and explicit known-gap disposition in `evidence/validation.md`.
- [x] 4.3 Record the bootstrap handoff constraint that this policy PR must be manually merged under the currently deployed rule and that #709 cleanup occurs only after the new policy is integrated and re-verifies from `develop`; verify no task or evidence claims either post-merge outcome early.
