# Native fixture execution boundary

## Security state

Defender reported `Trojan:Win32/Bearfoos.A!ml` for the locally built terminal-host role fixture and its release-isolation copies. Keep those files quarantined. Source provenance and passing tests do not establish a false positive. Do not restore, rename, whitelist, exclude or rebuild a flagged file to escape detection.

Local A1 native compilation and execution remain paused. `npm run check:local` performs typechecking, static architecture/identity/naming checks and the two non-native fixture policy/isolation test files. It does not prepare a package, run Cargo, build native A1 artifacts or launch A1. Passing it is neither native certification nor a security verdict.

## Interlocks and approval

The terminal-host Cargo build script refuses fixture/fault-injection features before the ordinary local-build override or VT preparation without an exact-run receipt. Role-host, fake-tab, feature-enabled dispatch and the normal probe/chaos/published-resident launchers check again. Clean-environment fixture children retain the compile-time run binding but still require the matching ephemeral receipt. Generic `CI=1`, a copied fixture and the old VT override do not grant workstation execution permission.

These interlocks are **not a sandbox or cryptographic attestation**. The reviewed controller supplies the actual boundary. `run-isolated-native-fixtures.mjs prepare` accepts only an immutable GitHub-hosted job. It checks the protected `native-fixture-security-review` environment and this run's deployment review history for approval by a configured human `User`, not a bot or an unconfigured user. The environment is configured with `timurproko` as its required reviewer. The agent does not approve deployments. A security review authorizes isolated execution, not a false-positive verdict or local quarantine restoration.

The controller binds the actual checkout, run ID and attempt. It prepares public dependencies with install scripts disabled before restricting workload networking; the workload uses an offline public package cache. No preparation token, SSH socket, proxy, arbitrary ambient variable or GitHub special-file path enters the workload environment. Only a private generated request reaches the child. Workload stdout cannot issue GitHub workflow commands while it is streamed back.

## Privilege-separated workload

The controller and its source/modules remain outside the workload's writable checkout. A separate exact-head checkout, public toolchain copies and a new restricted OS account own execution. Generated evidence is shared through `.artifacts/`; controller state, account credentials and runner transport files are not shared. The account cannot modify the controller's source and cause a later privileged step to execute modified code.

- **Windows:** a fresh non-administrator local SID runs limited scheduled tasks. Protected filesystem ACLs deny access to the runner profile, temporary special files and the actual runner installation. Per-SID Windows Firewall rules block non-loopback IPv4/IPv6 egress, including detached/breakaway descendants. The task bridge verifies its actual SID and non-administrator token before clearing ambient environment and launching Node. Account credentials are ephemeral and DPAPI-protected outside the workload.
- **Linux:** a fresh locked service account runs Bubblewrap with separate user, PID and network namespaces, no capabilities, masked runner homes/temporary storage and read-only controller source. Namespace init owns detached descendants. This headless account has one provisioner-owned `XDG_SESSION_ID` service-login scope; it does not borrow the runner's interactive login or alter product admission rules. Exact native UID/PID/start, boot, source epoch and authentication fences remain required.
- **macOS:** a fresh non-login UID runs `sandbox-exec`. The inherited sandbox blocks non-loopback network operations, runner-home reads and writes to controller source. The dedicated UID also permits cleanup of detached descendants without targeting the runner's own processes.

Before emitting a receipt, the controller runs the same restricted worker and requires real loopback connectivity, a failed external connection to an endpoint reachable from the parent, denial of a world-readable runner-home credential canary, denial of controller-source write access and a non-privileged identity. Unavailable tooling, permissions or isolation fails the job; it does not skip mandatory evidence. The receipt contains no production credential and is emitted only after human review and these probes, never hand-written to turn the lane green.

## CI ownership and closure

Development native/runtime lanes, both Full regression execution jobs and both publication validation jobs use this boundary. Build, exact-package preparation, published-predecessor execution, native certificates and fuzz workloads run inside it. Required platform/identity assertions and unchanged process coverage remain mandatory. Fixture-mutated targets are not saved back to shared Rust caches.

Windows real-time Defender protection is required before execution and before each task. Existing runner detections refuse provisioning. After workload account/process closure, a synchronous Defender scan and detection-history check fail on new alerts, including quarantined ones. Executable contract artifacts require successful isolation, closure and security steps; required aggregates still see failures. No scanner exclusion, restoration or protection bypass is installed.

A controller or workload failure cannot establish successful isolation or test evidence. CI VMs are disposable even when cleanup cannot be proved. Normal successful teardown verifies closure before deleting the dedicated account or removing its network rules. State/receipts are exact-run metadata, not a license for workstation execution or another checkout.

## macOS custody repair and evidence boundary

The previous macOS predecessor failure, `resident source belongs to another boot or login`, used `audit_session_self()` as a login ID. That API returns a process-local Mach port name. The native identity implementation now reads kernel audit user/session IDs with unprivileged `getaudit_addr` instead.

Immutable predecessors can still advertise old Mach-port records. Such a record proves neither the same nor an ended login. The explicit source route requires unchanged boot, native PID/start identity, source credentials/epoch and a connected kernel `LOCAL_PEERTOKEN` matching the expected PID, real/effective UID and current audit user/session. Missing or mismatched peer proof refuses admission. Incomparable workspace metadata is retained rather than being treated as an ended login or positive live-control proof. Generic cross-release admission is unchanged.

Pure policy/workflow tests and static checks are local evidence only. The new Rust startup/audit regressions and actual OS isolation probes are written for reviewed CI, not claimed as locally compiled or executed. Exact-head Windows/Linux/macOS native results remain required by CI before integration. No claim here resolves the Defender classification or authorizes restoring the quarantined workstation files.
