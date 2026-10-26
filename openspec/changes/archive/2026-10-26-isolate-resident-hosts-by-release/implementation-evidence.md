# Release-isolated resident hosts: implementation evidence

## Delivered behavior

- Native `roles::scope` derives installed identity from the canonical immutable execution root, which embeds the release-management payload identity; display version and native target do not select authority. Standalone test roles instead bind their fixed entry/artifact custody. A domain-separated canonical profile/release digest retains the existing bounded 20-character endpoint suffix and flat state layout.
- Server discovery, startup gates, credentials, registry leases, epochs, budgets, diagnostics and holder-private recovery paths use that scope. Registry snapshots and owner markers record release identity. No new-format code binds a missing endpoint through the legacy profile-only fallback.
- Native attach, probe, internal, maintenance and holder hellos carry exact release identity. Admission rejects a different or missing identity before optional capability negotiation; native clients also check welcome identity. The child receives a holder-pinned private release identifier, consumes it before extension loading, and refuses a mismatched bridge welcome.
- Release-root validation and fixed originating Node execution occur before child launch. Client-supplied runtime choices cannot retarget a holder. Recovery uses the existing immutable native command rather than the globally active package pointer.
- CLI maintenance resolves the invoking package's immutable materialization without activating a release or starting a host. It never substitutes a different installed root or retries a recorded cohort after a generation mismatch. Unresponsive-owner termination additionally requires the matching release marker.
- GC reads all flat release namespaces and the legacy namespace without migration. Directory/link/Unix ownership checks, a namespace count bound, a shared record-byte budget and existing identity verification turn uncertainty into retention, not deletion. Session storage and the process-owned OS writer locks remain shared across releases.
- The new standalone release-isolation integration suite is explicitly included in the main native CI lane when the older role suite runs in partitions. Existing role assertions, input cadence, latency gates and traffic/resource limits are not relaxed.

## Local results

Platform: Windows x64, Node 24.22.0. Native builds use the verified prebuilt Ghostty library and the repository-resolved Microsoft compiler environment.

- `npm run build` and `npm run typecheck` passed, including normal generated runtime resources and the feature-free shipping addon.
- 56 focused TypeScript tests passed across maintenance, release holds, launch-context consumption, bridge/launch behavior, CLI maintenance and product-identity governance/inventory. Another 19 startup-policy, identity-boundary and native-partition cases passed.
- Selected native module filters passed: scope, release holds, registry, holder, attach and server. These include independent scope/secret authority for equal tab identities, legacy/new retention, stopped-release retention, existing permission/path primitives, and existing input/controller/recovery cases.
- Both new real-process integration cases passed. They run copied fixture images with distinct immutable identities under the same profile/data/runtime roots. Each host owns an Agent named `tab-1`; starting B preserves A's server/child identities, B's wrong-release probe is refused, A recovers after activation metadata points to B, stopping B's `tab-1` leaves A alive, legacy registry bytes and its held startup gate remain untouched, and existing/new session locations remain writer-exclusive until process exit.
- The exact optimized fixture passed terminal fidelity and all 18 real-A1 parallel-progress scenarios, temporal/direct parity, fragmented writes, pressure/reconnect behavior and all four stopped-stage controls with zero report faults. Resident typing/navigation/wheel p95 was 21.89/31.20/24.63 ms, each with 40 samples and the unchanged direct-solo-plus-49-ms envelope. The unprofiled report is disposable local evidence under `.artifacts/agent/final-parallel-progress.json`.
- Shipping addon features report neither fault injection nor resident fixtures, and the fixture build-profile API is absent. Timing uses a separate release-optimized fixture with controls retained.
- Architecture, documentation and identifier governance pass. Size-ratchet entries were lowered for extracted/shrunk functions; no size, startup, latency or protocol threshold was increased.

## Known-gap dispositions

- Local legacy role fixture `server_holder_and_attach_survive_client_loss_and_retain_output` could not establish its existing strict detached-start result inside this shell tool's Windows job environment: native verification reported `resident child remained in a job`, and the existing exactly-one-started assertion failed. Disposition: preserve the assertion and native detachment safeguards unchanged; exact-head native CI must supply its ordinary detached-runner evidence. This is not claimed as a passing local detachment or physical-terminal result.
- Initial partial TypeScript compilation lacked normal generated runtime resources and could not start all observed real-A1 renderers. Disposition: run the normal build, not a partial compiler output; the full optimized 18-scenario run then passed without altering any harness deadline or gate.
- Linux/macOS execution and installed-package two-terminal physical behavior were not exercised on this workstation. Disposition: retain independent platform CI verdicts and ordinary optional maintainer validation; Windows results do not certify another platform or physical terminal pixels.
- Existing installed resident and solo processes were not restarted, migrated or terminated. Only isolated fixture processes belonging to this worktree were stopped.

## CI repair: release-aware invalid-owner fixtures

Development run `40298295274` failed Linux role partition 2/3 in `recovery_refuses_unverifiable_owners_and_enforces_the_start_budget`: its hand-written marker omitted `releaseId`, so release admission refused it before the intended invalid-start-identity check. The second hand-written PID-reuse marker in `host_stop_refuses_an_unverifiable_owner_and_changes_nothing` had the same stale shape. Both fixtures now declare their actual immutable fixture release so their original PID/start-identity and restart-budget assertions remain authoritative.

Recovery also preserves the existing `host-recovery-blocked` diagnostic prefix when a marker's release is missing or mismatched. A separate real-process regression supplies both kinds of marker while naming a different release's live, identity-verified server; recovery and host stop must refuse, leave the marker bytes unchanged, and leave that server's exact native identity alive. This separates release refusal coverage from PID-reuse coverage instead of accepting either failure as a substitute.

The two existing recovery/stop regressions and all three release-isolation integration cases passed locally on Windows, along with typecheck, architecture and documentation governance. No guard, assertion, timeout, restart budget or platform gate was relaxed. Fresh exact-head Linux/platform CI remains required; cancelled matrix lanes from the failed run are not treated as successful evidence.
