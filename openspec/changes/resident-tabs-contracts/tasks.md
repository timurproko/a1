# Tasks

Milestone 1 of 6 for resident tabs (see `docs/architecture/resident-tabs.md`). Implementation starts only after the user approves this plan.

## 1. Baseline

- [x] 1.1 Reconcile the branch with current `develop`, keeping #588's terminal-host CI ownership and #667's surviving-owner terminal restoration unchanged.
- [x] 1.2 Move the design and roadmap to `docs/architecture/resident-tabs.md` and the milestone 2–6 target requirements to `docs/architecture/resident-tabs-requirements.md`, updated for Windows x64, macOS, and Linux, crash recovery without reboot restore, and milestone delivery.

## 2. Platform primitives

Each task adds the primitive with tests that run on Windows x64, macOS, and Linux.

- [ ] 2.1 Process identity by pid plus native start time, pid-reuse detection, and current boot identity.
- [ ] 2.2 Owner-only endpoints: a named pipe with an owner-only ACL and first-instance protection, and a Unix socket in a `0700` directory with peer-credential checks; a connection from another user is refused.
- [ ] 2.3 Fixed-role detached launch: refuse unapproved executables and roles; leave the caller's containment (Windows job with WMI fallback, Unix `setsid` with no controlling terminal, macOS per-user bootstrap namespace); verify and report the observed mode; prove survival when the launching tree is killed or hung up, and prove that ordinary contained children still die with their tree.
- [ ] 2.4 Session-writer lock held by the writer process, keyed by canonical file identity across case, symlink, junction, and hard-link aliases, with new-file reservation and a command surface Node can call later; prove it is released only when the writer exits.
- [ ] 2.5 Durable atomic replacement with per-platform flush semantics and documented supported filesystems; prove complete-old-or-new content after a kill at each step.

## 3. Protocol and core

- [ ] 3.1 Protocol generation 1: bounded frame codec, handshake with timeout, frozen fixtures for every message shape, and a fixture digest checked in CI.
- [ ] 3.2 A `cargo-fuzz` target for the frame decoder that never panics or allocates past the caps.
- [ ] 3.3 The I/O-free core with the controller-transfer barrier, and a deterministic simulator proving that no command runs under a generation that did not admit it, including delayed buffered input and stale generations.

## 4. CI and documentation

- [ ] 4.1 Build and test `native/terminal-host` on macOS and Linux in addition to Windows, selected by the existing validation-impact rules, and extend the terminal-host provenance record if the toolchain changes.
- [ ] 4.2 Record the pinned primitive choices and any deviation in `docs/architecture/resident-tabs.md`, and remove the protocol requirement this change delivers from `resident-tabs-requirements.md`.

## 5. Validation

- [ ] 5.1 Run the native test suites on all three platforms, the fuzz target for a bounded time, strict OpenSpec validation, and documentation governance, and record the results in implementation evidence.
