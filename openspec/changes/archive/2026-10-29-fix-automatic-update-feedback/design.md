## Context

The detached automatic-update worker already uses ignored stdio and `windowsHide`, as do recovery, activation, warmup, and cleanup workers. The shared updater process runner that performs bounded npm/preflight child calls does not currently request hidden Windows process creation, so a detached automatic worker can still produce a short-lived console flash.

Restart readiness is currently appended to the shell's live status rows. Bare A1 already has a paint-only right-aligned frame overlay immediately above the editor for copy acknowledgements; that overlay does not allocate a row or alter transcript/editor geometry.

## Goals / Non-Goals

**Goals:**
- Make the complete automatic-update process tree visually background-only on Windows.
- Reuse bare A1's existing acknowledgement overlay for persistent restart readiness.
- Give transient copy acknowledgement priority and restore restart readiness automatically afterward.
- Use sentence capitalization for the shared copy acknowledgement on session and Changelog surfaces.
- Keep the installed-update diagnostic as the source of truth for process-lifetime persistence.

**Non-Goals:**
- Change automatic update discovery, ownership, retry, replacement, activation, or recovery semantics.
- Hide output from an explicitly invoked `a1 update` command.
- Change copy acknowledgement duration, clipboard behavior, or selection behavior beyond capitalizing its first letter.
- Make the restart-ready notice dismissible or persist it across process restarts.

## Decisions

### 1. Hide updater child processes at the shared process-launch boundary

The updater's bounded process runner will request hidden Windows process creation for every child while continuing to capture stdout/stderr through pipes. This closes the remaining launch path used by automatic update without introducing an automatic-only duplicate runner. Explicit updates retain their own current terminal and progress output because hiding a child window does not hide the invoking A1 process or its rendered output.

An automatic-mode flag threaded through every npm/preflight call was considered, but it would duplicate process behavior and leave more opportunities for a newly added child path to omit the flag.

### 2. Treat restart readiness as persistent dock overlay content in bare A1

Bare A1 will derive a persistent overlay candidate from the installed-update diagnostic and place it at the existing acknowledgement row. The live working-status renderer will no longer append restart readiness in custom-viewport mode, so Working keeps its existing row and the restart notice occupies no transcript or dock row. The pinned comparison route may keep its compact status placement while using the revised wording and single success color.

Adding a second overlay row was rejected because the requested location is the established copy-feedback line and another row would change geometry.

### 3. Resolve overlay priority as transient copy feedback over persistent restart readiness

Overlay composition will select the active copy acknowledgement first and the installed-update notice second. Existing acknowledgement timeout and replacement behavior remain unchanged. When the timer clears the copy message, the diagnostic still exists, so the next render restores restart readiness. This avoids a second persistence timer or state copy that could drift from the release diagnostic.

### 4. Centralize installed-update text and styling

One renderer will produce `Update installed, restart to update` entirely in the success semantic color and truncate it to available width. Sharing the renderer across the custom overlay and pinned status avoids punctuation, casing, color, and clipping divergence.

### 5. Capitalize copy acknowledgement at its shared formatter

The common character-count formatter will return `Copied N chars to clipboard`, so frame selection, prompt selection, and Changelog selection stay consistent without route-specific string replacement. Existing callers continue to supply the exact payload count and retain their current color, placement, and lifetime.

## Risks / Trade-offs

- [Windows process semantics differ across executable types] → Exercise launch-option construction directly and retain packaged Windows automatic-update coverage for the complete path.
- [Moving the notice could accidentally leave a duplicate in live status] → Cover idle, busy, narrow, and copy-active custom-viewport frames and assert exactly one visible notice.
- [A copy timeout could clear both messages] → Keep restart readiness diagnostic-derived rather than storing it in the transient acknowledgement field.
- [Pinned and custom layouts have different geometry] → Limit same-line replacement behavior to bare A1's custom viewport while preserving a compact non-transcript notice in the pinned route.
