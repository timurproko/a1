# Tasks

## 1. Resolve an effective Windows native environment

- [x] 1.1 Add a dependency-free native environment resolver with injected probes and pure decisions for explicit Rust overrides, `PATH`, Rustup's canonical Windows location, initialized MSVC environments, and complete Visual Studio C++ workload discovery. Capture `vcvars64.bat` output behind a sentinel, keep the imported environment private, and leave non-Windows callers unchanged.
- [x] 1.2 Cover valid and invalid overrides, canonical Rustup fallback, initialized and discovered Visual Studio installations, stable selection, missing workloads/SDK state, malformed or timed-out probes, Git Bash linker shadowing, no secret-bearing output, and non-Windows pass-through with hermetic tests.

## 2. Diagnose every native prerequisite before compilation

- [x] 2.1 Extend the environment observation and prerequisite contract with the effective Rust source and blocking Windows C++ readiness. Make `npm run doctor` distinguish ready, auto-initialized, workload-missing, installation-missing, and probe-failed states while reporting all blockers in one ordered remediation sequence.
- [x] 2.2 Document that Visual Studio Code is not required, that Windows needs Rustup plus the Visual Studio Desktop development with C++ workload and SDK, and that rerunning plain `npm run build` after explicit installation is sufficient. Update prerequisite tests and documentation governance fixtures.

## 3. Use the effective environment for ordinary builds

- [x] 3.1 Add dependency-free build orchestration that resolves and validates the environment before `clean` or compilation, then passes it to every existing managed and native stage without changing public npm command names or target arguments.
- [x] 3.2 Make direct process-guardian and terminal-host build entries use the same resolver when called independently, preserving explicit tool overrides, CI environments, and non-Windows behavior. Add wiring tests and retain the existing artifact, manifest, notices, and resident-ready verification coverage.

## 4. Delivery evidence

- [ ] 4.1 Record focused prerequisite/resolver/build-entry results, typecheck and governance results, strict OpenSpec validation, and Windows native build evidence in `implementation-evidence.md`; reconcile current `origin/develop` and update the implementation pull request before readiness.
