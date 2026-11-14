## 1. Shared normal-product API lifecycle for both launchers

- [x] 1.1 Introduce an explicit immutable runtime integration context captured at independent UI entry; ordinary and compatible launch fixtures assert one runtime identity across color control, terminal reporting and existing worktree/session context.
- [x] 1.2 Move integration start/replacement/disposal policy into a focused lifecycle owner, with composition only constructing and connecting the existing API owners; lifecycle fixtures assert one endpoint/reporter and idempotent bounded teardown.
- [x] 1.3 Route both normal entrypoints through that owner without grammar/profile changes; parity fixtures cover external color commands and attached built-in tool/worktree context, including extension startup and session replacement.
- [x] 1.4 Preserve comparison/noninteractive/unsupported-context exclusions and existing CLI JSON/capability schemas in focused negative regressions; document that API parity is not identical launcher grammar or a second control CLI.

## 2. Ordered successor reporting through ordinary publication contention

- [x] 2.1 Add a deterministic regression from the recorded disposable reproduction: hold a legitimate predecessor publication beyond 250 ms, start a successor, settle normally and require its ready identity to publish; record its failure before the production correction.
- [x] 2.2 Separate short ordered reservation intent from long Core-I/O settlement using the existing per-terminal coordination boundary; fixtures cover delayed startup, bounded deferred promotion, coalescing, cancellation and no reacquisition by superseded intents.
- [x] 2.3 Preserve the existing I/O guard and exact acknowledged-publication lineage across promotion, including participating older-format runtimes; mixed-runtime fixtures assert that late predecessor completion cannot roll back ownership or lose the provenance needed for safe label replacement.
- [x] 2.4 Keep endpoint readiness and current session generation authoritative throughout startup/replacement/shutdown; race fixtures assert no pending or unavailable identity is advertised and no older cleanup touches a successor.
- [x] 2.5 Retain fail-closed behavior for persistent locks, unsettled writes, partial/foreign labels, malformed coordination and missing Core; negative fixtures assert no stealing, reset, broad clearing, rapid retry or cross-terminal/profile mutation.

## 3. Safe membership-driven color convergence for compatible sessions

- [ ] 3.1 Add a disposable packaged compatible-start fixture through real CLI, bootstrap and UI composition, including a fresh start and same-terminal relaunch after a predecessor; public identity and acknowledged color commands must target the resulting live session rather than an injected reporter identity.
- [ ] 3.2 Connect that producer to a fixture of the existing consumer contract and move same-machine membership between two spaces without focus changes; local and remote routing cases include inactive tabs and delayed adoption-label acknowledgement.
- [ ] 3.3 Add stale/partial/expired/future/ambiguous, moved-again and replacement-during-pending-request cases; assertions preserve peer colors, Default color, invocation replacement policy and unrelated profile/extension state.
- [ ] 3.4 Document mode-independent supported APIs, normal-versus-compatible parity, ownership-blocked availability limits and user-controlled relaunch requirements; retain the distinct comparison exclusion and make no live deployment or hot-patch claim.
