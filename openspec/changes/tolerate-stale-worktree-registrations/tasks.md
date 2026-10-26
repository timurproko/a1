## 1. Tolerant inventory

- [ ] 1.1 Classify registered worktrees whose directory or `.git` pointer is missing as stale during inventory listing and report them as `unverifiable` with Git's recorded path and branch.
- [ ] 1.2 Add a regression that deletes one registered worktree, lists the inventory, and verifies the live worktree stays `current` while the stale one is `unverifiable`.

## 2. Delivery

- [ ] 2.1 Complete typecheck, the touched test, and strict change validation; reconcile and push current develop before the final implementation marker.
