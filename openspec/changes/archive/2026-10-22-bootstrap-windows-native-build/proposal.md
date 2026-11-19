## Why

A fresh Windows checkout can currently pass `npm run doctor` and still fail during the first Rust link because Git Bash's GNU `link.exe` shadows Microsoft's linker. Opening a Visual Studio developer shell fixes the linker but can hide Rustup's `%USERPROFILE%\.cargo\bin`, while the current doctor does not inspect the required MSVC workload at all. The user therefore has to discover an undocumented sequence of shell changes, installers, and environment setup before the ordinary build can produce resident tabs.

## What Changes

- Add one dependency-free Windows native-build environment resolver that finds Rust through explicit overrides, the current `PATH`, or Rustup's canonical user location; finds a complete Visual Studio C++ workload through the installed Visual Studio locator; and imports its x64 developer environment without exposing environment contents.
- Make `npm run doctor` and the build preflight report Rust and Microsoft C++ readiness from that effective environment, including an ordered, copyable setup sequence when software is genuinely absent.
- Run the normal local build and direct native build entries with the same resolved environment, so Git Bash, ordinary PowerShell, and Visual Studio developer shells select Microsoft's `cl.exe` and `link.exe` and can find the pinned Rust toolchain without shell-specific wrapper commands.
- Keep installation explicit: A1 will not silently accept licenses, elevate privileges, install Visual Studio or Rustup, or mutate the user's persistent `PATH`. Once prerequisites are installed, rerunning the same `npm run build` command will be sufficient.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: the normal repository build detects and initializes the complete Windows native toolchain before compiling the resident-ready local application.

## Impact

- **Development tooling:** `scripts/development/check-environment.mjs`, native build entries, and a new shared dependency-free environment resolver.
- **Package commands:** ordinary `npm run build`, `build:core`, `build:process-guardian`, and `build:terminal-host` retain their public names while sharing the resolved child environment.
- **Diagnostics and docs:** `npm run doctor`, README development instructions, and toolchain architecture documentation name MSVC explicitly and distinguish installed-but-not-initialized tools from missing software.
- **Tests:** hermetic Windows environment fixtures cover Rustup fallback, Visual Studio discovery, developer-environment parsing, Git Bash linker shadowing, missing workload diagnostics, explicit overrides, and unchanged non-Windows behavior.
