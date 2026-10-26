# Tasks

## 1. Immediate pending presentation

- [x] 1.1 Replace the text-bearing starting body with an empty, cursor-free body that respects the configured canvas from either an existing Agent or the landing.
- [x] 1.2 Keep exactly one selected provisional chip on the first paint and through early registry lists, without hiding pre-existing chips or putting the provisional ID into server requests.

## 2. Safe handoff and failure

- [x] 2.1 Replace the provisional chip with the real Agent only when its first complete surface commits (or the existing bounded fallback); preserve clean refusal and explicit-switch behavior.
- [x] 2.2 Retain the existing deferred input ownership, single-create gating, and failure recovery without leaking input to the previous Agent.

## 3. Regression coverage

- [x] 3.1 Add focused assertions for empty pending content, one chip before and after `tab.created` when a registry list arrives early, and a one-frame handoff to the real chip.
- [x] 3.2 Update the role-level regression for the immediate empty Agent presentation while a holder start slot is occupied and preserved input isolation.

## 4. Plain immediate Agent shell refinement

- [x] 4.1 Render an empty transcript with a visible ruled prompt and cwd footer on the first client-side create paint, using the existing canvas/palette; omit startup messages, unknown status, and the child cursor.
- [x] 4.2 Keep the single-chip, deferred-input, and first-complete-frame handoff semantics with the shell preview from both landing and existing-tab origins, including small terminals.
- [x] 4.3 Add focused native rendering and role-level assertions for the plain shell preview and its replacement with the real frame; run typecheck, strict OpenSpec validation, and touched native tests.

## 5. Complete idle Agent shell refinement

- [x] 5.1 Draw a visual inverse-space caret in the empty prompt and a second footer row on the same immediate pending-tab frame, without turning on the child cursor.
- [x] 5.2 Extract display-only model/context hints from the last complete Agent frame, reset new-tab usage/cost, and supply neutral values when no frame exists; replace all hints on the first authoritative new-Agent frame.
- [x] 5.3 Cover cached and uncached previews, narrow geometry and the startup-slot input handoff in focused native tests; run typecheck, strict OpenSpec validation, and touched tests.

## 6. Close an Agent while its provisional tab is visible

- [x] 6.1 Make the close shortcut and provisional-chip context menu target the pending request, not the previously viewed tab; restore the prior coherent view or landing immediately without exiting A1, and discard deferred input.
- [x] 6.2 Send request-scoped cancellation through the resident protocol so the server abandons a queued start or stops a holder/child already launched; ignore late responses without affecting later creates.
- [x] 6.3 Cover before and after registration, interleaved requests, cancellation while waiting on the start slot, and no ghost tab in native core/attach/server/role tests; reproduce the maintainer's actual close gesture and assert the attach stays alive with the older Agent intact.
- [x] 6.4 Repair the CI-reported architecture and documentation-comment violations and provide the missing OpenSpec `.openspec.yaml`; run targeted checks and update known-gap evidence.

## 7. Accent-aware provisional chip

- [x] 7.1 Give the pending chip a lighter shade derived from its configured accent while leaving each real Agent chip's active shade intact across all supported accent colors.
- [x] 7.2 Assert pending-versus-active chip colors for every accent and preserve narrow-strip and first-frame handoff behavior.

## 8. Preview the real Agent footer

- [x] 8.1 Derive the provisional footer from the actual Agent presentation where available rather than a parallel handcrafted layout; retain the current session metadata and source-defined left/right gutters without inheriting old usage.
- [x] 8.2 Cover cached and cold-start footers, narrow geometry, branch/PR metadata, and the exact transition into the committed Agent frame in focused native/owned-UI tests.

## 9. Fill the real Agent chip on handoff

- [x] 9.1 Start a short left-to-right background fill from the pending accent shade to the selected Agent accent on the first complete-frame handoff; keep the body/editor handoff immediate and preserve chip hit widths.
- [x] 9.2 Cover all accent schemes, clipping/overflow, palette fallback, bounded completion, and create/close/reopen timing with focused strip and attach tests.

## 10. Clean landing wordmark

- [x] 10.1 Remove the stray left full block from the middle row of the empty landing's `a` without moving the wordmark, footer, or visual Agent caret; update the landing regression.

## 11. Stable status footer during chip activation

