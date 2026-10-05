# Tasks

## 1. Specify the relocation boundary

- [ ] 1.1 Add a fixture for a cleanup state carried from one repository root/drive to another with terminal entries only.
- [ ] 1.2 Add negative fixtures for active or partial entries, repository/remote mismatch, malformed topology, path escape, duplicate rebased paths, and replacement failure.

## 2. Migrate terminal cleanup history safely

- [ ] 2.1 Validate the prior journal against its recorded identity before considering relocation.
- [ ] 2.2 Under the existing repository mutation lock, rebase only terminal entry paths and repository path identity onto the currently discovered canonical paths.
- [ ] 2.3 Validate the transformed journal and replace it atomically without changing queue settings, lifecycle identity, ownership/audit fields, or any Git/filesystem resource.
- [ ] 2.4 Preserve fail-closed behavior for read-only access and every state that still carries cleanup authority or partial progress.
- [ ] 2.5 Document drive/path relocation recovery and its terminal-only boundary.

## 3. Validate and deliver

- [ ] 3.1 Run dependency-free cleanup fixtures, focused governance tests, strict OpenSpec validation, changed-documentation checks, architecture checks, and diff checks.
- [ ] 3.2 Reconcile current `origin/develop`, complete evidence and known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
- [ ] 3.3 After merge, rerun the exact completion command for `support-cleanup-origin-rewrites` and report only authoritative cleanup output.
