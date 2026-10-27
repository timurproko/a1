## 1. Durable workspace ownership

- [ ] 1.1 Add stable workspace IDs, canonical existing-folder identity, deterministic labels/order, future-launch preference, and Agent membership to the existing release-scoped registry contracts and single commit path.
- [ ] 1.2 Preserve a supported pre-workspace collection as one legacy workspace, leave other releases untouched, and retain empty workspace metadata without restoring Agents after reboot/login changes.
- [ ] 1.3 Add bounded workspace/catalog messages, membership helpers, and host-authoritative revision/generation guards without increasing frame/queue limits or introducing another registry writer.
- [ ] 1.4 Add registry and pure-state regressions for same-folder duplicates, path aliases/subfolders, deterministic ordering, metadata recovery, legacy preservation, and long catalog boundaries.

## 2. Workspace-local routing and Agent lifecycle

- [ ] 2.1 Keep selected workspace, remembered Agent per workspace, sidebar state, and last-folder fallback local to each attach client; resolve workspace before initial admission and first body presentation.
- [ ] 2.2 Scope Agent list/default/create/rename/reorder/close-neighbor operations to workspace membership and bind every queued action/input to its admitted workspace, tab, revision, and view/controller generation.
- [ ] 2.3 Use the selected workspace root for new Agent resources without process-wide cwd changes or changing existing Agent cwd; report missing roots without a folder substitution.
- [ ] 2.4 Restrict background geometry fitting to the selected workspace's hidden/unclaimed Agents while preserving per-tab controller transfer and independent background engine/holder progress.
- [ ] 2.5 Preserve global Settings/Changelog utility singletons and client-local visibility/return targets; exclude utilities from workspace Agent ownership and counts.
- [ ] 2.6 Preserve internal standby/start bounds and require workspace/cwd/environment/release/runtime match before promotion instead of creating a pool per workspace.
- [ ] 2.7 Add two-client routing, queued stale-action, input/resize isolation, utility return-target, missing-root, prewarm, and independent-progress regressions.

## 3. Native workspace sidebar and empty-state UX

- [ ] 3.1 Add a collapsed-by-default three-cell chevron on the configured top/bottom strip and a v2-style native overlay with workspace rows, structured activity, distinguishing path context, Add, and Remove.
- [ ] 3.2 Implement sidebar focus/navigation/menu/modal precedence in the existing attach state machine, effective shortcut declarations/help/conflict handling, and pointer consumption without child input leakage.
- [ ] 3.3 Keep child PTY dimensions unchanged when toggling the overlay and keep narrow-terminal workspace actions reachable without adding push layout or a sidebar style setting.
- [ ] 3.4 Create/select an empty same-folder workspace from Add, preserve each workspace's remembered Agent, retain empty workspaces after the last Agent closes, and show landing after final workspace removal.
- [ ] 3.5 Commit workspace selection, Agent strip, folder context, body, overlays, and cursor as one current presentation without a wrong-repository or blank intermediate frame.
- [ ] 3.6 Add pure/native presentation regressions for top/bottom strips, keyboard-only actions, outside-click consumption, narrow geometry, complete-frame switching, long labels, and unchanged child input/selection/clipboard semantics.

## 4. Confirmed workspace removal

- [ ] 4.1 Prepare removal from authoritative Agent membership, silently remove only genuinely empty workspaces, and require refreshed consent if a member/start race invalidates that empty state or confirmed revision.
- [ ] 4.2 Add a cancel-default modal naming workspace, Agent count, running-tool/cross-terminal impact, and preservation of saved conversations/project files; idle/failed Agent tabs also require confirmation.
- [ ] 4.3 Fence confirmed workspaces as closing, reject creation/promotion/restart, retain a visible Closing state, and use existing bounded graceful/identity-verified forced shutdown for exact Agent trees.
- [ ] 4.4 Publish removal only after shutdown and durable mutation succeed; retain retryable records/authority on stop or persistence failure, including recovery after server replacement.
- [ ] 4.5 Apply adjacent-workspace or landing fallback only to clients viewing the removed workspace and leave unrelated workspace views, Agent sessions, files, utilities, and release holds unchanged.
- [ ] 4.6 Add idle/busy/queued/crashed/starting/failed Agent, hidden-standby, cancel, stale-consent, empty-add race, partial-stop, persistence-failure, multi-client, and server-recovery removal regressions.

## 5. Folder-based launch and session selection

- [ ] 5.1 Select the most recently selected workspace for the exact canonical launch folder regardless of existing viewers, creating the initial workspace/Agent only when that folder has no workspace.
- [ ] 5.2 Serialize concurrent first launches into one initial workspace and Agent while keeping explicit Add a separate creation intent; preserve existing empty-workspace landing on later launches.
- [ ] 5.3 Focus an already-held session's owning workspace/tab in the invoking client only and route an unheld resolved session by effective resumed cwd without changing current path/ID/trust/fork/writer-lock semantics.
- [ ] 5.4 Preserve solo, comparison, unsupported/non-interactive fallback, immutable-release coexistence, and fixed role/artifact custody without separate-terminal hosts.
- [ ] 5.5 Preserve invoking-release maintenance scope and include workspace identity/path context in redacted reports without changing stop-all/host-stop into cwd-scoped commands.
- [ ] 5.6 Add bootstrap, CLI/session, native-role, and isolated package regressions for two folders, multiple same-root workspaces, aliases, concurrent launch, held-session focus, cross-release conflicts, and unchanged direct/fallback behavior.

## 6. Delivery documentation and pre-ready bookkeeping

- [ ] 6.1 Reconcile affected architecture/user documentation with workspace-aware resident tabs, the no-folder-picker workflow, same-folder Add, safe removal, preserved utility behavior, and explicit exclusions; resolve overlap with any then-delivered SSH sidebar through approved refinement.
- [ ] 6.2 Complete focused typecheck, touched/native tests, strict OpenSpec validation, and concrete known-gap dispositions before final readiness without weakening existing latency/resource/safety contracts or running broad local suites.
- [ ] 6.3 Finish detailed task bookkeeping, add the plain implementation-specific PR Acceptance outcomes, reconcile/push current origin/develop, and pass the final delivery-body check before checking the last delivered outcome; leave readiness/finalization to trusted automation.

Planning-only status: every task remains unchecked. Creating this draft is not implementation authority or runtime evidence. Manual validation remains optional and does not gate an Implementation marker.
