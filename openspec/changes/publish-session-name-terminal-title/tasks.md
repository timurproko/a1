# Tasks

## 1. Authoritative session metadata publication

- [x] 1.1 Handle Pi's public `session_info_changed` event through the existing view-publication port; add a focused `session-events.test.ts` assertion that the event publishes a view.
- [x] 1.2 Add adapter-level tests showing that changed and cleared manager names reach the footer from authoritative state even when the event payload disagrees; retain explicit owned `/name` view publication for fake sessions without Pi events.

## 2. Bare-A1 core title synchronization

- [x] 2.1 Record title writes in `TestPresentationTerminal` and add the private presenter synchronizer using the existing terminal title port and centralized product fallback; cover named/unnamed startup, control-only names, safe control replacement, ordinary Unicode, internal spaces, and emoji joiners.
- [x] 2.2 Wire title synchronization after terminal startup and authoritative view refreshes, excluding render and transcript-block streaming; cover direct and successive `/name`, public metadata changes and clearing, duplicate workflow/event views, and unchanged view/status/model/usage/stream events.
- [x] 2.3 Cover session rebinding through new/resume/fork/clone and supported session-switch workflows in existing fixtures, asserting the new name or fallback and no redundant write for the same normalized logical title.

## 3. Presentation ownership and compatibility

- [x] 3.1 Force title restoration on activation only for eligible started/running bare-A1 presenters; add host tests for inactive startup/name changes, activation before startup, second-presenter attachment, reattachment, and close/disconnect/disposal without stale title writes.
- [x] 3.2 Add extension coexistence coverage: `Working...` survives unrelated views but yields to a changed name or activation; cover comparison startup/name changes producing no added automatic titles while extension title calls remain functional.

## 4. Pre-ready integration checks

- [x] 4.1 Run typecheck, only the changed owner-level test files, and strict validation of this change; reconcile any failures without weakening assertions and disposition concrete known gaps in the design before the final Implementation checkbox.
- [ ] 4.2 Reconcile and push current `origin/develop`, add plain PR Acceptance outcomes, and pass the delivery-body final check before checking the final Implementation item; confirm the pushed diff remains scoped to this approved behavior and its tests.

## Workflow follow-up

- This planning-only draft requires explicit plan approval and an implementation request before code or test edits.
- Complete and check each outcome truthfully in the same draft PR. Trusted automation, not the implementing agent, owns readiness, finalization, and required CI after the final checkbox.
- Manual terminal-host observation is optional and does not block implementation progress. Herdr's path/sidebar formatting is outside the standard title contract.
- No resident host or tab UI is introduced; attachment coverage stays at the existing host/presenter boundary.
- Integration remains an explicit authorized maintainer decision for the current eligible candidate. No merge or cleanup authority follows from plan approval.
