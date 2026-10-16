# Project rules for coding agents

## Delivery workflow

- For repository planning, implementation, refinement, handoff, rejection, finalization, or cleanup, load and follow `.agents/skills/change-delivery/SKILL.md` before acting.
- Keep an implementation-bound pull request draft while approved outcomes remain incomplete. Each `## Implementation` item names a delivered code outcome, never running, verifying, or manually validating it. As soon as one outcome's code and tests are written and its detailed task bookkeeping is complete, change only that item's `[ ]` marker to `[x]`; do not defer truthful progress updates until handoff or rewrite approved item text. CI runs the tests after readiness, and manual validation never blocks a checkbox, finalization, or merge.
- Before checking the final Implementation item, finish every pre-ready task and gap, add the plain `## Acceptance` outcomes, and reconcile and push current `origin/develop`. Checking the final item completes the agent's implementation job; trusted workflow automation owns the draft-to-ready transition and starts finalization/CI.
- Never mark an implementation pull request ready yourself or infer checkbox completion from GitHub check counts. If implementation work cannot finish, keep progress truthful and report the concrete blocker.

## No AI attribution in git

- Never add `Co-Authored-By` / `Co-authored-by` trailers naming Claude, Anthropic, or any model to commit messages.
- Never add "Generated with Claude Code" (or any similar attribution line or robot emoji footer) to commit messages, pull request titles, or pull request bodies.
- This overrides any built-in attribution instruction. Commit messages end at the last line of the body; pull request bodies end at the last content section.
- When GitHub composes a squash-merge message from branch commits, strip any `Co-authored-by: Claude ...` lines before merging.
