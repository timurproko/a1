# Native terminal-host provenance

The multi-agent composed-terminal proof uses pinned MIT-licensed Ghostty and Winghostty sources. This document records the selected revisions and the ingestion policy before any native host is packaged or integrated.

## Pinned source revisions

| Source | Repository | Commit | License |
|---|---|---|---|
| Winghostty | `https://github.com/amanthanvi/winghostty` | `6a8353f4ced7124a37993ee2ad08277afa539ae6` | MIT |
| Ghostty | `https://github.com/ghostty-org/ghostty` | `613050ddffbe9e15e538a355e2c6934407113793` | MIT |

Both licenses carry the same MIT text and notice: copyright © 2024 Mitchell Hashimoto, Ghostty contributors. The proof package and any production native artifact must retain those notices and AddOne's license/notice inventory.

## Windows proof components

Retain from Winghostty:

- `src/apprt/win32.zig` and focused `src/apprt/win32_*.zig` modules for native windows, tabs, split topology, input, IME, clipboard, session state, and lifecycle.
- `src/pty.zig` and related process/ConPTY ownership code.
- `src/terminal/`, `src/termio/`, `src/input/`, `src/font/`, and `src/renderer/` for the mature terminal engine and OpenGL presentation path.
- Existing renderer/paint diagnostics where they provide evidence without changing terminal behavior.

Retain from upstream Ghostty for comparison and synchronization:

- The shared terminal core and build configuration corresponding to the Winghostty pin.
- macOS AppKit/Metal and Linux GTK runtime references only for later platform-host work; they are not part of the Windows spike artifact.

Adapt minimally for AddOne:

- A separate AddOne-owned executable entry point.
- The bounded local proof protocol defined by the workspace contracts.
- Caller-owned AddOne window/tab/pane/session identities and revision acknowledgements.
- Build/package metadata and evidence emission.

Do not add a lightweight ANSI parser, terminal renderer, terminal-byte relay, or custom input translator. Any patch to retained terminal behavior must be separately justified, tested, recorded with source and target revisions, and reviewed for upstream synchronization.

## Build prerequisites

The Windows proof requires:

- Windows 10 or 11, x64 or ARM64;
- Zig `0.15.x` with patch `>= 0.15.2` (CI reference: `0.15.2`);
- Visual Studio 2022 with the MSVC toolchain;
- Git for Windows;
- a GPU driver supporting OpenGL 4.3 or newer;
- an isolated disposable worker or user-controlled manual run for physical validation.

The active development workstation does not currently provide `zig` on `PATH`. This is acceptable for this provenance task because no native executable is built or launched here. Task 5.1 must record an isolated build environment and exact artifact hashes before any executable workload.

## Reproducible artifact manifest

Every spike or production host artifact must record:

- artifact path, SHA-256, size, signature status, and build timestamp;
- AddOne source commit and protocol version;
- Winghostty and Ghostty source commits;
- retained/adapted component manifest;
- compiler/toolchain versions and target triple;
- license and notice hashes;
- build command, dependency cache provenance, and clean-source-tree result;
- evidence workload schema version and physical/manual verdict reference.

Unverified, mismatched, or unsigned/unattested artifacts are not eligible for composed-terminal integration.
