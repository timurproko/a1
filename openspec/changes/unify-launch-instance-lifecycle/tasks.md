## 1. Define plural launch-instance contracts

- [x] 1.1 Add dependency-free launch-instance IDs, states, shutdown policy, root/guardian/containment identity, and terminal outcome types under the lifecycle foundation; verify with contract tests covering valid transitions, immutable terminal outcomes, and rejected malformed identities
- [x] 1.2 Replace foreground-lease control messages with idempotent create, activate, stop, complete, and reconcile launch-instance messages plus typed server-to-guardian stop intent; verify protocol round-trip and invalid-message tests cover every command and carry no terminal bytes or display state
- [x] 1.3 Bind launch-instance ownership to the authenticated handshake client ID rather than a caller-selected owner string; verify protocol tests reject owner mismatch and accept repeated idempotent requests from the original connection
- [x] 1.4 Change supervisor endpoint ownership metadata from singular busy/idle lease semantics to plural verified instance IDs and cohort activity derived from them; verify metadata contract tests represent zero, one, and several mixed-profile instances

## 2. Migrate storage to plural instances

- [x] 2.1 Add the next control-store schema with a `launch_instances` table, lifecycle constraints, owner/boot lookup indexes, and no one-live-row uniqueness index; verify migration tests can persist and independently query several simultaneous active instances
- [x] 2.2 Migrate legacy requested or active foreground leases to historical interrupted outcomes without publishing them as live launch instances, while preserving released lease history; verify upgrade tests cover requested, active, released, and empty legacy databases
- [x] 2.3 Implement transactional create, activate, begin-stop, complete, load-active, and reconcile-prior-boot store operations with terminal-state immutability; verify storage tests cover duplicate requests, concurrent instances, wrong owner/boot identity, and completion races
- [x] 2.4 Ensure launch-instance records contain only bounded identity/lifecycle metadata and no environment credentials, argv secrets beyond existing declared launch policy, terminal bytes, or display state; verify schema and serialization governance tests enforce the storage boundary

## 3. Implement plural supervision

- [x] 3.1 Replace the supervisor's singular foreground field with a map of active launch instances keyed by instance ID and associated with authenticated sockets; verify focused server tests create several instances and close one without changing the others
- [ ] 3.2 Reconcile owner socket loss for requested, active, and already-completing instances through one idempotent per-instance path; verify tests cover unrelated socket closure, disconnect-before-activation, disconnect-after-activation, and duplicate close events
- [x] 3.3 Publish endpoint metadata only from current-boot authenticated instances and reconcile prior-boot rows before listening; verify restart tests never resurrect old runtime ownership
- [ ] 3.4 Return typed concise lifecycle and ownership diagnostics instead of surfacing database uniqueness errors or internal stack traces as the primary user message; verify CLI tests assert user-facing output for malformed ownership, unsupported containment, and safe uncertainty
- [ ] 3.5 Add a single-flight guard around each instance's stop/completion reconciliation while allowing unrelated instances to progress concurrently; verify race tests resolve one terminal outcome and do not serialize independent instances globally

## 4. Build exact process identity and containment

- [x] 4.1 Define injectable `NativeProcessInspector` and `ProcessContainment` boundaries for observing verifiable start tokens, spawning with inherited stdio, checking containment membership, graceful stop, forced stop, wait, and handle close; verify adapter contract tests cover PID reuse, identity mismatch, deadline escalation, and no terminal I/O methods
- [ ] 4.2 Implement the Windows containment boundary using a minimal packaged native Job Object integration with kill-on-job-close and denied silent breakaway, recording the helper/addon choice and provenance; verify Windows integration fixtures show root, child, and detached-style grandchild all exit when the containment owner closes
- [ ] 4.3 Implement Windows process start-token observation and re-verification independently of broker-local memory; verify focused tests distinguish a live exact identity, a dead process, and a simulated reused PID before either cleanup stage
- [ ] 4.4 Implement the Linux containment adapter without changing inherited controlling-terminal/foreground behavior or signaling the parent shell; verify Linux CI fixtures close a root plus descendants while an unrelated sibling remains alive
- [ ] 4.5 Implement the macOS containment adapter with the same inherited-terminal and isolated-close guarantees, or return a concise unsupported capability before runtime startup if exact containment cannot yet be certified; verify macOS CI tests assert the implemented behavior and never claim unverified tree cleanup
- [ ] 4.6 Add integrity metadata, package inclusion, license/provenance records, and release verification for every native containment artifact; verify packed-artifact tests reject missing, altered, wrong-platform, or incompatible helpers

## 5. Introduce the unified launch guardian

