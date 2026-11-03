# Tab lifecycle notification audit

## Contract

Ordinary add, close, switch, utility reveal/toggle, drag and reconnect reconciliation must not expose internal coordination warnings. Fix the state transition at its owner; do not turn every protocol refusal into a terminal banner, claim a failed mutation succeeded, replay uncertain input, or redirect a stale action to another tab.

This audit covers the workspace proxy's complete `notice`, `refused` and `uncertain` call sites, the source lifecycle refusal paths, and attach's create, close, reorder, controller and input-notification handling. Existing slim Settings/Changelog composition is unchanged.

## Routine paths

| Case / producer | Resolution | Regression evidence |
| --- | --- | --- |
| `routing::client_message`: action references a tab after its closing snapshot | Publish authoritative topology; operation-specific replies carry no banner text. Only positively known closure makes duplicate Close successful. Never derive source authority from the supplied ID. | Real two-source duplicate-close and stale-view process sequence; bounded closure-history unit tests. |
| `server::lifecycle::close_tab`: duplicate close while stopped record still exists | Return the existing accepted result without sending stop again or committing another registry revision. | Real duplicate close before and after the closing snapshot. |
| `Context::save`: rapid actions overflow the persistence FIFO | Replace the FIFO with one coalesced pending slot plus the in-flight operation. Preserve latest selection/order/view ticket and union affected authenticated source routes. No busy-banner branch remains. | 10,000-selection mailbox test, background-metadata preservation, 200-view process sequence. |
| `persistence::worker`: another client holds the metadata writer lease | Retry only in the storage worker; keep the UI/event loop and execution independent and retain pending intent. Cancellation stops the worker. | Hold the lease beyond the previous timeout, require no error event, release it and require both view acknowledgements. |
| `persist` / `view_saved`: Close overtakes a queued selection | A positively removed target is not a storage failure. Do not select it or admit input; require the durable selected identity to match the exact pending ticket, otherwise refresh topology. | Rapid view-to-close overlap with strict rejection of all internal notice frames. |
| `stage_view`: user explicitly switches away from a pending view | Cancel its unsent input without a warning or retargeting. Latest view owns admission. | 200 alternating views followed by exact final-generation surface. |
| `cancel_closed_view`: requested target closes | Cancel the obsolete request and refresh topology, without an input-error banner. | Close-over-view and late-view-after-close sequence. |
| `publish_saved_view`: utility surface could overtake its final append-order snapshot | Publish and stage final topology before asking the source for its first selected surface. A newly created ID must be in the source list before dispatch. | Settings and Changelog first-surface tests without a caller list refresh. |
| `connection::new_sources`: advisory discovery cannot verify an additional source | Keep verified routes and retry through normal discovery. No unsolicited error banner and no unverified admission. | Existing source authentication/isolation tests; producer audit. |
| `source_failed` / `restore_view`: passive coordinator loss | Re-negotiate observation quietly. Retain intended view and resize, clear unsent input, and fence the replacement source until its exact surface is observed. Passive loss is not reported as a failed user write. | Pending-disconnection unit assertions; actual published-predecessor coordinator-death/client-reopen fixture. |
| Attach cancellation, hidden prewarm, late creation and old surfaces | Existing cancelled-request filtering and exact source/tab/generation fences keep these events out of visible selection and notification state. | Existing creation/cancellation, singleton, view and presentation cases. |
| Reorder loses its registry revision race | Refresh silently; unchanged source replies do not create new revisions. | Existing stale-reorder core and two-release drag/reopen cases. |
| Controller transfer or legacy semantic-input adaptation | Existing claim/fallback handlers process control messages without showing their protocol strings. No uncertain mutation is replayed. | Existing attach controller and input-adapter cases. |

## Genuine failures are not routine reconciliation

A source that remains unreachable after recovery, an actual storage failure other than writer contention, an actual uncertain write, malformed/oversized input, or failure to launch execution must not be disguised as success. These remain fail-closed, with short user-facing wording rather than source/epoch/custody/persistence implementation details. Existing explicit launch-failure and rename-validation feedback remains actionable. This is not a blanket suppression of failure events or a relaxation of controller, resource or durability boundaries.

The attach boundary also ignores successful recovery and passive viewer-status notifications and translates genuine failed launch/control/input notifications to brief fixed user-facing text. Opaque immutable-source reasons, including holder, epoch and filesystem strings, are never copied into those chrome notifications. Two focused unit cases pin this boundary.

All real-process `WorkspaceClient` reads now reject `recovery.notice`, `input.rejected`, `input.uncertain` and `tab.create-failed` during the ordinary lifecycle scenarios, rather than silently discarding those frames while only asserting a final tab vector.
