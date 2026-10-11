# Implementation evidence

## Implemented result

- `native/terminal-host` is one Cargo package with a shared contract library, the retained proof binary, and a feature-gated Node-API 9 session-lock artifact.
- Windows x64, Linux x64, and macOS arm64 implementations cover process/boot/session identity, owner endpoints, fixed-role launch, writer-held locks, and durable atomic replacement behind typed APIs.
- Generation-1 named-map MessagePack framing has exact-byte fixtures, structural/allocation bounds, a checked-in digest manifest, and a decoder fuzz target.
- The I/O-free controller core freezes, drains, waits for a nonce-bearing child-observed PTY marker, rejects stale acknowledgements, and never relabels old commands.
- Impact ownership schedules the binary, addon, primitive/probe suite, and artifacts on all three targets; Linux additionally owns the bounded fuzz invocation.

## Focused pre-finalization evidence

- `npm ci` — passed, including repository build/prepare.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --manifest-path native/terminal-host/Cargo.toml --all-targets --features node-addon,resident-fixtures` — 22 passed on Windows x64 (18 library and 4 retained binary tests); Node-API dynamic-load diagnostics are expected outside Node.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo build --manifest-path native/terminal-host/Cargo.toml --lib --features node-addon && node scripts/development/test-session-lock-addon.mjs` — passed; new-file bind, same-process contention, cross-process contention, process-death release, and reacquisition verified.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --manifest-path native/terminal-host/Cargo.toml --all-targets --features node-addon,resident-fixtures` — passed for the Windows host.
- The equivalent contract/all-target checks with `--target x86_64-unknown-linux-gnu` and `--target aarch64-apple-darwin` — passed.
- Focused repository-governance suites for integration ownership, validation matrix/aggregate, impact selection, and terminal-host provenance — 45 tests passed across their focused runs.
- Complete repository-governance run — 1,497 passed; one unrelated naming-selection fixture exceeded its five-second timeout under full parallel load, then all 10 tests in that file passed in isolation.
- `npm run typecheck`, `npm run check:architecture`, `npm run check:docs-governance`, `npx openspec validate resident-tabs-contracts --strict`, `cargo fmt --check`, and `git diff --check` — passed.

The final exact-head three-platform native executions and pinned Linux fuzz result belong to the ordinary ready-PR Development run. Their run/head identity is reported in the maintainer handoff rather than committed and made stale by another evidence commit.

## Known-gap disposition

- Hosted kill-point tests and synchronization-call ordering establish process-crash/API-contract behavior; they are not represented as physical power-loss certification. Exact-package physical interruption remains milestone 6.
- Synthetic jobs, sessions, and fixed-role fixtures do not replace milestone-6 physical terminal/SSH evidence.
- The Node addon is built and exercised as a native contract artifact but no product route loads it; wiring every A1-owned session writer remains milestone 3.
- The fixed resident fixture proves the launch boundary only. Server, holder, attach, registry, and bridge roles remain milestone 2.
- `residentTabs` remains absent, so bare `a1` and `a1 pi` retain their existing launch behavior.
