# Terminal-host provenance

The composed-terminal proof uses a small console-hosted stack. It runs inside the user's existing terminal and does not create a separate desktop window.

## Selected source components

| Component | Source identity | Role | License |
|---|---|---|---|
| `libghostty-vt` | `ghostty-org/ghostty` commit `c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3` | Terminal parsing, retained state, and input semantics | MIT |
| `portable-pty` | version `0.9.0` | ConPTY/Unix PTY and process ownership | MIT |
| Crossterm | version `0.29.0` | Outer-terminal raw mode and host input events | MIT-compatible candidate; notice must be vendored before packaging |

A buffered AddOne-owned frame composer is the initial presentation layer. Ratatui is an optional evaluation candidate only if the narrow composer increases rendering risk; it is not selected by default.

## Explicitly excluded

The in-terminal proof does not use:

- the Ghostty desktop application;
- Winghostty's Win32 runtime;
- OpenGL/WGL;
- Metal;
- GTK;
- AppKit;
- Herdr;
- a Node terminal parser or renderer;
- a new lightweight ANSI parser.

A desktop-native application can be reconsidered only after the terminal-hosted product proves rendering and input quality.

## Patch policy

Retain upstream terminal behavior without local patches by default. Any behavioral patch must record:

- source and target revisions;
- reason;
- regression tests;
- upstream synchronization decision;
- license impact.

Do not patch terminal semantics to support a specific CLI. Report unsupported generic behavior through capability negotiation instead.

## Build prerequisites

The console proof requires:

- Rust/Cargo for the AddOne terminal host;
- Zig `0.15.x` with patch `>= 0.15.2` to build `libghostty-vt`;
- the platform C/C++ build toolchain required by Rust and the PTY/input crates (Visual Studio 2022 Build Tools/MSVC on Windows);
- Windows 10/11 x64 or ARM64 for the first proof;
- an existing terminal emulator for manual validation;
- an isolated disposable worker for automated physical validation.

No GUI SDK, OpenGL runtime, Win32 window pipeline, Metal, GTK, or AppKit runtime is required for the in-terminal host.

## Reproducible artifact manifest

Every spike or production host artifact must record:

- artifact path, SHA-256, size, signature status, and build timestamp;
- AddOne source commit and protocol version;
- `libghostty-vt`, PTY, input, and renderer component identities;
- retained/adapted component manifest;
- compiler/toolchain versions and target triple;
- license and notice hashes;
- build command, dependency cache provenance, and clean-source-tree result;
- evidence workload schema version and physical/manual verdict reference.

Unverified, mismatched, or unsigned/unattested artifacts are not eligible for composed-terminal integration.
