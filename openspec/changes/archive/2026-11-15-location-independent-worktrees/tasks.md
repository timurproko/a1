## 1. Location-independent worktrees with trusted project-context transitions

- [x] 1.1 Separate startup fallback from explicitly selected repository/worktree identity, preserving atomic claim ownership and invalid-attachment recovery.
- [x] 1.2 Add cwd-independent sequential worktree controls and explicit repository selection to the CLI while retaining aliases, exclusions, and overrides.
- [x] 1.3 Recreate target Pi resources only after trust resolution at a safe execution boundary, retaining conversation, writer ownership, and host bindings; preserve prior context on failure.
- [x] 1.4 Bind completion cleanup to the selected repository primary checkout independently from the startup return directory.
- [x] 1.5 Add focused lifecycle, command, composition, and Pi runtime regression tests and update the maintained worktree contract and guidance.
