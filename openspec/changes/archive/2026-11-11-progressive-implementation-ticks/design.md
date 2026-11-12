# Design

## Cause

Three things let ticks slide to the end. The entry file the A1 runtime loads says only "keep delivery progress truthful". Outcomes are implemented together, so no moment separates one from the next. Detailed task groups do not follow the pull request's outcomes, so an agent cannot tell when one outcome's bookkeeping is complete.

## Rule

One paragraph, owned by `AGENTS.md` and byte-identical in XR Build:

- **Plan:** `tasks.md` has one task group per `## Implementation` outcome, in the same order.
- **Implement:** one outcome at a time: write its code and tests, tick its tasks, commit and push, then tick that outcome in the PR body before starting the next.
- **Meaning:** a tick means written code and tests. CI, broad test runs, and manual validation never delay it; a later defect is fixed in a new commit.

The commit and push per outcome is what makes the rule observable: the maintainer sees a commit followed by a tick. It adds no gate. The existing targeted pre-push checks, the final-item preparation (Acceptance, reconciliation, body check), automated readiness, and finalization are unchanged. A single-outcome change ticks once, at its end. Generated proposals keep their fixed outcomes and tick each as its work completes.

## One owner

`CLAUDE.md` becomes `@AGENTS.md`, the Claude Code import, so both runtimes load the same file and the duplicated attribution, user-command, and delivery sections disappear. Its merge-route and readiness sentences already live in the delivery skill and runbook. The skill's checklist refers to the paragraph instead of restating it. The runbook keeps the detailed lifecycle and is aligned, not expanded.

## Regression boundary

The guidance test requires the exact paragraph in `AGENTS.md`, the skill's reference to it, and `CLAUDE.md` importing `AGENTS.md` without its own delivery wording.

## Authorization

The maintainer reviewed the presented analysis and four-part fix and asked for it to be implemented in A1 and XR Build as two pull requests. Integration remains a separate maintainer decision.
