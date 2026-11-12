# Implementation evidence

## Delivered behavior

- `AGENTS.md` holds one `Implementation progress` paragraph: one task group per outcome, one outcome at a time, and a PR-body tick after that outcome's push and before the next one starts. It also says agents never mark an implementation PR ready.
- `CLAUDE.md` is the single line `@AGENTS.md`, so Claude Code and the A1 runtime load the same rules; the duplicated attribution, user-command, and delivery sections are gone.
- The delivery skill checklist refers to the paragraph. The runbook's planning and same-PR implementation steps name the task-group and commit, push, tick order.
- The guidance test requires the exact paragraph, the runbook wording, the import, and the skill reference without a second copy.
- This delivery followed the rule: each of its two outcomes was pushed in its own commit and ticked before the next began.

## Focused local validation

- `delivery-guidance` and `worktree-agent-guidance` Vitest files passed.
- The source type check (`tsgo -p tsconfig.json --noEmit`) and strict validation of `progressive-implementation-ticks` passed; `git diff --check` passed. The launcher type check needs a built `dist` and was not run; no launcher or source code changed.

## Known-gap disposition

No remaining implementation gaps. The rule is guidance: no automation rejects ticks made together, so its effect shows in pull-request history rather than in a check. Sessions that already loaded the old instructions keep them until restarted. The merge-route and readiness sentences removed from `CLAUDE.md` remain in the delivery skill and runbook. XR Build receives the same paragraph through its own pull request. Remote exact-head validation and integration remain pending trusted automation and the maintainer decision.
