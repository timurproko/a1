## Context

PR #864 put local active-release observation in the owned JavaScript session. That works for a newly launched solo session, but an attached multi-agent screen can show an Agent whose immutable source release predates that observer. The native attach client is the current disposable client and already knows its immutable release root, shared data directory, structured surfaces, overlays, and strip geometry; it is the correct owner for multi-agent restart readiness.

The existing bootstrap code intentionally selects a retained client while an update transaction is active. The reported blank handoff means this contract needs a process-level regression that holds the transaction open and proves the retained client paints and attaches rather than relying only on selection-unit tests.

The strip currently treats the right-side text as noninteractive and fills every non-chip cell with a fixed dark RGB background. Its Version/Time text uses RGB 170 while the resident landing/status dim token is RGB 126,136,142.

## Decisions

### D1. Native attach observes active release state

The attach client will read bounded local cohort state after its first frame and on a bounded cadence. It compares its own immutable package version with the approved active package version, accepts only a newer semver from the same channel, and stays silent on malformed, unapproved, equal, older, cross-channel, or unavailable state. It performs no registry request, worker launch, or state mutation.

On the first accepted newer active version it stores a local restart-ready status, repaints, and stops observing. The overlay uses the existing installed wording and has no raw paths, release records, or diagnostics. The observer is independent of the attached Agent source release. Existing JavaScript observation remains responsible for solo and ordinary owned surfaces.

A release that predates this native observer cannot be retroactively changed; this makes the next update from the first fixed outer client reliable.

### D2. Restart remains an ordinary retained-workspace reconnect

Restart readiness remains emitted only after activation has committed an approved active client. A subsequent `a1` launch must select that active release and reconnect through the existing workspace routes without replacing Agent, holder, tool, or session-writer identities. While an update transaction is active, bootstrap continues selecting the verified retained release; an end-to-end fixture will prove it paints a usable multi-agent client within its bounded startup window.

### D3. Right-side geometry is explicit interaction geometry

The strip renderer will emit separate stable hit ranges for rendered Version and Time. Hovering either applies the existing lightweight strip-control hover treatment; right-clicking either opens one native context menu containing Configure. Selecting it enters the reusable native flag palette titled **Right Side**, which toggles Version and Time and atomically persists the ordered setting. Hidden or narrow-elided items have no hit range and cannot intercept child input.

The right-side text's foreground comes from the resident dim/status token. Right-side hit spans never change tab, overflow, plus, or drag geometry.

### D4. Tab-bar background reuses canvas semantics

A live `tabBarBackgroundStyle` setting under Tabs accepts `transparent`, `dark`, and `accent`, defaulting to `transparent`. The UI presents them as Transparent, Black, and Accent. Transparent emits the terminal default background for unoccupied strip cells; Dark and Accent reuse the same canvas palette as the existing fullscreen `backgroundStyle`. Chip/pop-up/readability styling stays independent of this row canvas.

## Risks

- Polling could add native work: use a low-frequency bounded check, stop after readiness, and read only shared local state.
- Overlaying a child surface could obscure input: reuse the existing transient host-overlay row and repaint the preserved structured surface when it clears.
- Transparent rows could leave stale terminal cells: every strip repaint must explicitly clear/fill the full row with the selected canvas semantics.
- New hit ranges could steal input: expose them only for physically rendered right-side cells and cover narrow, bottom-strip, popup, and child-pointer cases.

## Validation

- Native state-reader tests for all accepted/rejected release comparisons, one-shot observer lifecycle, and exact notice rendering.
- Actual retained multi-agent process regression: busy and idle Agents survive activation, notice appears in the outer client even with predecessor Agent source, restart reconnects the same identities, and no work/input is replayed.
- Update-transaction launch regression: a retained multi-agent client renders and accepts input while installation is still active.
- Native strip tests for hit ranges, hover, context Configure, Right Side palette persistence, narrow omission, bottom placement, and unchanged tab/overflow geometry.
- Settings and rendering tests for all tab-bar canvases, transparent default, accent/dark palette parity, and status-dim foreground parity.
