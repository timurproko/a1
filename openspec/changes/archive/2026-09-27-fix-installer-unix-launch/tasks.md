## 1. Entrypoint regression coverage

- [x] 1.1 Add process-level coverage that invokes the installer through a disposable Unix file symlink with `--help`; verify status `0`, the exact help bytes, and empty stderr, with the original `.591` native failures retaining the negative control against unresolved lexical entry checks.
- [x] 1.2 Add an independent import-safety assertion; verify an ordinary ESM importer emits only its own output, starts no installation, and retains a successful process verdict.

## 2. Canonical launcher execution

- [x] 2.1 Canonicalize the argv entry and module file identities for direct-invocation detection, with only the existing lexical comparison as a bounded failure fallback; verify direct file and Windows npm-shim execution locally while retaining Unix symlink execution as required native CI evidence, and keep imports inert.
- [x] 2.2 Preserve the dependency-free built-in-only package and exact command/output behavior; verify no package metadata, target resolution, progress, failure vocabulary, or installation workflow changes.

## 3. Validation and delivery

- [x] 3.1 Run focused installer bootstrap coverage, locally packed exact-package validation, typechecking, changed-code documentation governance, and strict OpenSpec validation; record the Windows-only local symlink gap without weakening assertions or substituting a rebuilt publication artifact.
- [x] 3.2 Reconcile current `origin/develop`, complete implementation evidence and known-gap disposition, and prepare implementation-specific acceptance scenarios for the same PR.
- [x] 3.3 Keep native Windows, Linux, and macOS exact-package validation mandatory for the finalized head before manual merge handoff; verify no workflow skip, retry, or assertion relaxation is introduced and the rejected `.591` artifact remains unpublished.
- [x] 3.4 Preserve the post-merge requirement for a newly numbered development publication; verify the package remains absent and document that one-time npm bootstrap may proceed only after every native package lane passes.
