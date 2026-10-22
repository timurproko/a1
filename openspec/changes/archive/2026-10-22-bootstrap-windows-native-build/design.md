# Design

## Context

The repository's prerequisite check resolves `cargo`, `rustc`, git, and other tools only from the launching shell's `PATH`. Its native build scripts then inherit that same environment and ask Cargo to invoke `link.exe` by name. On Windows this has two independent failure modes:

1. Git Bash places `C:\Program Files\Git\usr\bin\link.exe` ahead of the Microsoft linker. Rust finds the GNU hard-link utility, whose `link: extra operand` failure is reported only after crate compilation starts.
2. A Visual Studio developer shell places MSVC first but may not contain `%USERPROFILE%\.cargo\bin`, so the prerequisite check reports Rust absent even though Rustup installed the pinned toolchain.

The repository also requires the Visual Studio C++ workload and Windows SDK but `npm run doctor` currently reports neither. The successful build eventually produces both native addons and their manifests, so an incomplete native environment must be rejected before `clean` or compilation rather than surfacing as a launch-time single-agent fallback.

## Goals / Non-Goals

**Goals:**

- Make a fresh Windows setup fail once, before compilation, with every genuinely missing native prerequisite and an ordered remediation sequence.
- Make the same plain `npm run build` work after prerequisites are installed, regardless of whether it is launched from Git Bash, ordinary PowerShell, or a Visual Studio developer shell.
- Select Microsoft's x64 compiler/linker rather than Git's GNU `link.exe` without changing persistent machine state.
- Preserve explicit `CARGO` and `RUSTC` overrides, CI-provided toolchains, cross-target arguments, and all non-Windows behavior.
- Keep pre-dependency diagnostics dependency-free and free of environment/credential disclosure.

**Non-Goals:**

- Installing Rustup, Visual Studio, workloads, SDKs, Node, npm, git, or dependencies without an explicit user action.
- Accepting third-party licenses, handling UAC, or modifying the user's persistent `PATH`.
- Replacing Rustup, Visual Studio Installer, `vswhere`, or platform package managers.
- Changing release artifact identity, native features, target triples, or resident runtime behavior.

## Decisions

### 1. One pure discovery contract and one side-effecting resolver

A new dependency-free module under `scripts/development/` will separate:

- pure selection and diagnostic decisions over observed candidates; and
- bounded machine probes that locate executables, query Visual Studio, invoke its environment initializer, and return an effective child environment.

The result will identify each tool by readiness and source (`override`, `PATH`, canonical Rustup location, initialized Visual Studio environment, or discovered Visual Studio installation) without printing absolute environment values in ordinary output. Probes will retain the existing bounded timeout and structured failure identity.

All subprocess paths and arguments are internally derived. The resolver will not execute repository content, shell fragments from environment variables, or arbitrary installer output.

### 2. Rustup's canonical bin directory is a local fallback, not a persistent mutation

On Windows, resolution order for Cargo and rustc will be:

1. an explicit `CARGO` or `RUSTC` executable;
2. the launching environment's `PATH`;
3. `%USERPROFILE%\.cargo\bin` when the corresponding executable exists there.

When the fallback succeeds, it is prepended only to the environment passed to the check and build children. No registry or persistent environment value changes. The repository-pinned `rust-toolchain.toml` continues selecting the exact Rust version once Cargo runs inside the checkout.

An explicit override that is absent or cannot execute is a named failure; it does not silently fall through to another tool.

### 3. Visual Studio discovery requires the C++ x64/x86 component

On Windows, an already initialized environment is accepted only when it resolves Microsoft `cl.exe` and `link.exe` from the declared Visual Studio installation and has the required SDK library environment. Otherwise the resolver locates Microsoft's installed `vswhere.exe` from its standard Installer location or `PATH`, and queries the newest complete installation requiring `Microsoft.VisualStudio.Component.VC.Tools.x86.x64`.

The selected installation must contain `VC\Auxiliary\Build\vcvars64.bat`. The resolver invokes that fixed script through `cmd.exe` with x64 host/target arguments and a sentinel-delimited `set` capture. It parses the resulting environment only after a successful exit and never logs the captured variables. The imported `PATH` puts the selected MSVC linker before Git's `/usr/bin/link.exe`; the imported `INCLUDE`, `LIB`, SDK, and VC variables remain scoped to build children.

Visual Studio Community, Professional, Enterprise, and Build Tools installations are equally acceptable when the required component is complete. A preview installation is not chosen over a complete stable installation unless it is the only explicitly initialized valid environment.

### 4. Build orchestration propagates the effective environment

A dependency-free build entry will resolve the environment once, run the prerequisite decision against it, and then spawn the existing managed/native stages with that environment. Public npm command names and their target arguments remain unchanged. Direct process-guardian and terminal-host build entries will also call the shared resolver when they are invoked outside the top-level build, making their behavior consistent without requiring a caller-specific wrapper.

On non-Windows platforms the effective environment is the caller's environment plus existing explicit tool overrides; no Visual Studio probe or command shell is introduced. CI environments that already resolve valid tools remain unchanged apart from the readiness observation.

### 5. Doctor distinguishes absence from shell initialization

`npm run doctor` will add a blocking Microsoft C++ toolchain row on Windows and report the effective Rust resolution. Its outcomes will distinguish:

- installed and ready;
- installed but not present in the launching shell, automatically initialized for the build;
- Visual Studio Installer present but the Desktop development with C++ workload absent;
- no Visual Studio installation/installer;
- explicit override invalid;
- probe timeout or malformed output.

When software is absent, the report will give one ordered setup sequence: install Rustup if needed, open the installed Visual Studio Installer directly (or download the official bootstrapper), select Desktop development with C++, and rerun `npm run build`. It will not use the broken passive winget invocation observed during this manual setup. The normal successful build remains quiet.

## Risks

- **Visual Studio command output is localized or changes shape.** Mitigation: use `vswhere` properties and sentinel-delimited `set` output, validate required paths after parsing, and fail with a probe-specific diagnostic rather than guessing.
- **Environment capture leaks credentials.** Mitigation: captured values are passed only to child processes; reports contain bounded source/status metadata and never serialize the environment.
- **A CI or cross-build toolchain is overridden.** Mitigation: accept an already valid environment and explicit overrides first; preserve target arguments and add fixtures for CI-style environments.
- **A different `link.exe` remains first.** Mitigation: resolve the effective linker after initialization and require it to be the selected Visual Studio linker before compilation.
- **Automatic installation surprises users.** Mitigation: install nothing; diagnostics state that setup needs explicit user action and the same build command is rerun afterward.

## Validation Strategy

- Pure unit cases for Rust override/PATH/canonical fallback and every diagnostic classification.
- Hermetic Visual Studio fixtures for initialized shells, stable installation discovery, missing C++ workload, missing SDK environment, malformed/timeout probes, and a Git Bash GNU linker preceding MSVC.
- Build-entry wiring fixtures proving the effective child environment reaches top-level and direct native build paths while arguments and non-Windows environments remain unchanged.
- Windows CI smoke proving the actual hosted toolchain is selected as Microsoft MSVC; existing process-guardian and terminal-host build/identity checks continue proving produced artifacts.
