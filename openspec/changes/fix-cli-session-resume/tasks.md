## 1. Public selection contract

- [ ] 1.1 Add the typed optional normal-A1 session selection and parse both supported option orders; verify parser tests select an interactive A1 intent with the original target/directory values.
- [ ] 1.2 Reject missing/empty values, duplicate options, standalone `--session-dir`, extra arguments, and unknown options within recognized session grammar; verify nonzero status, focused diagnostics, and zero launch/maintenance handler calls.
- [ ] 1.3 Update usage/help while retaining bare fresh launch, maintenance dispatch, unsupported-word no-ops, and comparison restrictions; verify stable/prerelease dispatch and help tests cover each unchanged branch.

## 2. Invocation-scoped launch transport

- [ ] 2.1 Thread selection through release bootstrap and guardian entry/options into contained UI argv using separate argument values; verify a launch-chain test observes identical target/directory values at every boundary, including spaces, apostrophes, and Windows paths.
- [ ] 2.2 Preserve selection in supported launch retries/handoffs and make the color-preserving development launcher accept the same normal-A1 grammar; verify retry/launcher tests retain selection and bare launches inherit no stale `PI_SESSION_ID` or `PI_SESSION_FILE` selection.
- [ ] 2.3 Remove the internal UI's path-only grammar mismatch and validate the transported selection before composition; verify malformed internal input is rejected and two concurrent distinct-session invocations cannot overwrite each other's selection or cleanup ownership.

## 3. Pi-backed target resolution

- [ ] 3.1 Add path-versus-ID classification and explicit/environment/default directory precedence at the Pi boundary; verify relative paths bind to invoking cwd and isolated custom/default stores resolve with pinned project filtering.
- [ ] 3.2 Resolve local exact/prefix then global exact/prefix matches using public Pi listing APIs; verify local precedence, pinned ambiguous-prefix ordering, unknown-ID failure, and no implicit discovery in the ordinary Pi profile.
- [ ] 3.3 Add cross-project ID fork confirmation before conversation startup; verify acceptance creates a new identity in the invoking cwd with source history intact, while decline/cancel writes no fork and exits with explicit cancellation output.
- [ ] 3.4 Guard missing, empty, unreadable, invalid, and disappearing targets without a replacement-session fallback; verify focused nonzero errors and no target overwrite, fresh conversation, or file named after an ID, including a deterministic lookup/open race case where the harness permits it.

## 4. Runtime restoration and exit behavior

- [ ] 4.1 Open existing targets without unconditional cwd override and initialize runtime/trust/services from the manager's effective cwd; verify explicit foreign-project files use their stored cwd, missing cwd fails clearly, and untrusted project resources do not execute before trust resolution.
- [ ] 4.2 Pass the resolved manager through the existing runtime factory and render restored state before prompt acceptance; verify session ID/file, active branch, legacy and retained-tail compaction fixtures, saved model/thinking state and normal model fallback without any automatic model prompt.
- [ ] 4.3 Propagate expected startup failures and cancellation outcomes through the guardian to the public command; verify concise shell diagnostics, correct exit status, terminal restoration where applicable, and no leaked instance-owned processes.
- [ ] 4.4 Connect normal-A1 exit hints to the supported public grammar and suppress hints for unpersisted sessions; verify both exit-output modes preserve compact IDs, custom-directory quoting, styling, and cleanup order.

## 5. Connected regression evidence

- [ ] 5.1 Create disposable isolated profile/session fixtures and packaged-entry round-trip coverage using the real production launch transport; verify an emitted default-directory hint restores the intended ID and recognizable conversation/context instead of merely invoking a stubbed handler.
- [ ] 5.2 Add the corresponding custom-directory round trip and Windows Git Bash shell-quoting coverage for spaces/apostrophes; verify one original directory argument reaches the runtime and the expected session reopens through the public packaged entry.
- [ ] 5.3 Cover packaged-entry negative resolution and distinct simultaneous resume invocations; verify nonzero failure/no accidental files for invalid targets and independent session identity/cleanup for concurrent valid targets, with isolated home/release/control state and no live credentials or model network calls.
- [ ] 5.4 Ensure applicable CI selection includes the parser, transport, Pi restoration, and packaged-entry evidence in their appropriate resource scopes; verify required CI checks pass without converting expensive integration evidence into an unconditional fast-suite workload.

## 6. Acceptance evidence

- [ ] 6.1 Provide the runnable implementation's exact build-first `./scripts/dev --session ...` handoff using a disposable saved-session fixture, then exercise the emitted hint through the installed candidate; verify the user reports the original conversation and session identity are restored, including custom storage on Windows Git Bash.
- [ ] 6.2 Record implementation commit, applicable CI results, normal-profile acceptance, and explicit excluded aliases/comparison behavior; verify the acceptance record distinguishes the completed resume repair from broader Pi CLI parity before requesting completion/archive.
