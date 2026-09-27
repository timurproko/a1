## Context

The accepted `0.2.1-dev.603` installer renders a fixed-width colored bar and percentage followed by an allowlisted phase label. The supplied terminal capture shows `53% Installingpackages`: `Installing` replaced the beginning of the earlier `Resolving packages` label, but the carriage-return redraw did not erase the longer label's trailing `packages` text.

The user wants no wording after the percentage regardless of phase. npm currently serves `.603` under the `next` tag for both packages. The npm profile package list displays each package's `latest` tag, which remains `0.2.0` for the application and the bootstrap `0.2.1-dev.599` for the installer; that page is not a newest-version listing.

## Goals / Non-Goals

**Goals:**

- Make the visible interactive progress row end at the numeric percentage.
- Remove stale suffix text when a carriage-return frame replaces an earlier longer row.
- Keep measured progress, animation, palette, cleanup, success, and failure behavior unchanged.
- Prove the corrected installer in a newly numbered development publication under `next`.

**Non-Goals:**

- No change to npm `latest`/`next` policy or stable release timing.
- No removal of internal phase classification used to interpret child activity.
- No change to progress percentages, bar width, colors, target selection, installation, activation, or diagnostics.

## Decisions

### 1. Render only the bar and percentage

`ProgressDisplay.draw` will render `renderProgressBar(percent)` without appending the current phase label. Internal phase classification may continue because it remains useful for mapping child events and preserving existing progress milestones, but those labels will no longer be terminal content.

Removing only spaces between words is rejected because the user requested no wording. Retaining one generic label is rejected because it adds the same static visual noise.

### 2. Erase the remainder of the terminal row

Append the ANSI erase-to-end-of-line control after each interactive progress frame. This removes any characters left by a previous installer frame without printing visible padding or moving the cursor away from the percentage. Existing clear/finalization logic will continue restoring the cursor and default foreground.

Padding every frame to the historical maximum is rejected because it leaves the cursor far to the right and couples rendering to obsolete label lengths.

### 3. Test visible output, not only the bar helper

Extend TTY orchestration coverage to inspect complete progress frames and require every frame's visible content to end at a percentage with no allowlisted phase wording. Retain palette, non-decreasing progress, non-TTY silence, cancellation cleanup, and exact success-output assertions.

### 4. Keep npm channel semantics explicit

The corrective publication will produce the next numbered preview and advance both `next` tags. The npm profile page will not show that preview as the headline version because it displays `latest`. Moving `latest` remains a stable-publication action and is outside this presentation correction.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Progress rendering | Interactive frames contain the 40-cell bar and percentage, then erase-to-end, with no phase text |
| Stale-content prevention | A shorter/new frame cannot leave the prior label suffix visible |
| Existing contracts | Non-TTY success, cancellation cleanup, failure diagnostics, and progress palette remain unchanged |
| PR | Exact-head selected CI validates installer, rendering, governance, and OpenSpec delivery |
| Post-merge | A new OIDC development publication passes exact-package and native published-pair lanes |

## Risks / Trade-offs

- **Phase context is no longer visible.** The phase wording was static for long intervals and visually misleading; percentage movement remains the intended progress signal.
- **ANSI erase-to-end is terminal-only.** It is emitted only when TTY progress is already enabled; redirected output remains the exact unstyled success line.
- **The npm profile still shows older headline versions.** That is intentional dist-tag behavior, not failed publication; `next` carries development candidates until a stable release moves `latest`.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add focused TTY regressions and remove visible labels while erasing stale suffixes.
3. Complete evidence, finalization, and exact-head validation before authorized manual merge.
4. After merge, publish one newly numbered development candidate and verify all native installation and aggregate gates.

Rollback uses a later corrective PR and does not mutate prior package versions.
