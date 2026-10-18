## Why

Bare A1 is the resident multi-agent product, but the repository's normal `npm run build` deletes `dist/` and rebuilds only the managed runtime and process guardian. A subsequent `./scripts/dev` therefore cannot verify a terminal-host addon and silently falls back to the direct single-agent UI, making the normal manual-test command exercise a different product than the default installed application.

## What Changes

- Make `npm run build` produce the current platform's verified terminal-host addon, manifest, and notices after compiling the managed runtime and before recording the runtime payload.
- Preserve a core install/CI build entry for jobs that deliberately assemble native artifacts in separate platform lanes, without presenting that partial build as the normal developer build.
- Prepare local Windows terminal-host builds from a verified CI-published Ghostty VT library instead of silently invoking the quarantined Zig fetch; reuse a compatible cached artifact and fetch one when needed.
- Fail the normal build with an actionable diagnostic when a complete resident build cannot be produced, rather than allowing manual launch to become an unnoticed single-agent fallback.
- Keep the manual handoff as one Git Bash line that changes to the exact worktree, runs `npm run build`, and launches through `./scripts/dev` so terminal color and TTY behavior remain representative.

## Capabilities

### Modified Capabilities

- `multi-agent-tabs`: require the normal repository build to make the supported local resident route available to the standard development launcher.
- `continuous-integration`: distinguish the complete developer build from the managed/core lifecycle build used before platform-native CI assembly.

## Impact

- Package scripts and local build orchestration under `scripts/development/`.
- Terminal-library artifact selection and focused repository-governance tests.
- CI/install lifecycle callers that intentionally need the core build rather than a locally complete platform build.
- Developer architecture documentation and the exact manual-test handoff.