- [x] 11.1 Retain the displayed provisional footer over the immediately live real Agent body/editor until the selected chip's left-to-right fill ends, then reveal the latest authoritative footer in one paint.
- [x] 11.2 Guard cancellation, tab switches, resizing, cold fallback, cached metadata/links and palette mode so no stale footer lingers; cover the handoff and final reveal in focused native tests and the close regressions.

## Evidence

- Prior candidate `d63716ac` passed `npm run build:core`, `npm run typecheck`, focused native machine/attach/landing suites, and the targeted `resident-fixtures,fault-injection` startup-slot role test. Those results describe the superseded text-bearing, duplicate-chip presentation, not the refined candidate.
- Refined implementation uses one local provisional chip and an empty, cursor-free body. A snapshot of pre-click tab IDs hides any newly registered Agent chip before and after `tab.created`; the real chip appears only on complete-surface commit.
- `npm run typecheck`, `openspec validate instant-agent-tab --strict`, and `git diff --check` passed for the refinement.
- Focused native suites passed: `core::attach::machine::tests` (35), `roles::attach::tests` (44), `roles::landing::tests` (8), and `first_draw` (1); `TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed with the locally copied manifest-verified terminal-vt library.
- The `resident-fixtures,fault-injection` role integration `input_waits_for_its_requested_tab_while_that_tab_waits_for_a_start_slot` passed, including an empty pending body before holder startup and deferred input isolation.
- The shell refinement paints a blank transcript, three-row editor (rules and an empty, cursor-free input row), and cwd footer on the same pending-chip paint. No model, counters, version, or startup text is fabricated; the existing first-complete-frame and deferred-input paths remain unchanged.
- The preview's 8-row landing/attach native tests and 44 attach native tests passed. The `resident-fixtures,fault-injection` startup-slot role regression passed with a ruled editor and cwd visible before the holder started, no loading text/cursor, and no old-tab input leakage. `npm run typecheck`, `openspec validate instant-agent-tab --strict`, and `git diff --check` passed. `cargo fmt --check` reports pre-existing formatting differences in numerous unrelated files, so no repository-wide format rewrite was applied.
- The prior ruled-editor/cwd-only preview lacked the caret and model/usage row shown in the maintainer's screenshot. This refinement draws both immediately; the last complete Agent's context/model/subscription/thinking style is reused for display, but usage is zeroed. The child's first complete frame replaces all provisional values. Without a prior complete Agent footer (e.g. a cold landing), the preview instead shows neutral `no-model` and `0.0%/0 (auto)`; it does not claim an unobserved model.
- `npm run typecheck`, strict OpenSpec validation, `git diff --check`, landing native tests (8), attach native tests (45), and the `resident-fixtures,fault-injection` startup-slot role integration passed. The role fixture confirms the complete idle footer and non-interactive caret appear before holder startup while deferred input remains isolated.
- Closing the provisional chip by shortcut or context menu discards buffered input and restores the old view immediately. The client matches each create response by its wire request ID, hides a late cancelled registry tab, and closes only that tab. The server checks a per-connection cancellation token before a queued start acquires a permit and after any holder launch or standby promotion; cancellation of a running holder uses the ordinary tab stop path. The wire envelope kind now decodes camel-case `requestId`, so the server's token matches the actual create request.
- Native machine (37), attach (46), and server (37) tests cover close gestures, request matching, and failure recovery. Resident role tests cover closing an already registered holder before first draw and verifying its process exits, plus cancellation behind an occupied startup slot while preserving the old Agent and starting a later Agent with separately owned input. `npm run typecheck`, `openspec validate instant-agent-tab --strict`, `cargo check --tests`, architecture governance, code-documentation governance, and `git diff --check` passed locally with `TERMINAL_HOST_LOCAL_BUILD=1` and the manifest-verified prebuilt terminal-vt library.
- The prior finalized CI head failed because the archive omitted `.openspec.yaml` and documentation comments/size ratchets rejected several touched functions. The restored active change now contains `.openspec.yaml`; scoped helper extractions, corrected comments, and reduced size-ratchet entries pass local governance. Trusted finalization must republish its archive and run CI for the new exact head.
- Reproduced a last-Agent/landing race: a late surface or startup selection re-adopted a closed Agent after the landing appeared, leaving a stale requested view that blocked reopening (and could hand control back to the terminal). The attach role now ignores unsolicited acknowledgements for closed IDs; the view model never re-adopts a stale initial surface after the first view is consumed or the last tab disappears. A resident role regression closes the last Agent, opens and immediately closes a pending Agent from the landing, stays attached, and opens another Agent; fast immediate-close from an existing Agent, queued-slot cancellation, and post-registration holder shutdown also pass.
- The selected provisional chip now uses an accent-derived lighter shade while its real chip keeps the normal selected shade. The attach test verifies all six configured accent values reach the provisional chip; the strip test asserts distinct selected colors for every scheme, including purple and blue, without changing the actual Agent child theme. Focused native attach (48), presentation (28), and strip (35) suites passed; `cargo check --tests`, typecheck, architecture and code-documentation governance, strict OpenSpec validation, and `git diff --check` passed with the verified prebuilt terminal-vt library.
- The maintainer's previous candidate still exited after a fast add/close. A burst of two close-key events reproduced the missing behavior: the first cancelled the pending Agent and the repeat closed its older Agent. The attach now extends a 500 ms quiet interval while repeated close keys arrive, preserving the old Agent; a deliberate later close remains possible. The queued-slot role regression now sends `Alt+A`, two immediate `Alt+W` events, and verifies the old Agent still echoes; landing close/reopen and already-registered holder shutdown also pass. This directly covers the repeated-key path, while the exact interactive gesture in the report remains unconfirmed.
- The preview now replays the last complete Agent's actual styled footer rows, including owned gutters, branch/PR hyperlink, and right-aligned model; it resets only the usage cells. No prior complete frame exists on a cold start, so the neutral fallback uses the same one-cell footer gutters and leaves unavailable metadata absent. Native footer tests cover cached actual rows, zeroed usage, malformed or resized fallback, and narrow geometry; the owned shell's 34 tests validate its footer layout. Focused native attach (50) and landing (8) suites, three cancellation role regressions, typecheck, strict OpenSpec validation, architecture/documentation governance and `git diff --check` pass locally.
- Interactive trace obtained (no further maintainer retest requested): two ordinary Alt+A/Alt+W cycles targeted new Agents correctly; the second produced `effect=close`, `effect=cancel-view`, `server=detach`, `exit=server-detach`. The server formerly accepted a closing child's controller-bound detach while its tab was still viewed. The native regression keeps that view bound after close, sends the late bridge detach, and fails before the running-desire guard but passes after it; it asserts an older Agent stays running. The bridge guard applies to detach, configure-plus, close and restart. Queued-start, landing, and registered-holder role regressions pass. The isolated real-UI fixture failed Pi startup before the first frame and was removed; it was not evidence for this close path. No further user manual validation is required; CI remains authoritative.
- After the maintainer confirmed close stays inside A1, the real chip now fills left-to-right over 360 ms while the body appears immediately; a 25 ms strip cadence settles its last partial frame and switches/close/new create discard the fill. Foreground title/status, Unicode graphemes, clip/overflow hit widths, six accents, palette fallback, and a concurrent automatic title wave have deterministic strip tests. Focused strip (38), attach (51), and landing (8) native tests passed, as did two quick-close role regressions and the startup-slot role regression. The empty landing's left extra block was removed without changing its footer rows or Agent preview caret. Typecheck, architecture and documentation governance, strict OpenSpec validation and `git diff --check` passed; the now-small test-only strip wrapper's retired size ratchet entry was lowered. Manual appearance review remains optional and never gates the item.
- Status footer refinement: the maintainer observed transient real status while the chip filled. The attach now freezes only the provisional footer bytes before first real commit, reconstructs each complete real frame without its two footer rows, and paints the frozen rows after the live body. Chip-fill completion clears the hold and paints the latest real structured footer once. A fake-child resident role regression writes intermediate and final statuses: it fails without the hold and passes with it, confirms the body appears immediately, and keeps A1 attached after close. Landing (9), attach (53), and presentation (28) native tests cover cold and cached footers/links, status suppression, palette/legacy fallback, and row geometry; the two earlier quick-close role regressions still pass. Resize, close, switch, and create clear the hold alongside the fill. The normal immediate body/editor and deferred input path is unchanged.
- Known gaps: an uncached cold start cannot show the actual model/context before that Agent reports it; the neutral fallback occupies the full footer row. Native tests use the manifest-verified terminal-vt library because Zig is unavailable.
