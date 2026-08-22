# Launch-instance exact-artifact acceptance

Run this checklist only against a packaged candidate on a user-controlled terminal or isolated disposable Windows worker. Do not automate launching, focusing, driving, or closing terminal windows on an active workstation.

## Artifact identity

Record before testing:

```text
A1 release ID:
A1 package version:
Source commit:
Candidate tarball SHA-256/integrity:
Process guardian target: win32-x64
Process guardian crate version:
Process guardian protocol version:
Process guardian SHA-256:
Process guardian signature/attestation status:
Machine/Windows/terminal versions:
Tester or worker attestation:
```

The process guardian values must match `dist/native/win32-x64/manifest.json` inside the exact installed candidate. Stop if the file is missing, mismatched, altered, or reports an unsupported capability.

## Concurrent launch matrix

Open four independent terminal tabs and launch:

```text
Terminal 1: a1
Terminal 2: a1
Terminal 3: a1 pi
Terminal 4: a1 sandbox
```

Confirm all four become usable without a global foreground-lease error. Record each launch-instance ID from supervisor metadata and verify all four IDs are distinct.

## Isolated closure

1. Exit Terminal 3 normally. Confirm only its vanilla Pi tree exits; Terminals 1, 2, and 4 remain usable.
2. Close the Terminal 4 tab/window without exiting Pi first. Confirm its sandbox Pi, extension daemons, agent workers, tools, and descendants disappear within the bounded deadline while both bare-A1 terminals remain usable.
3. Exit Terminal 1 normally after causing a fixture extension to create a child and grandchild. Confirm the complete tree disappears and Terminal 2 remains usable.
4. Force the Terminal 2 launch guardian to fail on the isolated worker. Confirm Job Object kill-on-close removes its root and descendants and leaves unrelated fixture processes alive.

Record root, child, and grandchild native identities before each close and the observed terminal outcome afterward. Do not substitute manual PID termination for a failed cleanup.

## Stale-state recovery

Using isolated control directories, install a version-4 fixture database containing one requested or active legacy foreground lease whose former PID is dead. Run `a1 sandbox` once. Confirm that the same invocation migrates the row to historical interrupted state and launches normally without restarting the supervisor, deleting state, or discovering a PID.

Repeat with an ownership-uncertain fixture process. Confirm a new independent launch still starts and the uncertain unrelated process is not terminated.

## Update fan-out

With at least three mixed-profile instances active, run the candidate's update-shutdown fixture. Confirm every instance receives one stop intent, each complete process tree closes, and cohort replacement occurs only after all verified terminal outcomes. A delayed or uncertain instance must prevent unsafe replacement without causing another instance to be reported idle prematurely.

## Verdict

Record one of:

```text
ACCEPTED — exact package and guardian digests above passed every scenario
REJECTED — include failed step, observed process identities, outcomes, and diagnostics
```

Acceptance applies only to the exact package and process-guardian bytes recorded above. It does not certify macOS, Linux, composed terminals, detached agents, or an operating-system security sandbox.
