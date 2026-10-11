# Tasks

Milestone 1 of 6 for resident tabs (see `docs/architecture/resident-tabs.md`). Implementation starts only after the user approves this refined plan.

## 1. Baseline and contracts

- [x] 1.1 Reconcile the branch with current `develop`, keeping #588's terminal-host CI ownership and #667's surviving-owner terminal restoration unchanged.
- [x] 1.2 Move the design and roadmap to `docs/architecture/resident-tabs.md` and the milestone 2–6 target requirements to `docs/architecture/resident-tabs-requirements.md`, updated for Windows x64, Linux x64, macOS arm64, crash recovery without reboot restore, and milestone delivery.
- [x] 1.3 Pin milestone-1 boundaries for MessagePack generation 1, the Node-API lock artifact, fixed-role detached launch, the PTY controller marker, alias-safe lock transition, exact CI targets, and process-kill versus physical power-loss evidence.

## 2. Package and identity foundation

- [ ] 2.1 Refactor `native/terminal-host` into one Cargo package with a shared library, the existing binary, and a feature-gated Node-API 9 `a1_session_lock.node` artifact; preserve every existing proof mode and update pinned provenance for any dependency or toolchain change.
- [ ] 2.2 Implement process identity by pid plus native start time, exact current boot identity, and current OS-session identity on all three targets; cover stable reads, PID reuse, parser failures, and injected reboot/logon identity changes.

## 3. Platform primitives

Each task runs its platform fixtures on Windows x64, Linux x64, and macOS arm64.

- [ ] 3.1 Implement owner-only endpoints with first-owner protection, safe runtime-directory and path handling, and per-accept peer credential checks; prove another local identity is refused before protocol parsing and an occupied endpoint cannot be replaced.
- [ ] 3.2 Implement typed fixed-role detached launch with no executable/free-form argv input, exact artifact/profile verification, bounded result reporting, allowlisted environment/cwd, closed inherited handles, Windows direct and WMI modes, and Unix double-fork/`setsid`; prove the verified fixture survives its launching tree while an ordinary child does not.
- [ ] 3.3 Implement the shared session-writer lock and Node-API wrapper: canonical existing-file identity, new-location reservation, no-write-before-bind, identity acquisition while reservation remains held, and non-inherited custody; prove case, symlink, junction, hard-link, create/bind race, explicit-release, process-death, and grandchild boundaries.
- [ ] 3.4 Implement durable atomic replacement with the declared Windows, Linux, and macOS synchronization sequence and supported-filesystem checks; inject a kill before and after every step, assert complete old-or-new bytes, and separately assert required platform calls/order without representing this as physical power-loss evidence.

## 4. Protocol and controller core

- [ ] 4.1 Implement generation-1 framing and canonical named-map MessagePack envelopes with the frame/input/depth/collection caps, four-second handshake, additive field behavior, unknown-value fallback, and typed incompatibility outcomes.
- [ ] 4.2 Add exact-byte fixtures for every milestone-1 message shape, a sorted SHA-256 fixture manifest/digest generator, and tests rejecting non-additive or manually inconsistent fixture changes.
- [ ] 4.3 Add the bounded decoder `cargo-fuzz` target and checked-in seed corpus; prove arbitrary/truncated/oversized/deep input cannot panic, exceed frame-derived allocation bounds, or bypass handshake outcomes.
- [ ] 4.4 Implement the I/O-free controller-transfer states and deterministic simulator; cover buffered input, delayed commands, stale/duplicate acknowledgements, disconnects, and repeated transfers, preserving each command's admitting generation and minimizing invariant failures.
- [ ] 4.5 Add the versioned DCS generation/nonce marker fixture and owner-only acknowledgement channel; on each target prove the child acknowledges only after prior bytes traverse the same PTY input queue, and keep transfer disabled wherever that boundary is not established.

## 5. CI and documentation

- [ ] 5.1 Extend the impact-selected terminal-host owner and workflow to Windows x64, Linux x64, and macOS arm64 with platform-neutral artifact paths; run the binary, addon, primitive, fixture, and existing probe suites on every target and a pinned bounded fuzz run on Linux.
- [ ] 5.2 Update terminal-host provenance and local-build guidance for the shared library/addon and any new pinned dependencies while retaining the existing Windows workstation guard.
- [ ] 5.3 Record implemented primitive choices and deviations in `docs/architecture/resident-tabs.md`; remove only the delivered protocol-foundation requirement from `resident-tabs-requirements.md`, preserving the separate later topology-mutation requirement and every milestone 2–6 obligation.

## 6. Evidence

- [ ] 6.1 Record focused results for all three native targets, Node-addon lifecycle tests, deterministic simulation, bounded fuzzing, strict OpenSpec validation, documentation governance, and whitespace checks in implementation evidence.
- [ ] 6.2 Record known gaps explicitly: hosted kill/API-order evidence is not physical power-loss certification, synthetic containment does not replace milestone-6 terminal evidence, and no product route loads the addon or resident infrastructure in this milestone.
