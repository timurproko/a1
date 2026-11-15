## Evidence and scope

User requests deep diagnosis and repair of repeated publication failures, including CI repairs, before another build. The earlier timeout-only proposal is superseded by evidence-first diagnosis. Integration remains a separate exact-candidate maintainer decision.

Latest failure: run 43756300714, source 58018652, staged version 0.2.7-dev.1320. The public predecessor remains 0.2.7-dev.1307. The exact published-pair artifact records successful fresh installation (124146 ms), successful predecessor installation (115501 ms), and failed predecessor update (901362 ms). The recovery worker begins at 20:24:48.899Z, its last heartbeat is 20:27:13.348Z, and no result.json exists. The npm log ends at 20:27:10.738Z after protobufjs postinstall, without its normal exit record. Inventory finds no remaining fixture processes at the update deadline. Candidate files and npm launchers exist but this is not proof that npm completed successfully.

Run 43750083689 shows the same 1307-to-1319 failure: recovery heartbeat stops at 19:20:39.771Z; npm's last record is 19:20:39.217Z; the parent times out at 19:33:37.569Z. Run 43738961066 times out at the harness's former ten-minute limit. Increasing the harness allowance only exposed the predecessor's internal fifteen-minute timeout; it did not repair a process.

The latest Defender evidence reports RealTimeProtectionEnabled=false and BehaviorMonitorEnabled=false, with no detection/remediation event. The earlier antimalware hypothesis is not supported by these records. There is no recorded application crash, but ordinary unhandled JavaScript errors do not necessarily generate a Windows Application Error record.

Last successful workflow 43626091295 published 1305 from e7de9aba. Its smoke only exercised fresh installation, not predecessor replacement. Run 43634036658 staged/promoted 1307 but failed fresh install across platforms because registry metadata preceded tarball availability. PR 936 introduced staging-before-promotion and the actual predecessor-update smoke, exposing a previously untested boundary. PR 941 repaired canonical recovery-entry dispatch for aliases on macOS. PR 943 repaired harness process settlement. PR 947 extended Windows time budgets. PR 948 added sampling/system events. These changes address distinct failures or visibility; none establishes the terminator of the 1307 worker in the hosted smoke.

## Local investigation

The unchanged 1307-to-1320 pair passes locally in about seventy seconds. A fixture-scoped Node preload captures worker stderr, process exits, and uncaught exceptions without changing installed package files. Repeating under the exact hosted Node 24.22.2 and npm 11.19.1 also passes. Thus a runtime-version mismatch alone does not explain the hosted failure. Keeping an ordinary Node read handle open across the old worker heartbeat does not reproduce a failure locally; a Windows sharing-race explanation is not yet proven either.

## Diagnostic design

Add an explicit workflow-dispatch diagnostic route to Development validation, selecting one existing version and a Windows runner. It reads exact npm metadata and runs the same published smoke, never stages, promotes, rebuilds, or republishes packages. Ordinary validation routing is unchanged when diagnostic input is absent. The diagnostic preload retains worker stderr and exit codes/uncaught exceptions; sanitized bounded evidence is uploaded even when the reproduction fails. Worker package bytes and capsule integrity checks remain unchanged. A native failure is required before selecting a root-cause repair; a local pass is not claimed as live recovery.

## Known gaps

The terminator and exact exception of the hosted predecessor worker remain unidentified. Native diagnostic evidence is required before declaring a root cause or publication recovery. Subsequent repair details will be reconciled here from captured evidence, not guessed from elapsed time.
