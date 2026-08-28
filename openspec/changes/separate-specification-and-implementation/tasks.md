## 1. Persist the delivery policy

- [x] 1.1 Add repository-level agent guidance that reproduces the specification-only stream, fresh implementation stream, path allowlist, and manual code acceptance rules
- [x] 1.2 Update contributor or workflow documentation so maintainers can distinguish specification acceptance, CI success, local code acceptance, and manual integration

## 2. Enforce auto-merge eligibility

- [x] 2.1 Add one reusable pull-request path classifier whose allowlist is exactly `openspec/**` and root `README.md`
- [x] 2.2 Add focused tests proving OpenSpec/README-only changes are eligible while source, tests, scripts, configuration, workflows, baselines, and mixed changes are not
- [x] 2.3 Add a GitHub guard that fails closed and prevents or disables auto-merge for every ineligible pull request without blocking its later manual merge

## 3. Deliver the implementation separately

- [x] 3.1 After this specification pull request merges and the user explicitly requests implementation, create a fresh worktree and branch from updated `origin/develop`
- [x] 3.2 Open a separate code/operational pull request citing this OpenSpec change and leave auto-merge disabled
- [ ] 3.3 Provide exact local validation instructions and leave the pull request open until the maintainer reports acceptance
- [ ] 3.4 Merge manually only after explicit maintainer authorization, then report the merge result
