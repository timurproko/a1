## Why

PR #773 had every Implementation item checked but stayed draft. One Acceptance bullet contained `<job>`, which the checklist validator rejects as markup. The `OpenSpec finalization` run still finished green with `disposition: skipped`, and the reason `draft-acceptance-checklist-item` appeared only in its log and step summary. Nothing on the pull request showed that it was stuck or why, and nothing let the author check the body before ticking the final item.

## What Changes

- Fail the finalization run with an error annotation naming the stable reason when a draft has every Implementation item checked but promotion is refused for a body, task, evidence, or other content defect. Unfinished drafts, retries, and infrastructure skips stay green as today.
- Add `scripts/governance/check-delivery-body.mjs`, which runs the same version-3 body validators locally against a body file or a pull request and prints the stable reason for any defect.
- Tell agents to run that check before checking the final Implementation item, and document in the runbook that Implementation and Acceptance items reject angle-bracket placeholders, HTML, URLs, and `@` mentions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: a fully checked draft refused for promotion fails visibly, and agents can verify a delivery body before the final checkbox.

## Impact

`scripts/governance/openspec-finalization-publication.mjs`, `scripts/governance/publish-openspec-finalization.mjs`, a new `scripts/governance/check-delivery-body.mjs`, their governance tests, `.agents/skills/change-delivery/SKILL.md`, and `docs/openspec-archive-automation.md`. Promotion rules, validators, and the ready mutation stay the same.
