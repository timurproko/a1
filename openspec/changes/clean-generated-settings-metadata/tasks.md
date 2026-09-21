## 1. Generated metadata lifecycle

- [ ] 1.1 Return an exact-path teardown from the Pi settings metadata Vitest setup; verify focused metadata lifecycle coverage proves the generated source file is removed after use.
- [ ] 1.2 Add `src/integrations/pi/engine/pi-settings-metadata.json` to the central completed-delivery disposable policy and document it; verify the standard policy exposes the exact path.

## 2. Fail-closed cleanup coverage

- [ ] 2.1 Extend cleanup fixtures for an eligible worktree containing the exact metadata artifact; verify repository-owned cleanup removes it through the ordinary bounded path.
- [ ] 2.2 Add near-match and unrelated-content regression cases; verify cleanup still blocks content not named by the exact central policy.

## 3. Validation and completion

- [ ] 3.1 Run strict OpenSpec validation and focused metadata/cleanup governance tests without prohibited local full suites; record any actual gap explicitly.
- [ ] 3.2 Reconcile current `develop`, finalize the accepted change, and hand off the exact validated PR for authorized manual merge.
- [ ] 3.3 After merge, run exact-candidate cleanup for PR #529 and verify its worktree and local branch are removed by repository tooling.
