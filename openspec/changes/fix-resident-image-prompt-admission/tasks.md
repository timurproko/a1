# Tasks

## 1. Bounded image-prompt admission

- [ ] 1.1 Narrow the resident admission and prompt-journal submitted-record contracts to bounded identity and recoverable text while keeping legacy records readable; verify focused prompt-journal codec, size, and reconciliation tests pass.
- [ ] 1.2 Keep validated attachments exclusively on the engine command and add a resident session-shell regression whose legal image aggregate exceeds 2 MiB; verify journal admission receives no image bytes and the agent receives every attachment exactly once.

## 2. Current-turn settlement

- [ ] 2.1 Reconcile a correlated submission immediately through the settled-turn path when the engine is already ready, while leaving busy steering and follow-up entries active; verify focused event-order tests cover ready-before-correlation, correlation-before-ready, and duplicate-safe races.
- [ ] 2.2 Retire and compact a fully completed first submission without a second prompt; verify the synchronized session is not offered after restart and the journal becomes empty.

## 3. Honest interrupted recovery

- [ ] 3.1 Route recovered prompt text through the selected profile's existing image-sidecar rehydration boundary before restoring the editor and history; verify valid sidecars produce live attachments and missing, malformed, or disabled sidecars remove only unresolved image tokens.
- [ ] 3.2 Update resident-tab architecture documentation and implementation evidence for the bounded journal and settlement ordering, then verify `npm run typecheck`, the touched resident/session-shell tests, and `openspec validate fix-resident-image-prompt-admission --strict` pass.