- [ ] 5.1 Add the immutable launch-guardian entry that connects to the supervisor, creates one instance, opens containment, starts `a1-ui` with inherited stdio, activates ownership, waits, closes containment, and reports one final outcome; verify guardian unit tests cover success and every failure boundary
- [ ] 5.2 Route bootstrap interactive startup through the guardian before profile selection while leaving `version`, `update`, `update:next`, and invalid commands outside it; verify dispatch/bootstrap tests assert exactly one guardian per interactive invocation and none for maintenance or rejected commands
- [ ] 5.3 Preserve ordinary terminal authority by ensuring the guardian never reads stdin, parses or captures runtime output, creates a PTY, renders, reserves rows, or synthesizes terminal responses; verify source-boundary and architecture tests enforce inherited stdio and prohibited dependency/API patterns
- [ ] 5.4 Implement symmetric shutdown so root exit closes descendants, guardian failure relies on kernel containment, supervisor disconnect makes the guardian stop locally, and update stop intent uses the same bounded close path; verify fixture tests cover each trigger and one terminal outcome
- [ ] 5.5 Preserve root exit codes and child-produced final terminal spacing after descendant cleanup, while reporting cleanup failure separately when needed; verify transparent fixture tests assert exact output bytes/spacing and resulting shell exit status

## 6. Cut all profiles over and remove the singleton

- [ ] 6.1 Run bare `a1` under the guardian so the owned UI and all SDK, extension, tool, and agent descendants inherit its containment; verify an owned-UI fixture that spawns a grandchild leaves no runtime process after normal or abrupt instance close
- [ ] 6.2 Run `a1 pi` and `a1 sandbox` under the same guardian while preserving exact argv, cwd, profile roots, sandbox trust override, inherited terminal handles, and transparent direct attachment; verify existing profile and transparent-launch tests plus new concurrent-instance assertions
- [ ] 6.3 Remove foreground broker acquisition/release ownership, the singular supervisor field, old heartbeat commands, the one-live-lease index, and global busy launch diagnostics after every profile uses launch instances; verify repository searches and architecture tests find no production singleton lease path
- [ ] 6.4 Add an integration fixture that launches several same-profile and mixed-profile instances concurrently, closes them in different orders, and asserts each root/descendant tree and lifecycle record remains isolated; verify the fixture passes in CI without depending on a physical desktop
- [ ] 6.5 Verify a stale or uncertain historical instance never blocks a new interactive launch, while its uncertain process is not terminated; add an integration test reproducing the original stale-sandbox incident and asserting the same `a1 sandbox` invocation starts normally

## 7. Make release coordination plural

- [ ] 7.1 Change cohort selection and ownership probes to derive activity from all current verified launch instances rather than one generation; verify tests cover zero, one, and multiple active instances across one immutable release
- [ ] 7.2 Fan update shutdown out to every active instance with idempotent stop requests and one aggregate deadline, requiring all verified outcomes before replacement; verify update tests cover mixed fast, delayed, failed, disconnected, and identity-uncertain instances
- [ ] 7.3 Ensure completion of one instance never publishes the cohort idle while another remains active and uncertainty blocks only unsafe cohort replacement, not unrelated interactive startup; verify endpoint and update-transition integration tests cover both rules
- [ ] 7.4 Verify rollback and prior-release handling never mix singular-lease clients with the plural protocol or treat migrated rows as live; add release-compatibility tests for old endpoint metadata and old control databases

## 8. Document, validate, and reconcile future plans

- [ ] 8.1 Update launch-profile, architecture-boundary, recovery, update, and troubleshooting documentation to describe concurrent non-detachable instances, automatic process-tree closure, and the optional idle supervisor; verify documentation governance tests contain no instruction for users to kill PIDs or delete control state for ordinary launch recovery
- [ ] 8.2 Revise the held `evolve-bare-a1-into-multi-agent-workspace` planning artifacts so default structured agents and any future composed host belong to the originating bare-`a1` instance and do not survive its closure, while preserving the explicit ON HOLD marker; verify OpenSpec validation passes and no task is resumed or marked complete by that revision
- [ ] 8.3 Add exact packaged Windows acceptance instructions and an isolated-worker/manual checklist covering multiple simultaneous `a1`, `a1 pi`, and `a1 sandbox` instances, terminal-window closure, root exit with descendants, crash cleanup, and unrelated-instance survival; verify evidence names the exact release and containment artifact digests
- [ ] 8.4 Push the implementation pull request into `develop` and use the required GitHub Actions validation as the completion gate, fixing any CI failures without running prohibited local test suites
- [ ] 8.5 Obtain and record user-controlled acceptance that concurrent commands launch without a global conflict and that closing each command removes only its complete runtime process tree; leave publication and archive tasks incomplete until this exact-artifact verdict is accepted
