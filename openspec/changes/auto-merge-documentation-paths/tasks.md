## 1. Expand the trusted documentation classification

- [x] 1.1 Add `docs/**` to the exact documentation auto-merge classifier while preserving root `README.md`, `openspec/**`, malformed-path rejection, complete pagination, and both-side rename classification
- [x] 1.2 Extend focused classifier tests for docs-only, OpenSpec-plus-docs, README-plus-docs, nested README, renamed operational files, and mixed source/test/script/workflow/configuration paths
- [x] 1.3 Verify the trusted workflow continues to check out default-branch policy and requires same-repository, non-draft, `develop`-targeted pull requests

## 2. Preserve validation and manual code acceptance

- [x] 2.1 Verify every eligible documentation combination runs documentation-sensitive governance and strict OpenSpec validation when OpenSpec is touched before `Development validation required` succeeds
- [x] 2.2 Preserve current-head validation matching, expected-SHA direct merge, stale-head rejection, failure behavior, and synchronous exact-head branch cleanup
- [x] 2.3 Verify any changed or renamed-from path outside `openspec/**`, `docs/**`, or root `README.md` disables auto-merge and leaves the pull request on the manual code/operational path

## 3. Align maintained policy guidance

- [x] 3.1 Update OpenSpec delivery context and repository guidance to name `openspec/**`, `docs/**`, and root `README.md` as the complete auto-merge allowlist
- [x] 3.2 Keep source, tests, scripts, workflows, non-OpenSpec configuration, generated baselines, and arbitrary root Markdown explicitly manual

## 4. Deliver and accept separately

- [x] 4.1 After this specification pull request merges and the user explicitly requests implementation, fetch updated `origin/develop` and create the detached implementation worktree at `{working-dir}/.worktrees/implement-documentation-auto-merge`
- [ ] 4.2 Deliver classifier, tests, and guidance in a separate code/operational pull request with auto-merge disabled; run focused governance tests and required GitHub development validation
- [ ] 4.3 After maintainer acceptance and explicit manual merge, re-trigger or recreate a `docs/**` pull request and verify successful current-head validation causes automatic squash integration and exact-head remote branch cleanup
- [ ] 4.4 Record live acceptance and archive this OpenSpec change in a separate specification-only follow-up
