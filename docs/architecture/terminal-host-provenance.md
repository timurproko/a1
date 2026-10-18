# Terminal-host provenance

The resident terminal host uses a small console-hosted stack. Its native implementation ships as the Node-API 9 addon `terminal-host.node`; the release's fixed `dist/foundation/resident-tabs/host-entry.js` loads that addon and dispatches the server, holder, attach, probe, maintenance, and internal roles inside the hosting Node runtime. It runs inside the user's existing terminal and does not create a separate desktop window. No terminal-host executable is built or shipped, and the same addon exports the in-process session-writer lock.

## Selected source components

| Component | Source identity | Role | License |
|---|---|---|---|
| `libghostty-vt` | `ghostty-org/ghostty` commit `c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3` | Terminal parsing, retained state, and input semantics | MIT |
| `portable-pty` | version `0.9.0` | ConPTY/Unix PTY and process ownership | MIT |
| Crossterm | version `0.29.0` | Outer-terminal raw mode and host input events | MIT; license text ships in the generated notices |

`libghostty-vt` is built with `-Dsimd=true`, which statically links simdutf `9.0.0` (Apache-2.0 OR MIT, vendored in the libghostty tree) and Highway at commit `66486a10623fa0d72fe91260f96c892e41aceb06` (Apache-2.0 OR BSD-3-Clause, fetched by the pinned Zig build). Their license texts are kept under `native/terminal-host/vendor/third-party-licenses/` with digests recorded in `config/terminal-host-provenance.json`, beside the upstream napi-rs license that the published `napi` and `napi-sys` crates omit.

## Release notices

`scripts/release/generate-terminal-host-notices.mjs` writes `terminal-host-THIRD-PARTY-NOTICES.txt` beside each release addon. It walks the locked Cargo graph for the build target (normal dependencies, including the Node-API glue; proc-macro crates and their subtrees never reach the addon), adds the Zig-linked components, and fails on a license expression outside MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unicode-3.0, or Zlib (the `LLVM-exception` addendum is accepted), on a crate without license text, or on a pinned text whose digest changed.

A buffered A1-owned frame composer is the initial presentation layer. Ratatui is an optional evaluation candidate only if the narrow composer increases rendering risk; it is not selected by default.

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

- Rust/Cargo for the A1 terminal host;
- Zig `0.15.x` with patch `>= 0.15.2` to build `libghostty-vt`;
- the platform C/C++ build toolchain required by Rust and the PTY/input crates (Visual Studio 2022 Build Tools/MSVC on Windows, the runner image's Xcode Clang on macOS, GCC on Linux);
- release builds on `windows-2025`, `ubuntu-24.04`, and `macos-15` (arm64, which also cross-compiles the x64 artifact with `--target x86_64-apple-darwin`);
- an existing terminal emulator for manual validation;
- an isolated disposable worker for automated physical validation.

No GUI SDK, OpenGL runtime, Win32 window pipeline, Metal, GTK, or AppKit runtime is required for the in-terminal host.

## Reproducible artifact manifest

Every spike or production host artifact must record:

- artifact path, SHA-256, size, signature status, and build timestamp;
- A1 source commit and protocol version;
- `libghostty-vt`, PTY, input, and renderer component identities;
- retained/adapted component manifest;
- compiler/toolchain versions and target triple;
- license and notice hashes;
- build command, dependency cache provenance, and clean-source-tree result;
- evidence workload schema version and physical/manual verdict reference.

Unverified, mismatched, or unsigned/unattested artifacts are not eligible for composed-terminal integration.

## Release artifact

`npm run build:terminal-host` (`scripts/development/build-terminal-host.mjs`) builds the library once with `cargo build --release --locked --lib --features node-addon`, copies the cdylib as `terminal-host.node`, loads the addon in Node, and checks its `version()` report: protocol, generation, crate version, pinned `libghostty-vt` commit, and the absence of `fault-injection` and `resident-fixtures`. Release and native validation runners invoke it with their pinned Zig toolchain. The normal developer `npm run build` invokes the same release-profile builder for the current platform; on Windows it links a manifest-verified terminal library exported by trusted CI and records the repository-pinned Zig producer version without invoking Zig on the workstation. The macOS x64 cross build may use the recorded Mach-O architecture check when the arm64 runner cannot load the addon.

The generated `terminal-host.manifest.json` uses schema `a1-terminal-host-artifact-v2` and records `kind: "node-addon"`, Node-API 9, the addon's SHA-256 and size, the release-relative role-entry digest, the notices digest, target triple, Rust and Zig versions, and `Cargo.lock` digest. The role entry passes only the fixed role grammar and records `{ executable: process.execPath, entry, artifact: addonPath }` once in the addon; the explicit loaded artifact identity makes release-hold reporting independent of development environment propagation. Detached and WMI resident starts use the recorded Node-and-entry command and never resolve an A1-built executable. The publication `package` job refuses to pack unless every platform's process-guardian and terminal-host addons match their manifests, and A1 verifies the addon, entry, and notices before loading the host.
