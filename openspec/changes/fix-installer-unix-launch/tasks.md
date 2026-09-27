## 1. Entrypoint regression coverage

- [ ] 1.1 Add process-level coverage that invokes the installer through a disposable Unix file symlink with `--help`; verify status `0`, the exact help bytes, and empty stderr, and demonstrate that the assertion fails against the unresolved lexical entry check.
- [ ] 1.2 Add or retain an independent import-safety assertion; verify importing installer helpers emits no output, starts no installation, and does not change the process verdict.

## 2. Canonical launcher execution

- [ ] 2.1 Canonicalize the argv entry and module file identities for direct-invocation detection, with only the existing lexical comparison as a bounded failure fallback; verify direct file, Unix symlink, and Windows npm-shim paths execute while imports remain inert.
- [ ] 2.2 Preserve the dependency-free built-in-only package and exact command/output behavior; verify no package metadata, target resolution, progress, failure vocabulary, or installation workflow changes.

## 3. Validation and delivery

- [ ] 3.1 Run the focused installer bootstrap and exact-package validation appropriate to the local platform plus strict OpenSpec validation; record results and any native-platform gap without weakening assertions or substituting a rebuilt publication artifact.
- [ ] 3.2 Reconcile current `origin/develop`, complete implementation evidence and known-gap disposition, add implementation-specific acceptance bullets, and mark the same PR ready for trusted finalization and exact-head CI.
- [ ] 3.3 Require successful native Windows, Linux, and macOS exact-package validation for the finalized head before manual merge handoff; do not publish the rejected `.591` artifact.
- [ ] 3.4 After authorized manual merge, request a newly numbered development publication and verify all native package lanes before performing the one-time npm bootstrap publication.
