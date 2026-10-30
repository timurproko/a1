## Context

See proposal.md for the user-visible defect and specs/multi-agent-tabs/spec.md for the expected behavior. The resident attach client's presentation composer owns the final strip, retained child grid, and host-modal output. It previously reasserted SGR faint after each backdrop style change; faint does not darken SGR background colors. The child publishes either a structured grid with its effective palette/defaults or a legacy ANSI body. A modal is appended after backdrop rendering and must retain its original colors.

## Goals / Non-Goals

**Goals:** Darken both explicit truecolor and indexed backdrop backgrounds while preserving text faintness, styled cells, OSC palette changes, hyperlinks, overlay bounds, and the retained child grid. Restore the original rendering after close and keep incremental repaint and resize coherent.

**Non-Goals:** Change the child terminal's own pixels or color settings, alter child-owned modals or input routing, or change the `a1 pi` comparison path.

## Decisions

- Apply backdrop transformation in the native presentation composer before appending the host modal. This retains one shared path for structured child rows, legacy rows, and the host strip. Changing child styles instead would mutate the retained grid or require a separate shadow copy for every repaint.
- Reassert faint after each backdrop SGR and override its effective background with a darker color. Halve truecolor channels directly; for indexed SGR, use the structured child's effective palette when available and a conventional xterm palette otherwise, then choose an indexed dark equivalent. Dim an explicitly published default background on SGR reset. Do not reinterpret private CSI sequences or OSC palette updates. Changing terminal-global palette entries would also darken the modal and complicate restoration.
- Keep modal bytes outside the transformation and force a complete backdrop repaint when the dimmed state toggles. The existing composer already treats this state change as a force repaint, so the original retained grid restores its colors when the modal closes.

## Risks / Trade-offs

- Indexed colors are discrete and terminal palettes can be customized externally: a nearest indexed dark color may shift hue. The child-published palette is preferred when present; the fallback is limited to frames without that palette. Tests cover both color modes and an indexed landing/legacy frame.
- Background transformation adds SGR parsing during modal rendering: only the already-composed backdrop is scanned, and ordinary non-modal frames keep the existing fast path.

## Migration Plan

No persistent format or migration is required. Deployment replaces the native host presentation logic; rolling back restores the previous foreground-only modal dimming.
