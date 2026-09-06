## 1. Windows cleanup policy

- [ ] 1.1 Add the Pi-integration-owned NUL cleanup extension helper with injected platform and filesystem boundaries; verify focused unit tests cover session-start cleanup, working-directory cleanup after tool results, simple quoted/unquoted Bash `cd` targets, write/edit target parents, deduplication, and regular-file-only deletion
- [ ] 1.2 Add failure-isolation and platform tests proving missing paths, non-files, symbolic links, inspection failures, deletion failures, and concurrent not-found races do not alter lifecycle outcomes, while non-Windows construction performs no cleanup operations

## 2. Runtime integration

- [ ] 2.1 Register the cleanup as a named inline extension through the documented resource-loader options for every Windows cwd-bound service construction, without writing profile content; verify focused runtime integration tests cover initial creation and session replacement while preserving existing user extensions
- [ ] 2.2 Extend Pi capability/conformance coverage as needed so the inline extension path remains a validated public SDK dependency and verify the focused conformance tests pass

## 3. Validation and acceptance

- [ ] 3.1 Run the applicable focused tests and typecheck, then push the implementation PR and verify its required CI check passes
- [ ] 3.2 On Windows, launch the implementation worktree through the required `./scripts/dev` path, exercise Bash plus write/edit operations that leave `nul` in the active, changed, and target directories, and confirm no regular `nul` artifact remains after each tool result while ordinary tool output is unchanged
