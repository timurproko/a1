## Why

Agent content can disappear or stop updating before it reaches the terminal, while URL links still leave ghost underlines on unrelated rows. Read-only investigation confirmed a recent tool-lifecycle regression plus transcript-reconciliation, renderer-payload, cache-invalidation, and wrapped-URL defects; another paint-only workaround would leave those content failures intact.

## What Changes

- Separate completion of generated tool arguments from completion of the tool execution, so valid execution-start and accumulated-output updates remain visible while genuinely obsolete updates remain rejected.
- Preserve every displayable semantic block and its identity through message completion, run completion, settlement, and coalesced delivery. A run-local message list must not temporarily replace the complete session transcript.
- Preserve structured tool-rendering results, including diff metadata and supported attachment references, instead of passing renderers a text-only reconstruction or diagnostic summary.
- Make asynchronous renderer invalidation reach the real presentation scheduler and invalidate affected block/document caches independently of semantic block revision. Retain bounded streaming and stable-row reuse.
- Give bare URLs the same complete-target, pre-wrapping hyperlink treatment as file links while retaining existing web-link blue, file-link accent, source text, selection/copy, and activation behavior.
- Verify URL/file decoration cleanup against actual presented cells without restoring unconditional full-screen clears, weakening explicit-link movement safety, or requiring users to change terminal settings.
- Add production-ordered lifecycle and scheduling evidence that distinguishes semantic omission, stale cached rows, terminal-write errors, and host-only hyperlink decoration. Require exact-artifact Windows Terminal review of missing content and the original underline symptom.

“Preserve every block” means keeping displayable assistant/thinking content and tool surfaces available in the active transcript under existing visibility, expansion, scrolling, and session policies. It does not require persisting every superseded token/partial-output snapshot, expanding every tool, or making off-screen content simultaneously visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Strengthen tool lifecycle and transcript continuity, renderer payload fidelity, presentation invalidation, and realistic evidence; refine streaming coalescing so payload preservation and rejection of truly stale updates remain compatible.
- `custom-session-viewport`: Require complete URL targets across wrapping and presentation changes, shared file/URL rendering semantics with existing color differences, and content-preserving, physically verified link cleanup.

## Impact

- Expected implementation boundaries: `src/integrations/pi/engine/adapter.ts`, `pending-delivery.ts`, owned transcript/event contracts, `src/integrations/pi/components/shell-presenters-transcript.ts`, component presentation ports, `src/integrations/pi/session-ui/session-shell-root.ts`, shell scheduling, `session-viewport-controller.ts`, shared link/span helpers, and the owned damage-aware terminal boundary. Any necessary source-derived renderer adaptation stays minimal and attributed inside the Pi component integration.
- Extend existing engine, component, viewport, and terminal-evidence tests with real tool ordering, multiple messages/tools, asynchronous invalidation, structured results, wrapped URLs, and physical reproduction. This planning change adds no code, tests, scripts, or generated baselines.
- No dependency upgrade, session-format migration, terminal-settings requirement, new link-opening policy, or replacement of Pi's renderer/runtime is proposed. Shared owned-shell corrections restore pinned behavior; A1 link decoration and damage changes remain bare-A1-only. The explicit `a1 pi` oracle and installed dependencies remain untouched.
- Builds on `recover-history-and-bound-ui-events`, `stabilize-streaming-rendering`, `fix-ghost-link-underlines`, and `eliminate-code-block-streaming-flicker`: preserves their bounded delivery/paint constraints, clarifies argument versus execution finality, and carries forward unresolved physical acceptance rather than treating prior task checkmarks as proof. Existing modal-content interaction and selection work must remain intact.
- Investigation used `c3bf0d2d`; this proposal is based on `origin/develop` at `fa29f8bd`. The implicated engine, presenter, link, damage, and root-cache paths are unchanged between those commits; the root's intervening editor-body geometry adjustment is unrelated and must be preserved. The screenshots' exact runtime build and the Windows Terminal ghost mechanism remain to be identified during implementation evidence.
