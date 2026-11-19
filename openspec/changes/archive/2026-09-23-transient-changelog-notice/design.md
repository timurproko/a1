## Context

See `proposal.md` for motivation. At planning base `dd3680cc`, the engine emits a persistent `changelog-expanded` or `changelog-collapsed` diagnostic and advances the acknowledged version. The custom viewport currently converts either diagnostic into a bordered two-line document block after transcript rows; the expanded form also causes the shell to open the `What's New` route once. Separately, bare A1 already presents model changes and other informational workflow results through one dock notice immediately above the editor. That notice is not transcript content, survives assistant/tool streaming, is replaced by the next notice, and is dismissed by the next user or shell-command block.

The on-demand `/changelog` route already opens the complete release notes without appending feed content. The `a1 pi` comparison profile has no owned route host and retains the pinned transcript presentation.

## Goals / Non-Goals

**Goals:**
- Reuse the established informational dock-notice behavior for either startup changelog diagnostic.
- Ensure startup release-note information contributes no custom-viewport document rows and does not affect transcript scrolling, selection, or copying.
- Keep the exact user-facing cue to one line and leave complete notes one command away.

**Non-Goals:**
- Change how new entries are read, filtered, acknowledged, or controlled by `collapseChangelog`.
- Change the `/changelog` reference screen, other workflow statuses, package-update notices, or the pinned comparison profile.
- Add a timer, toast framework, new setting, or another rendering component.

## Decisions

### 1. Translate the startup diagnostic into the existing dock notice once

The shell will recognize the first startup changelog diagnostic of either code in the custom viewport and submit the exact message `Run /changelog to view the full release notes.` through the existing informational workflow-status path. The one-shot launch guard will prevent ordinary view refreshes from recreating a notice after it has been replaced or dismissed.

The custom document renderer will omit both startup changelog diagnostics. This makes the notice dock chrome rather than a pseudo-transcript block and gives it the same placement, wrapping, replacement, dismissal, and damage-aware composition behavior as model-change information.

A dedicated changelog banner component or a second notice store was rejected because it would duplicate the status lifecycle and could diverge from the model-change behavior the user selected as the reference.

### 2. Do not automatically open release notes

The expanded diagnostic will no longer open the `What's New` route during startup. The collapsed and expanded settings therefore differ only in upstream lifecycle bookkeeping within bare A1; both produce the same quiet cue. The owned `/changelog` route remains unchanged and is the sole way startup notes become a full-screen document.

Keeping the automatic screen while changing only the banner was rejected because it would contradict the requested “just show this text” behavior and remain more disruptive than the notice itself.

### 3. Preserve pinned behavior at the layout boundary

Diagnostic-to-notice translation applies only to the custom viewport. The engine still emits the same code and payload and stores the same acknowledged version, while the pinned layout continues rendering its existing expanded or collapsed block. No Pi package source, workflow table, or setting is changed.

### 4. Verify content independence, not only text styling

Regression tests will assert the exact one-line text, absence of `What's New`, borders, changelog entries, and route opens, and the notice's non-document lifetime while assistant/tool content grows. They will also cover replacement and next-user dismissal, collapsed and expanded diagnostics, `/changelog` on demand, acknowledged-version bookkeeping, and pinned-layout compatibility.

A snapshot that checks only the new text was rejected because it would not prevent the notice from remaining attached to the transcript and moving with content.

## Risks / Trade-offs

- **[A later informational status can replace the changelog cue before the user reads it]** → This is intentional transient-status behavior; `/changelog` remains advertised and available at any time.
- **[`collapseChangelog` no longer changes bare-A1 startup presentation]** → Preserve the setting and diagnostic unchanged for pinned compatibility, but deliberately normalize both custom-viewport outcomes to the requested one-line notice.
- **[A startup modal can temporarily cover the notice]** → Store it in the ordinary dock so it is visible when the modal closes; do not queue or auto-open a second surface.
- **[Removing automatic opening makes new release details less prominent]** → Keep the exact command cue near the editor and retain the complete on-demand reference screen.

## Migration Plan

No persisted data changes. Deploy the presentation change with updated focused tests and presenter-governance descriptions. Rollback restores the existing custom-viewport banner and automatic expanded screen without migrating settings or sessions.
