## 1. Retire the automatic comparison

- [x] 1.1 Delete the parity runner, scenario, comparator, and terminal session capture
- [x] 1.2 Delete the governance tests that tested the gate, and the npm command that ran it
- [x] 1.3 Remove the CI job that ran it, and the architecture rule that pinned its command shape
- [x] 1.4 Decouple the pinned modal inventory from the parity scenario, keeping its own checks
- [ ] 1.5 Update the specification: parity is established by the reader comparing `a1 pi` with pinned Pi

## 2. Give every launch form one pipeline

- [x] 2.1 Select the owned runtime for all three profiles, withholding A1's surfaces for `pi` and `sandbox`
- [x] 2.2 Delete the transparent attachment path and its composition entry
- [x] 2.3 Update the launch, dispatch, boundary, and colour-fidelity tests to the single pipeline
- [ ] 2.4 Update the specification: one rendering pipeline, differing by configuration root and surfaces

## 3. Remove the worktree cleanup command

- [x] 3.1 Delete the cleanup script and its test
- [ ] 3.2 Remove its mention from the workflow context, so worktrees are removed deliberately

## 4. Validate and accept

- [ ] 4.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 4.2 Open the pull request and let CI validate
- [ ] 4.3 Record manual acceptance — `a1`, `a1 pi`, and `a1 sandbox` each open and read their own profile — then archive
