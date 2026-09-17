## 1. Nothing-Left Retirement

- [x] 1.1 In `scripts/governance/local-cleanup-reconcile.mjs`, when a released entry's evidence is not `eligible`, check locally that the path is absent, Git holds no row (or only the candidate's own prunable row, which is retired), and the local topic ref is absent; then confirm through the reader that the pull request is merged into `develop` in this repository and mark the entry `done` / `complete` with `retired-nothing-left` and the original evidence reason. Any present path, row, or ref leaves the ordinary blocked result.
- [x] 1.2 Extend the state schema with the completion note so `status` and reports show `retired-nothing-left` and `forgotten` alongside `complete`.
- [x] 1.3 Fixtures: a released entry with absent path and ref and a merged PR is retired during a sweep and reported once; an entry with an absent path but present ref stays `blocked` and keeps the ref; an unmerged PR is not retired; `complete` for the exact candidate retires the same way.

## 2. Explicit Forget

- [x] 2.1 Add `forget --id ID --confirm-nothing-left` to `local-worktree-cleanup.mjs`: under the mutation lock, require a released or blocked entry whose path, Git row, and local ref are all absent, record `forgotten`, and never read GitHub or delete anything; refuse `owned` and `deleting` entries and any present leftover.
- [x] 2.2 Fixtures: forget succeeds on an all-absent closed-unmerged entry; refuses without the flag, with a present ref, and for an owned entry.

## 3. Up-To-Date Base

- [x] 3.1 Set `strict_required_status_checks_policy` to true for `a1-protect-develop` in `config/github-repository-governance.json` and update the governance specification, `docs/local-worktree-cleanup.md`, `openspec/config.yaml`, and the change-delivery skill: when a PR shows `BEHIND`, update the branch, let the workflow re-finalize, and hand off again.
- [x] 3.2 Run `check-github-repository-governance.mjs --check` and record the single expected difference (`rulesets.a1-protect-develop`); the maintainer applies the definition after merge with `--apply --confirm apply-a1-github-governance`.

## 4. Evidence

- [x] 4.1 Run the focused cleanup fixtures, the guidance and governance vitest bridges, typechecking, and the governance commands; record outcomes, including the live sweep that retires #452 and #461.
