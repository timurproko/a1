## 1. Admit Exact Disposable-Root Links Safely

- [x] 1.1 Extend bounded worktree inspection to classify only a link whose lexical path exactly equals a central-policy disposable root, record its link fingerprint and canonical target without traversing it, and verify focused inspection fixtures reject broken, cyclic, near-match, and unapproved root links.
- [x] 1.2 Extend purge revalidation to distinguish root and descendant link records, require unchanged path/classification/fingerprint/target, remove an accepted root link only through the existing non-recursive primitive, and verify drift or replacement fails before journal transition.
- [x] 1.3 Preserve descendant-link containment and ordinary directory/file removal behavior; verify existing escape, nested-repository, generated-content allowance, lock, deadline, ownership, and identity fixtures remain green.

## 2. Prove External Targets Survive

- [x] 2.1 Add a destructive cross-platform fixture that links an exact disposable root to an external sentinel, completes ordinary cleanup, and verifies the worktree/link disappear while the external target and sentinel bytes remain unchanged.
- [x] 2.2 Add Windows coverage using an actual directory junction and verify the same non-traversal and target-preservation result; explicitly skip only the Windows-specific assertion on other platforms.
- [x] 2.3 Add pre-purge link identity/target drift and removal-failure fixtures and verify cleanup reports the named blocker without mutating the external target or advancing the removal journal.

## 3. Align Guidance and Validate

- [x] 3.1 Update `docs/local-worktree-cleanup.md` to document exact-root link admission, non-recursive removal, target preservation, and unchanged manual-unlink prohibition; verify guidance governance tests cover the contract.
- [x] 3.2 Run the focused cleanup suite, strict OpenSpec validation, architecture and changed-documentation checks, and diff checks; record outcomes and known-gap disposition in `evidence/validation.md`.
