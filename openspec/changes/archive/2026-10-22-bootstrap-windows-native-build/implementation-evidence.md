# Implementation Evidence

## Delivered behavior

- Windows build preflight resolves explicit Rust executables, tools already on `PATH`, or Rustup's canonical user installation without changing persistent machine state.
- A valid launching Visual Studio environment is retained; otherwise the resolver selects a complete stable C++ workload with `vswhere`, imports `vcvars64.bat` only for build children, and verifies the x64 compiler, Microsoft linker, and Windows SDK.
- Git Bash's GNU `link.exe` is rejected when it shadows MSVC, while ordinary Git Bash and PowerShell builds use the discovered Microsoft toolchain without a developer-shell wrapper.
- `npm run doctor` distinguishes missing Rust, Visual Studio installation, C++ workload, failed discovery, and failed initialization, reports all blockers before compilation, and gives the ordered explicit setup sequence. Visual Studio Code is documented as unnecessary.
- `npm run build`, `build:core`, and direct process-guardian and terminal-host builds share the effective native environment. External software installation, license acceptance, elevation, and persistent `PATH` changes remain user-controlled.

## Validation

- `npm run typecheck` — passed.
- `npx vitest run test/repository-governance/native-build-environment.test.ts test/repository-governance/environment-prerequisites.test.ts test/repository-governance/build-script-stdout-policy.test.ts test/repository-governance/local-terminal-host-build.test.ts` — passed: 65 tests across 4 files.
- `npm run doctor` from Windows Git Bash — passed, reporting Rust 1.99.1 from the canonical Rustup location and Microsoft C++ initialized automatically from Visual Studio.
- `npm run build` from Windows Git Bash without manual `PATH` changes or developer-shell initialization — passed and produced verified win32-x64 process-guardian and terminal-host addons, manifests, and terminal-host notices; both addon manifests recorded an executed identity check.
- `npm run check:docs-governance` — passed with 74 inventoried legacy occurrences matching.
- `npx openspec validate bootstrap-windows-native-build --strict` and `git diff --check` — passed.

## Known gaps

None.
