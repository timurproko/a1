## 1. Preserve and expose the macOS failure

- [ ] 1.1 Record run `34022380161`, source `4e7901f3e0105ae5de6c54be49dc2728677a3f74`, candidate `0.1.8-dev.254`, successful Linux/Windows Node 24 outcomes, macOS supervisor-readiness timeout, Windows Node 22 budget failure, skipped publisher, and failed aggregate in structured evidence; verify every job identity and conclusion against GitHub
- [ ] 1.2 Add a correlated one-shot supervisor startup result bound to an unguessable attempt and exact release identity, with atomic ready/failure publication, bounded sanitized fields, and retention cleanup; verify unit tests reject stale, malformed, oversized, mismatched-release, and mismatched-attempt records
- [ ] 1.3 Make bootstrap race verified endpoint readiness, matching startup failure, and child exit within the existing bound; verify an injected pre-listen failure reports its stage/code/outcome instead of only `supervisor did not publish verified endpoint metadata`
- [ ] 1.4 Reproduce the exact packaged macOS failure with startup evidence, record the concrete pre-listen authority and error, and repair that authority without weakening release certification, immutable-root validation, storage, or endpoint ownership; verify focused macOS success and injected-failure tests

## 2. Certify Darwin process containment

- [ ] 2.1 Add Darwin native process start-identity inspection using a supported platform API and expose it through the bounded guardian inspection protocol; verify live identity stability, exited-process absence, PID-reuse discrimination, malformed PID rejection, and architecture-specific build coverage on macOS
- [ ] 2.2 Add a Darwin guardian provider that spawns without a shell, creates a dedicated process group before exec, publishes root/containment identities, monitors parent liveness, applies bounded TERM/KILL group cleanup, and reports exact root outcomes; verify native integration tests cover normal exit, descendants, owner loss, forced shutdown, and unrelated-process preservation
- [ ] 2.3 Implement Darwin foreground-terminal transfer and restoration with the same no-terminal fallback as Linux; verify pseudo-terminal tests cover foreground ownership during launch, restoration after normal/signaled exit, and restoration after startup failure
- [ ] 2.4 Route Darwin launch-instance inspection and containment through the certified native provider, change the packed Darwin manifest to `supported` only after verification, and retain fail-closed rejection for missing, incompatible, unsupported, or tampered artifacts; verify TypeScript artifact/launch tests and the exact packed manifest

## 3. Gate macOS before publication

- [ ] 3.1 Extend macOS-focused pull-request validation to run native guardian identity/containment and correlated supervisor-startup coverage when affected boundaries change; verify validation policy tests fail if those checks are omitted or converted to skips
- [ ] 3.2 Extend exact-package macOS evidence to preserve bounded supervisor startup diagnostics and exercise package surface, supervisor readiness, session creation/resume, concurrent cleanup, and parent-loss containment against the one candidate; verify the pre-fix `.254` path fails and the corrected candidate passes without retries
- [ ] 3.3 Run focused native, supervision, packaged-session, validation-policy, typecheck, architecture, changed-file documentation, and strict OpenSpec validation; verify no Windows/Linux containment semantics, package manifest/lock, dependency, publisher, or unrelated file changes are included
- [ ] 3.4 Push a fresh implementation branch and open a code pull request citing this change with auto-merge disabled; verify current-head required CI passes, provide exact commit and focused commands for maintainer review, and leave manual merge pending explicit acceptance

## 4. Publish and record acceptance

- [ ] 4.1 After this correction and the separate Windows Node 22 startup-margin correction are accepted and manually merged, update authoritative `develop` and run `npm run develop` once; verify a new exact package passes Windows Node 22/24, macOS Node 24, Linux Node 24, publisher, aggregate, integrity, and registry `next` checks without retries
- [ ] 4.2 Install the published preview on macOS and verify the packaged public chain reaches input-ready state, the native guardian reports certified Darwin containment, and normal exit/owner-loss cleanup leaves no owned descendants
- [ ] 4.3 Record implementation PR/current-head CI, merge identity, corrected macOS startup diagnosis, native containment evidence, package number/digest/integrity, every platform result, publisher/aggregate outcomes, registry `next`, and maintainer acceptance, then synchronize and archive the completed change
