# Proposal

## Why

The user chose persistent terminal-session tabs as A1's multi-agent direction: each tab is a complete A1 process kept alive by a native resident host, so agents survive closing the terminal and extensions stay native. The design and six-milestone roadmap are in `docs/architecture/resident-tabs.md`. Every later milestone depends on operating-system behavior that differs across Windows x64, macOS, and Linux: leaving the terminal's process containment, locking a session file to its writer, replacing a file durably, identifying processes and boots, and restricting endpoints to the owner. It also depends on a frozen wire protocol and a proven rule for handing keyboard control between two attached windows. Proving those first, on all three platforms, keeps later milestones from building on assumptions.

This is milestone 1 of 6. It adds native primitives and tests only; no product path uses them yet, and bare `a1` behaves exactly as today.

## What Changes

- Add platform primitives to `native/terminal-host`, each with tests on Windows x64, macOS, and Linux:
  - process identity by pid plus native start time, and the current boot identity;
  - owner-only endpoints (a named pipe with an owner-only ACL; a Unix socket in a `0700` directory with a peer-credential check);
  - a fixed-role detached launch that leaves the launching terminal's containment, verifies the result, and refuses arbitrary executables;
  - a session-writer lock held by the writer process itself, with canonical path identity and new-file reservation;
  - durable atomic file replacement with each platform's flush semantics.
- Freeze protocol generation 1: bounded length-prefixed frames, the handshake, and frozen fixtures with digests, plus a fuzz target for the decoder.
- Start the I/O-free (sans-IO) core and prove the controller-transfer barrier in deterministic simulation, including delayed buffered input and stale generations.
- Build and test the terminal host in CI on macOS and Linux as well as Windows.
- Add `docs/architecture/resident-tabs.md` (design and roadmap) and `docs/architecture/resident-tabs-requirements.md` (target requirements for milestones 2–6).

## Capabilities

### New Capabilities

- `resident-terminal-host`: the native primitives and protocol the resident tab host is built on.

### Modified Capabilities

- `continuous-integration`: the terminal-host owner builds and tests the crate on macOS and Linux as well as Windows x64.

## Impact

`native/terminal-host` gains platform, protocol, and core modules, tests, and a fuzz target; the existing 2×2 proof binary keeps working until milestone 2 replaces it. CI builds and tests the crate on three platforms. No TypeScript source, launch path, setting, or user-visible behavior changes. `residentTabs` does not exist until milestone 2.
