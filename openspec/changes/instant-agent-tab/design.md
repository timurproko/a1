# Design

## Context

`core/attach/machine.rs` sends `Request::Create` and sets `pending_created_activation`; the server replies `tab.created` only after standby promotion or `start_holder`. The attach client then requests the new view, and `roles/presentation.rs` parks blank surfaces until a first drawn frame or the bounded fallback. The existing spec explicitly keeps the old view until that frame. This avoids a blank flash but makes click-to-visible-tab depend on asynchronous process startup.

## Goals / Non-Goals

**Goals:** Paint an immediately recognizable, coherent new Agent tab and starting body on the input event; transition once to the real complete surface, without input leaking to the previous tab. Keep launch errors and no-draw fallback recoverable and retain the existing menu/shortcut behavior.

**Non-Goals:** Make agent initialization itself synchronous or instantaneous; alter Settings/Changelog prewarming, ordinary existing-tab switches, the pinned Pi profile, or durable registry/session identity.

## Decisions

1. Represent one locally pending Agent presentation in the attach client from the accepted create gesture, before sending the server request. Paint the starting chip and body in the same frame, with no child cursor, old transcript, fake ready editor, spinner, or clearing intermediate frame. This is a presentation intent, not a registered tab or a second agent process. A locally generated key must not be used as an authoritative tab ID.
2. Route keys and paste typed during this state into the existing deferred-created target. Do not forward body mouse/focus events to the previously viewed child while the pending presentation owns the screen. Continue to ignore repeated new-Agent actions until the requested tab has become visible or creation has failed; allow normal cancellation/view changes without hijacking a later choice.
3. On `tab.created`, bind the pending intent to the server's real ID and let the view model retain the first-drawn-frame/timeout gate for the actual child. Replace the placeholder atomically with the real chip, body, footer, and editor when a complete frame commits. A failed create restores the prior coherent view (or landing) with one actionable notice, discards buffered created-target input, and never leaves a ghost chip. Consider registry snapshots, late surfaces, client detach, and server failure explicitly.
4. Keep provisional presentation local rather than eagerly inserting an unconfirmed registry record on the server. This makes process-launch latency irrelevant to the first visual response and avoids durable ghost tabs when creation fails. Do not solve the symptom solely by shortening `FIRST_DRAW_WAIT` or prewarming more Agent processes: neither guarantees immediate feedback and both change resource or visual semantics.
5. Add deterministic state-machine/presentation tests and at least one role-level test covering first paint before server response, eventual reconciliation, failure, burst creation, deferred input, landing and existing-tab origins, pointer activity, and no-draw fallback. Avoid wall-clock timing assertions; assert that the first event produces visible pending state without waiting for an asynchronous response.

## Risks / Trade-offs

- The user briefly sees a starting shell rather than a ready editor; it must be visually distinct from an interactive child and remain cursor-free.
- Premature forwarding to the old child could leak a prompt; pending presentation and deferred target ownership must remain aligned.
- Out-of-order server/registry/surface messages could create duplicate chips; the provisional identity must be separate from committed topology and reconciled only once.
- If the server refuses or the child never draws, recover the old view or bounded fallback without a stuck provisional screen.

## Migration Plan

No persisted-data migration. Rollback removes only the client-side pending presentation, leaving the existing server create and first-draw behavior intact.
