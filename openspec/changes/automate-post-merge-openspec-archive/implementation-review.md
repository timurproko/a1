# Reconciliation of PR #376 with revision #378

The maintainer explicitly authorized reconciliation of the existing implementation PR with the revised plan. The same detached worktree, topic branch, history, and PR are retained. This authorization is neither final code acceptance, merge authorization, App provisioning, nor live lifecycle acceptance.

## Gap review before implementation

- **Delivery boundary:** the earlier config/runbook requires a separate merged plan. Replace that rule for new changes with one draft PR, explicit approval before code, coherent same-PR refinements, and manual final integration. Preserve the explicit legacy path for already-merged plans, including #362/#376.
- **Documentation hold:** the existing merge owner checks paths and draft state but does not detect implementation association or new active changes after a marker is removed. Add fail-closed lifecycle classification using complete diff plus authoritative base/head trees, disable armed merges, and reconcile body edits. Ordinary docs, existing-change standalone revisions, and archive moves remain eligible.
- **Metadata:** current parsing accepts only version 1 and requires `specificationPr`. Add minimal version 2, validate its accepted-source and merge-result change identity, and retain version-1 historical ancestry checks. Acceptance remains exact-head, maintainer-authored evidence, never inferred from approval-to-implement or merge.
- **Skills:** this checkout has no tracked first-party delivery skill; `.pi/` is local ignored workspace configuration. Add a discoverable repository-owned `.agents/skills/change-delivery/SKILL.md`, without editing external/global or vendor skills.
- **Live acceptance:** new tasks additionally require a single-PR draft/approval/refinement lifecycle, ready-but-unimplemented hold, rejected draft, and ordinary-docs control case. These cannot be claimed from local fixtures and remain pending authorized deployment/setup and recorded maintainer acceptance.

## Retained evidence, not transferred completion

The original implementation at `98c4503f` passed 198 focused tests, typecheck, changed-file documentation governance, and strict OpenSpec validation locally. The earlier CI failure was the lightweight docs-job guard; its correction retained the assertion and installed only pinned OpenSpec tooling. Development validation did not run for `98c4503f` because #378 caused a merge conflict in the task list.

The revised checklist replaces the old task numbering. Old checked tasks are not copied onto new requirements. Existing synchronization, publication, concurrency, recovery, and dry-run implementations will be reassessed with the revised regression suite. The original verification record remains available in commit `98c4503f`; no historical acceptance or CI outcome is rewritten.
