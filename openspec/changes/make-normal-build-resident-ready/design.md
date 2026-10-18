## Context

The current `build` script runs the environment check, cleans `dist`, compiles TypeScript, generates managed resources, builds `process-guardian.node`, and records the runtime payload. `terminal-host.node` is built later only by selected native validation and publication lanes. That separation is correct for cross-platform release assembly but incorrect as the public meaning of a normal source build now that bare A1 defaults to resident tabs.

The terminal host is Node-hosted but not JavaScript-only. Its Node-API addon is compiled from Rust and links the pinned Ghostty VT library. Windows workstation policy forbids an implicit Zig source build because the upstream package fetch contains fixtures quarantined by managed antivirus. CI already exports the exact linked Ghostty library with a bounded manifest, and the crate can verify and link that artifact locally.

## Goals / Non-Goals

**Goals:**

- `npm run build` leaves a verified current-platform terminal host that bare `./scripts/dev` can use.
- A normal local Windows build obtains or reuses a verified prebuilt Ghostty library and never silently runs Zig.
- npm installation and native CI lanes retain a deliberate core-build path so they do not duplicate platform-native assembly.
- Build failures explain the missing prerequisite and never masquerade as a successful complete build.
- Manual handoff remains the color-preserving `./scripts/dev` route in one copy-pasteable Git Bash line.

**Non-Goals:**

- Changing installed-release fallback behavior when a shipped artifact is damaged or unsupported.
- Replacing native CI certification, packaging all platforms on a workstation, or making npm the interactive terminal owner.
- Adding a separate user-facing tabs build command.

## Decisions

### 1. The public build is complete; the partial build is explicitly internal

`npm run build` will retain the environment check first, run a named core build, prepare the local terminal-host dependency, build the release-profile host addon, and regenerate the runtime payload after native output exists. The npm `prepare` lifecycle and CI installation paths will call the core build explicitly because their native platform artifacts are assembled and certified by later owned lanes.

This reverses the current naming mismatch: the default command means a runnable local product, while partial assembly is visible in its internal name.

### 2. Local terminal-library selection is deterministic and fail-closed

A development helper will select the current platform, accept an explicit `TERMINAL_HOST_PREBUILT_VT`, otherwise reuse the ignored `.artifacts/terminal-vt` cache when its manifest is compatible, and otherwise fetch a CI-published artifact. It will prefer the current branch and may fall back to the default branch only when the existing manifest identity proves compatibility with the local vendored contract. The Rust build remains the final authority: a mismatched manifest or changed bytes fails without invoking Zig.

The helper will set `TERMINAL_HOST_LOCAL_BUILD=1` and `TERMINAL_HOST_PREBUILT_VT` only for the bounded terminal-host child build. CI builds continue ignoring these local overrides and use their pinned Zig setup.

### 3. Build output stays machine-safe

The existing build is consumed by npm packaging paths that parse stdout. New preparation and build steps therefore write diagnostics to stderr and remain silent on stdout unless explicitly verbose. Child failure is propagated unchanged.

### 4. Interactive launch remains outside npm

The complete build does not start the UI. Manual testing continues through `./scripts/dev`, because the shell wrapper preserves Windows Git Bash terminal handles and true color. Every runnable handoff for this change will end with the exact worktree command in this shape:

```bash
cd /e/Git/a1/.worktrees/normal-build-resident-tabs && npm run build && ./scripts/dev
```

## Risks / Trade-offs

- The first local build may require GitHub authentication and a completed native lane when no compatible library is cached. The failure names that prerequisite instead of launching the wrong product.
- Building the Rust addon makes a normal build slower. Incremental Cargo output and the reusable VT cache bound repeat cost; correctness of the default product takes priority over retaining a misleadingly fast partial build.
- Splitting `prepare` from public `build` requires focused governance updates so release lanes continue to assemble native artifacts exactly once.

## Validation

Focused tests will cover package-script ordering, lifecycle/core separation, compatible-cache reuse, branch/default artifact selection, actionable failure, environment isolation, and stdout discipline. The normal build will then be exercised on Windows with the verified cached terminal library, followed by bare `./scripts/dev` manual testing.
