# Native fixture execution boundary

## Current security state

Defender reported `Trojan:Win32/Bearfoos.A!ml` for the locally built terminal-host role fixture and its release-isolation copies. The files are quarantined. Source provenance and successful tests do not establish a false positive. Do not restore, rename, whitelist, exclude or rebuild a flagged file to escape detection.

Local A1 native compilation and execution remain paused. The `check:local` package script is an explicit non-native path: typechecking, static architecture/identity checks and the pure fixture-policy regression file. It does not prepare a package, build A1 native artifacts, run Cargo or execute native process integration. Passing it is not native certification or a security verdict.

## Interlocks

- The terminal-host Cargo build script refuses fixture/fault-injection features before the ordinary local-build override or VT preparation unless reviewed CI context is available.
- Role-host, fake-tab and fixture-enabled role dispatch check again at runtime. Clean-environment fixture children can use their compile-time run binding, but must still find the matching ephemeral receipt. A copied CI fixture is not a generally runnable workstation tool.
- Native probe, chaos and real published-predecessor launch entrypoints check before executing their workloads.
- Generic `CI=1` and the local VT override do not grant permission.
- These are accidental-execution interlocks, **not a sandbox or cryptographic attestation**. A JSON document or environment variable does not implement OS isolation. The trusted provisioner and protected workflow remain responsible for the actual boundary.

## Required provisioned CI boundary

The native execution environment must be disposable, reviewed for the exact candidate, carry no production credentials, and restrict workload egress to loopback. Its protected GitHub environment is `native-fixture-security-review`. Windows real-time protection stays enabled; new detections, including quarantined detections, fail validation. Do not upload executable artifacts after a failed security check. Ordinary test failure and security failure must both reach the protected aggregate.

The provisioner—not candidate code or a developer hand-written file—must provide a `reviewed-isolated-ci-v1` receipt at the job's configured receipt path. It binds the actual checked-out head, run ID and attempt, protected environment, disposable lifetime, credential stripping, loopback-only egress, approved review and active Windows Defender. The private environment keys and fixture build bindings are registered in the naming policy. No production credentials or execution authority are stored in the receipt.

Multi-release copies, unchanged-process identity assertions and every required platform lane remain part of native validation. Do not replace them with mocked vectors or silently skip a missing boundary. Dependency preparation must finish outside the restricted workload before fixture execution; the workload must not receive the preparation credentials.

## Concrete unresolved prerequisites

At this refinement, repository environment inspection lists only `npm-publish`; no reviewed native-fixture environment or isolation provisioner has been established. The PR's new interlock deliberately refuses native execution rather than manufacturing a receipt. Provisioning and verifying the sandbox, its protected approval rules, the trusted receipt producer and the other Full regression/publication callers remain required work before readiness. No native runs are authorized merely by this document.

The previous finalized candidate also has a real macOS predecessor failure: `resident source belongs to another boot or login`. The shorter socket directory fixed the prior path failure but did not certify custody. Preserve the boot/login fence; investigate the actual kernel identity and predecessor contract instead of disabling comparison. This is a separate unresolved platform gap, not evidence that quarantine is a false positive.
