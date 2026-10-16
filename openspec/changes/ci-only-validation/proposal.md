## Why

Agents must run `npm run preflight` before every push, which repeats the gates CI runs anyway and takes many minutes on a wide change. The maintainer wants CI to be the validation authority: a draft is unfinished implementation, and CI validates the candidate once the last Implementation item is checked and the pull request becomes ready.

## What Changes

- Agents no longer run preflight or broad test suites before pushing.
- Before pushing, agents run only quick targeted checks for what they touched: the type check, the test files covering changed code, and strict validation of the OpenSpec change.
- Exact-head CI after readiness is the validation authority. A CI failure is fixed by a further push to the same pull request and revalidated there.
- `npm run preflight` stays available as an optional tool for reproducing a failure CI reported.
- The delivery skill, project workflow context, and validation guide state the targeted checks instead of the preflight step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: agents push after quick targeted checks and rely on post-readiness CI.
- `project-structure-governance`: preflight is optional rather than a pre-push gate.

## Impact

Agent guidance in `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, and `docs/validation.md`. No workflow, script, or product code changes; CI still skips drafts.
