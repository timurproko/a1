# Launch-instance exact-artifact acceptance

Run this checklist only against a packaged candidate on a user-controlled terminal or isolated disposable Windows worker. Do not automate launching, focusing, driving, or closing terminal windows on an active workstation.

## Artifact identity

Record the A1 release ID, package version, source commit, candidate integrity, process-guardian target/version/protocol/integrity, platform and terminal versions, and tester attestation. The guardian values must match `dist/native/win32-x64/manifest.json` inside the exact installed candidate.

## Concurrent launch matrix

Open four independent terminal tabs:

```text
Terminal 1: a1
Terminal 2: a1
Terminal 3: a1 pi
Terminal 4: a1 pi
```

Confirm all four become usable without a global foreground-lease error and have distinct launch-instance IDs.

## Isolated closure

1. Exit Terminal 3 normally. Confirm only its Pi comparison tree exits.
2. Close Terminal 4 without exiting first. Confirm its complete process tree disappears while both bare-A1 terminals remain usable.
3. Exit Terminal 1 after causing a fixture extension to create a child and grandchild. Confirm the complete tree disappears and Terminal 2 remains usable.
4. Force the Terminal 2 launch guardian to fail on the isolated worker. Confirm containment removes its root and descendants and leaves unrelated fixture processes alive.

Record root, child, and grandchild native identities before each close and the observed terminal outcome afterward. Do not substitute manual PID termination for failed cleanup.

## Stale-state recovery

Using isolated control directories, install a version-4 fixture database containing one requested or active legacy foreground lease whose former PID is dead. Run bare `a1` and confirm the invocation migrates the row to historical interrupted state and launches normally.

Repeat with an ownership-uncertain fixture process. Confirm a new independent launch still starts and the uncertain unrelated process is not terminated.

## Update fan-out

With at least three mixed-profile instances active, run the candidate's update-shutdown fixture. Confirm every instance receives one stop intent, each complete process tree closes, and cohort replacement occurs only after all verified terminal outcomes.

## Verdict

Record either exact-artifact acceptance or rejection with the failed step, process identities, outcomes, and diagnostics. Acceptance applies only to the recorded package and process-guardian bytes.
