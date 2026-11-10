## Context

Bare A1 already has full-screen Settings and reference apps, neutral application route contracts, a session dialog coordinator, shared compact searchable dialog rendering, and a separate comparison profile. The requested Apps dialog should compose those facilities rather than introduce another agent runtime or duplicate the screens.

Reference images supplied by the maintainer:
- `herdr-paste-1794299988952650000.png`: compact Default Model selector layout, including title, description, search marker, list, and shortcut footer.
- `herdr-paste-1794300098570266100.png`: Commands panel visibly raised above a substantially darker backdrop.
- `herdr-paste-1794300115033607500.png`: current insufficient modal separation, especially over Settings.
- `herdr-paste-1794300178388809300.png`: redundant successful model-switch notice already reflected in the status bar.

## Goals / Non-goals

Goals: fast searchable switching among three existing apps; correct cross-app shortcut scope; reliable modal contrast; quiet successful model changes; preserved drafts and session state.

Non-goals: launching another agent process, adding tabs, redesigning Settings or Changelog content, changing model persistence or thinking policy, removing `/models`, changing comparison-profile defaults, and changing extension-authored surface designs.

## Decisions

### One launcher over the current app

Use a small declared catalog containing Agent, Settings, and Changelog. The shell/composition boundary owns actions; the launcher consumes neutral searchable choices and shared compact dialog presentation. Do not teach generic UI primitives about session-engine commands.

Ctrl+P opens Apps over Agent or either full-screen app. Typing filters names case-insensitively; arrows navigate, Enter opens, and Esc closes without switching. An empty result cannot launch anything. Selecting the active app is harmless. Agent means the existing session surface, never a new session. Switching closes or replaces the prior app and restores ordinary focus/lifecycle behavior without losing the Agent draft, attachments, pending queue, or running work. Cancel restores the originating app and focus. Launching an app must not be undone by an old selector's close callback.

Settings and Changelog cease to be Agent built-in commands in bare A1, including completion and command help. Their internal routes remain available for the launcher and automatic What's New. Comparison command behavior remains unchanged. Do not broadly filter resource or extension commands by display text.

### Shortcuts are effective declarations

Add the Apps action to the owned declarations and route it at the application-host boundary so Ctrl+P remains available in Settings and Changelog, not only the Agent editor. Move model selection to Ctrl+M and remove the default forward-cycle claim on Ctrl+P; do not silently invent a replacement cycle shortcut. Preserve explicit user configurations and existing conflict diagnostics. Derive help from effective bindings; keep Ctrl+L and Shift+Tab behavior unchanged.

Ctrl+M can collide with carriage-return/Enter in legacy terminal input. Distinguish supported modified-key encodings from ordinary Enter; never steal prompt submission or dialog acceptance to simulate an unavailable chord. Cover this boundary with encoded-key regression tests and document any unavoidable legacy-terminal limitation.

### Shared modal separation, not per-screen patches

The current Settings configure overlay uses SGR faint, and the shared floating panel palette is close to the surrounding terminal background. Replace terminal-dependent faint-only separation with deterministic backdrop foreground/background treatment at the shared presentation boundary. Preserve underlying glyphs, ANSI boundaries, hyperlinks, selected-row semantics, frame dimensions, and undimmed panel content. Apply a visibly raised shared panel palette with truecolor and 256-color forms; choose exact tones during implementation against the reference, not individually at callers.

Use the same policy for Apps and owned floating selectors, including nested Default Model/per-model thinking selectors over Settings and the unified Models dialog. Full-screen Settings and Changelog remain full-screen; dimming is transient and disappears on modal cancellation or completion. Preserve comparison-profile presentation where owned replacement policies do not apply.

### Quiet success at the owned presentation boundary

Suppress only successful active-model-switch acknowledgements in bare A1, for picker selection, direct model switching, and scoped cycling where available. Retain authoritative model/thinking updates and all underlying engine persistence/events. Do not suppress failures, warnings, catalog-refresh problems, or unrelated command output; do not match the English text `Switched to` to decide behavior. The comparison profile retains its existing output contract.

### Consistent footer PR separator

The maintainer additionally requested the first footer row as `path (branch) • #900` and directed completion of the remaining PR item. Use the same dim ` • ` segment grammar as the stats-row session name while keeping only the PR number inside its existing terminal hyperlink. Keep the link on the first row and the session name on the second row. Reserve the complete badge before path text at constrained widths; omit the separator when no path prefix fits, rather than leave a leading or trailing dot. With no PR, render no extra separator. Keep the comparison profile unchanged.

## Validation strategy

Focused owner tests will cover launcher filtering, no matches, navigation, cancellation, all three destinations, same-app selection, draft retention, app-to-app Ctrl+P, and overlay replacement cleanup. Shortcut tests will exercise effective declarations/help, user overrides, Ctrl+P collision removal, distinguishable Ctrl+M sequences, ordinary Enter, unchanged Ctrl+L/Shift+Tab, and comparison isolation. Shared rendering tests will assert deterministic backdrop/panel colors in both color modes, full frame dimensions, ANSI/wide-grapheme safety, selected-row backgrounds, nested Settings presentation, and restoration. Workflow-output tests will prove silent successful switches with visible failures/warnings and updated status state.

During implementation run only typecheck, the affected test files, and strict change validation before pushing. Trusted exact-head CI owns broader validation after completion. Optional visual review should compare Apps and a nested Settings selector against the supplied references; it is not an implementation-completion gate.

## Risks and gap disposition

- Legacy Ctrl+M ambiguity: preserve Enter and disclose any unsupported encoding rather than introducing data-loss behavior.
- Application overlays currently use separate route and local-selector paths: ensure replacement callbacks cannot close the newly selected app.
- Existing specifications explicitly require unbound model selection and a dark RGB 38 floating palette: this change deliberately supersedes those policies in its deltas.
- The footer separator refinement is approved for completion in this delivery; implementation evidence records the final gap dispositions.
