# Design

## Context

`core/attach/machine.rs` sends `Request::Create` and sets `pending_created_activation`; the server replies `tab.created` only after standby promotion or `start_holder`. The attach client then requests the new view, and `roles/presentation.rs` parks blank surfaces until a first drawn frame or the bounded fallback. The existing spec explicitly keeps the old view until that frame. This avoids a blank flash but makes click-to-visible-tab depend on asynchronous process startup.

## Goals / Non-Goals

**Goals:** Paint exactly one new Agent chip and a plain, cursor-free Agent shell (empty transcript, empty editor, cwd footer) on the input event; transition once to the real complete surface, without input leaking to the previous tab or showing loading text. Keep launch errors and no-draw fallback recoverable and retain the existing menu/shortcut behavior.

**Non-Goals:** Make agent initialization itself synchronous or instantaneous; alter Settings/Changelog prewarming, ordinary existing-tab switches, the pinned Pi profile, or durable registry/session identity.

## Decisions

1. Represent one locally pending Agent presentation in the attach client from the accepted create gesture, before sending the server request. Paint one provisional chip with a plain shell on the same frame: a blank transcript, ruled empty prompt, and cwd footer, but no startup text, wordmark, model/status data not yet known, child cursor, old transcript, spinner, or clear-only intermediate frame. Render with the attach client's existing palette and canvas and crop gracefully at narrow/small dimensions. The empty editor is visual only: typing remains deferred until the real child is ready. This is a presentation intent, not a registered tab or a second agent process. A locally generated key must not be used as an authoritative tab ID.
2. Route keys and paste typed during this state into the existing deferred-created target. Do not forward body mouse/focus events to the previously viewed child while the pending presentation owns the screen. Continue to ignore repeated new-Agent actions until the requested tab has become visible or creation has failed; allow normal cancellation/view changes without hijacking a later choice.
3. Snapshot the registered tab IDs when the user creates the Agent. While its provisional chip owns the view, suppress any new Agent registry chip that appears before the create acknowledgement, as well as the confirmed target after acknowledgement; never suppress pre-existing chips. On `tab.created`, bind the pending intent to the real ID and retain the first-drawn-frame/timeout gate. Replace the provisional chip and shell atomically with the real chip and first complete child frame on commit, without one frame showing two chips. A failed create restores the prior view (or landing) with one actionable notice and discards buffered created-target input. Consider early registry lists, late surfaces, client detach, and server failure explicitly.
4. Keep provisional presentation local rather than eagerly inserting an unconfirmed registry record on the server. This makes process-launch latency irrelevant to the first visual response and avoids durable ghost tabs when creation fails. Do not solve the symptom solely by shortening `FIRST_DRAW_WAIT` or prewarming more Agent processes: neither guarantees immediate feedback and both change resource or visual semantics.
5. Add deterministic presentation tests covering the immediate plain editor/footer (without a child cursor or loading text) and exactly one chip when registry updates arrive before `tab.created`, after acknowledgement, and at commit; retain role-level coverage for first paint before server response, failure, burst creation, deferred input, landing and existing-tab origins, pointer activity, and no-draw fallback. Avoid wall-clock timing assertions; assert that the first event produces visible pending state without waiting for an asynchronous response.

## Risks / Trade-offs

- The user sees an uneditable approximation of the empty editor and footer until the real UI draws. Unknown dynamic status (model, counters, session metadata) is omitted rather than fabricated; the layout holds its space until handoff.
- Premature forwarding to the old child could leak a prompt; pending presentation and deferred target ownership must remain aligned.
- An early registry list can precede `tab.created` and expose a second chip; keep an immutable pre-create ID snapshot so the provisional and new registry chip never render together, while committed topology remains authoritative.
- If the server refuses or the child never draws, recover the old view or bounded fallback without a stuck provisional screen.

## Migration Plan

No persisted-data migration. Rollback removes only the client-side pending presentation, leaving the existing server create and first-draw behavior intact.
