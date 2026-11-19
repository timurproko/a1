# Proposal

## Why

The user chose persistent terminal-session tabs as A1's multi-agent direction: each tab is a complete A1 process kept alive by a native resident host, so agents survive closing the terminal and extensions stay native. The design and six-milestone roadmap are in `docs/architecture/resident-tabs.md`. Every later milestone depends on operating-system behavior that differs across Windows x64, Linux x64, and macOS arm64: leaving the terminal's process containment, locking a session file to its writer, replacing a file durably, identifying processes, boots, and login sessions, and restricting endpoints to the owner. It also depends on a frozen wire protocol and a proven rule for handing keyboard control between two attached windows. Proving those foundations first keeps later milestones from building on assumptions.

This is milestone 1 of 6. It adds native primitives, protocol/core contracts, test fixtures, and validation ownership only. No product path uses them yet, and bare `a1` behaves exactly as today.

## What Changes

- Add platform primitives to `native/terminal-host`, each tested on Windows x64, Linux x64, and macOS arm64:
  - process identity by pid plus native start time, and current boot and OS-session identities;
  - owner-only endpoints with first-owner protection and per-connection peer checks;
  - a fixed-role detached launch that resolves only the verified terminal-host artifact, leaves the launching terminal's containment, reports its observed mode, and refuses arbitrary executables or arguments;
  - a session-writer lock held by the writer process, with canonical existing-file identity and a gap-free new-file reservation-to-identity transition;
  - durable atomic file replacement with explicit per-platform synchronization steps and separately stated process-kill and power-loss evidence.
- Freeze protocol generation 1 as a little-endian bounded frame carrying canonical named-map MessagePack envelopes, with a bounded handshake, typed incompatibility outcomes, frozen byte fixtures and digest, and a bounded decoder fuzz target.
- Start the I/O-free core and prove the controller-transfer state machine in deterministic simulation; add a cross-platform fixture that writes a nonce-bearing boundary marker through the same PTY input queue and acknowledges it only after child admission.
- Produce an in-process Node-API 9 `a1-session-lock` addon from the same Rust package and lock implementation, with lifecycle and alias tests, but do not load it from product code in this milestone.
- Extend impact-selected terminal-host CI to Windows x64, Linux x64, and macOS arm64, and maintain the living architecture, deferred milestone requirements, and aligned project-structure governance.

## Capabilities

### New Capabilities

- `resident-terminal-host`: the native primitives, generation-1 protocol foundation, and controller-transfer core on which the resident tab host is built.

### Modified Capabilities

- `continuous-integration`: the terminal-host owner builds and tests the crate and lock addon on Windows x64, Linux x64, and macOS arm64, and runs the bounded protocol fuzz target on its declared Linux lane.
- `project-structure-governance`: record held-subsystem copies by commit instead of requiring a deleted archive branch, and replace the retired structured-workspace direction with resident terminal-session tabs.

## Impact

`native/terminal-host` gains a library surface shared by its existing binary and the Node-API lock artifact, platform, protocol, and core modules, hermetic fixture roles, tests, and a fuzz target; the existing 2×2 proof remains available until milestone 2 replaces it. CI gains three exact terminal-host targets and platform-neutral artifact handling. No TypeScript production source, launch path, setting, published-package surface, or user-visible behavior changes. The addon is built and exercised only as a native test artifact here; milestone 3 owns product wiring, and milestone 6 owns release packaging. `residentTabs` does not exist until milestone 2.
