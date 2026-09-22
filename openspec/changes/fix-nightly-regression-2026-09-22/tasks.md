## 1. Consolidate and reproduce

- [x] 1.1 Compare the original Full regression, Release, and develop publication logs and identify the failed commands and introducing changes or environmental uncertainty.
- [x] 1.2 Record the maintainer-approved consolidation and both nightly failure records in #536; reconcile current develop.
- [x] 1.3 Close planning-only #538 as superseded after the consolidated evidence is pushed; retain its remote branch.
- [x] 1.4 Reproduce the owned-theme mismatch with deterministic color-mode coverage and recheck the public API baseline using current pinned dependencies.

## 2. Repair

- [x] 2.1 Explicitly prepare and verify Rust before release and Full regression builds.
- [x] 2.2 Preserve distinct missing, timeout, spawn, exit, and invalid-version probe diagnostics with hermetic tests and unchanged deadlines.
- [x] 2.3 Repair owned selector theme consistency without changing pinned comparison behavior; update derived governance records.
- [x] 2.4 Investigate and resolve or explicitly disposition the Windows update-CLI setup timeout without weakening isolation, assertions, or deadlines.
- [x] 2.5 Run focused tests, build/typecheck, and affected governance checks.

## 3. Prove

- [ ] 3.1 Dispatch Full regression on the completed fix head and record the passing run number, exact head, and all platform/runtime outcomes in design.md.
- [ ] 3.2 Complete evidence, gap disposition, and acceptance scenarios for automated finalization and required exact-head CI in this PR.
