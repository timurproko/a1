## Why

Agents must run `npm run preflight` before every push, which repeats the gates CI runs anyway and takes many minutes on a wide change. The maintainer wants CI to be the only validation: a draft is unfinished implementation, and CI validates the candidate once the last Implementation item is checked and the pull request becomes ready.

## What Changes

- Agents no longer run preflight or other local test suites before pushing; they push implementation directly and check items as outcomes are written.
- Exact-head CI after readiness is the only validation an implementation needs. A CI failure is fixed by a further push to the same pull request and revalidated there.
- `npm run preflight` stays available as an optional debugging tool that nothing requires.
- The delivery skill, project workflow context, and validation guide stop telling agents to run preflight before pushing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: agents deliver without local validation and rely on post-readiness CI.
- `project-structure-governance`: preflight is optional rather than a pre-push gate.

## Impact

Agent guidance in `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, and `docs/validation.md`. No workflow, script, or product code changes; CI still skips drafts.
