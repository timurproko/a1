## 1. Write the rule down

- [x] 1.1 Rewrite the validation policy in `openspec/config.yaml`: read the result before
  starting anything else, treat a red pull request as the next task, report what CI said,
  and deal with a failure that is not this change's doing rather than routing around it
- [x] 1.2 State when auto-merge is armed and when a pull request waits for manual acceptance

## 2. Make the check gate the merge

- [x] 2.1 Protect `develop` so the required development validation check must pass before a
  merge, and confirm a pull request cannot be merged while it is red
- [ ] 2.2 Arm auto-merge on this pull request as the first use of the rule, and confirm it
  lands on its own when validation passes

## 3. Validate and integrate

- [x] 3.1 `openspec validate --strict` passes
- [ ] 3.2 Open the pull request and let CI validate
