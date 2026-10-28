# Design

## Context

The attach core currently treats Agent as an implicit default and describes only Settings and Changelog through `UtilityKind`. The plus menu, command palette, shortcut dispatch, hidden/prewarmed state, context menus, and server each reconstruct part of the kind model. The server also has a second utility-kind table and an `insert_new_tab` branch that deliberately inserts Agents before a trailing utility tab. Standby promotion uses a different append path.

This creates two tab-bar problems. Behavior depends on which creation path ran, and adding a kind requires editing several tables and conditionals. The tab bar should instead consume one kind provider and apply one set of lifecycle and ordering rules.

The owned prompt has another interaction conflict. Editor-owned double-click and triple-click selection is currently included in fullscreen copy-on-select, so selecting a replacement target overwrites the clipboard before `Ctrl+V` reads it. The asynchronous paste path already replaces an editor selection correctly; it receives the wrong payload because selection release changed the clipboard first.

Native tab dialogs have also bypassed the owned shortcut-hint grammar. The Commands and Plus Menu footers are constants painted as one muted span, so keys and actions have no semantic color boundary and entries use middle dots instead of the shared two-space gap. The TypeScript dialog component already owns the desired semantic model, but the native attach renderer needs an equivalent reusable boundary rather than more dialog-specific ANSI assembly.

Owned Settings currently has two configure presentations. Resident Plus Menu is a centered floating surface over a dimmed screen, but Warnings, the Thinking Level selector, and generic structured values are rendered as a full-width panel docked at the bottom. The setting declaration should choose content and behavior, not a different frame style.

The shared reference-screen app currently owns scrolling and scrollbar pointer input but treats every other document pointer report as consumed navigation chrome. Changelog and startup release-note rows therefore cannot use the owned selection and clipboard behavior already available in the session frame. The resident Changelog tab also reserves `Ctrl+C` for its two-press exit chord, so explicit copy must take precedence only while a selection exists.

The centered Settings dialogs currently receive their panel background from a route-host literal (`55,55,55`), while the native Commands and Plus Menu component owns a darker neutral surface (`38,38,38`, ANSI 235). That makes Warnings and Thinking Level visibly lighter than the reference dialog and leaves palette ownership outside the reusable component boundary.

## Decisions

### 1. One tab-kind provider

Add a pure native tab-bar provider in the I/O-free core. It declares every `TabKind` in stable order and exposes the metadata and policies needed by attach and server recipients:

- stable kind name, label, id stem, shortcut action, and optional child route;
- multi-instance or singleton multiplicity;
- create or toggle activation;
- whether the kind is prewarmed;
- whether its tab can be renamed;
- whether it owns an Agent session;
- the launcher marker used by tab-bar menus.

Agent, Settings, and Changelog are entries in this provider. Attach and server code import the same declarations rather than maintaining parallel kind tables. Registry validation accepts provider names, and tab identity resolves through the provider rather than ad hoc prefix tests.

### 2. One activation recipient

The attach state machine receives a `TabKind` activation and applies its provider policy:

- a multi-instance create kind starts a new tab;
- a singleton toggle kind hides itself when viewed, activates itself in place when already shown, or asks the server to create/reveal it when absent or hidden.

The command palette, shortcuts, plus launcher, and popup actions all invoke this activation recipient. They do not select Agent or utility code paths themselves. Singleton prewarm state is indexed from provider declarations instead of one field per concrete kind.

### 3. One placement API

The server exposes kind-neutral tab-order operations over live tabs:

- inserting a newly created tab appends it after every existing live tab;
- revealing a hidden existing tab moves it to the final live slot;
- selecting an already shown tab does not reorder it;
- stopped registry records are ignored when resolving the visible destination;
- explicit drag reorder remains revision-guarded and authoritative.

Normal holder creation, standby promotion, and singleton reveal use these operations. Ordering code never checks whether a tab is Agent, Settings, Changelog, or another future kind.

### 4. Capabilities stay provider-driven

Rules that legitimately differ by kind are queried from the provider rather than inferred from an `is_utility` category. Rename admission and context-menu rows use `renameable`; bridge session persistence and Agent counting use `owns_session`; singleton reservation and prewarming use multiplicity and prewarm policy; child route delivery uses the declared route.

This preserves current product behavior without making `utility` a second tab architecture.

### 5. Compatibility

Keep the existing generation-1 message names (`tab.create`, `tab.open-settings`, `tab.open-changelog`, and their prewarm forms). The provider derives those names, so no protocol migration or registry rewrite is required. Existing tab ids and stored kind strings remain valid.

### 6. Editor selection does not consume the paste source

Distinguish editor-owned prompt word or line selection from complete-frame selection. Complete-frame drags, including drags across prompt rows, continue through the viewport snapshot and honor `Copy on select`. A no-drag prompt multi-click remains owned by the editor, keeps its visual selection, and does not submit clipboard work on release.

This makes prompt replacement follow normal editable-text behavior: the system clipboard remains the content copied before selecting the target, and the existing asynchronous paste reservation replaces the exact selected range. Explicit `Ctrl+C` and cut continue through the editor's bounded exact-text copy route, including their established selection-collapse and acknowledgement behavior.

Pre-reading and privately retaining the old clipboard before every prompt selection was rejected. It would add hidden clipboard access, retain potentially sensitive content without a paste request, introduce permission and timing races, and make repeated selections depend on an invisible clipboard-history lease.

### 7. Native dialogs share semantic shortcut hints

Add a pure native shortcut-hint component that receives ordered semantic entries with a key and action. It applies the common display capitalization to named keys, emits each key in the quiet gray role and each action in the distinct lighter muted role, separates entries by exactly two cells, and clips at grapheme boundaries without splitting ANSI style state.

The Commands and Plus Menu dialogs declare their footers as entry arrays and render them through this component. The palette remains responsible only for its panel background and row placement; it maps the component's key and action roles to the established owned-dialog truecolor values, with stable 256-color fallbacks. Future native dialogs can reuse the same component without copying footer strings or styling decisions.

### 8. Settings configure actions share one centered modal frame

Replace the docked structured-value panel with a reusable overlay compositor in the shared component layer. It receives the already rendered Settings frame and semantic dialog rows, dims the complete backdrop, centers a compact surface up to the established dialog width, paints every cell with the floating-panel background, and restores full intensity inside the modal. ANSI-aware overlay composition preserves the styled Settings rows outside the panel and keeps the result at the requested terminal dimensions.

Warnings and generic object-valued settings keep their title, selected-part description, rows, undo route, and shortcut hints. The Thinking Level selector keeps both steps, model search, filtering, level choices, and back/close behavior. The TypeScript Plus Menu fallback also uses the same frame, while resident Settings continues to delegate to the native Plus Menu. Dialog row capacity derives from terminal height so compact terminals retain title, active controls, and guidance instead of clipping fixed ten-row lists through the bottom edge.

The overlay owns presentation only. Existing structured-setting keyboard and pointer policy, backend writes, undo history, search state, and list scroll state remain unchanged, and adding another structured setting automatically receives the shared frame without a dialog-specific branch.

### 9. Changelog reference screens own selectable document text

Enable selection only for Changelog-route documents, including startup `What's New`; Hotkeys and Session Info retain their current pointer behavior. The reference screen stores an ordered text selection against stable document-row indexes, paints visible selected cells through the shared text-selection component, and keeps the selection anchored while keyboard, wheel, or scrollbar scrolling changes the visible window. Drag selection, double-click word selection, and triple-click line selection use the shared text-selection primitives and ANSI-aware cell coordinates.

On selection release, the screen reads the live `fullscreenCopyOnSelect` value. When enabled, it submits normalized plain text through the route host's existing bounded clipboard callback; when disabled, it retains the painted selection without touching the clipboard. `Ctrl+C` with a nonempty selection always copies explicitly, clears the selection, and consumes the interrupt. With no selection, input falls through unchanged: standalone Changelog keeps its host-close behavior and a pinned resident Changelog keeps its two-press application exit chord.

Selection extraction excludes frame rules, footer hints, scrollbar cells, ANSI styling, and terminal padding while preserving selected line breaks and the release-note text visible at the selected columns. A non-selection key clears the retained selection before applying the existing screen action. Pointer ownership continues to give the scrollbar rail precedence, and selection drags may extend across visible document rows without activating content behind the screen.

### 10. The dialog component owns the native-matching surface palette

Add one component-level floating-dialog surface renderer to the shared UI component boundary. It paints the canonical neutral background used by the native Commands and Plus Menu component: RGB `38,38,38` in truecolor mode and ANSI color `235` in 256-color mode, with a background reset after the surface span. Settings composition supplies that renderer as the configure-dialog surface according to the active Pi color mode, while the ordinary raised-menu panel remains on its existing `55,55,55` or ANSI `237` surface. The route host therefore embeds no raw dialog or menu background sequence.

The Settings app derives a dialog-local theme whose `panel` role is the supplied configure surface, so the centered overlay and dialog-content components continue consuming only `theme.panel`. Warnings, both Thinking Level steps, fallback Plus Menu, generic structured settings, and future configure workflows receive the palette automatically without changing ordinary value-menu presentation. Selected rows remain on the accent-derived `selectedBg`, and titles, descriptions, inputs, and shortcut hints retain their existing semantic foreground roles. Native and TypeScript implementations keep separate language renderers but share explicit palette parity tests at their component boundaries.

### 11. Blank Agent surfaces never replace the startup preview

Treat visible text as part of the coherence requirement for a newly requested Agent view. While its holder publishes only blank surfaces, the presentation view model keeps the request pending and leaves the complete local Agent startup preview in place with no child cursor. Repeated blank revisions do not weaken that gate and elapsed time alone cannot make one visible. The first nonblank surface commits the requested topology, releases deferred input, and replaces the preview as one frame.

Do not interpret an explicit failure as an undrawn Agent. Existing create refusal, holder loss, child exit, failed-surface, restart, and recovery paths remain eligible to replace the preview with their owned notice or failure presentation. Removing the blank-surface timeout is preferred to drawing a new loading overlay after the view commits: the local preview already supplies the correct empty editor, footer, selected provisional chip, and input reservation without introducing a second startup state.

### 12. Changelog automatic copy uses the shared acknowledgement grammar

Have reference selection report the accepted character count when a nonempty automatic selection is submitted to the bounded clipboard callback. The reference screen owns the transient visual state and paints `copied N chars to clipboard` in the active accent, right-aligned on the final document row immediately above its footer rule, matching the session frame's message text, placement relationship, and one-second lifetime. The acknowledgement overlays presentation only: it does not enter document rows, selection extraction, scrolling, or clipboard content.

Show the acknowledgement only when `fullscreenCopyOnSelect` is enabled and the route accepted the clipboard submission. Disabled automatic copy remains silent and retains the selection. Explicit `Ctrl+C` keeps its existing copy-and-clear precedence without adding new behavior in this refinement. A newer automatic copy replaces the prior message and restarts the expiry timer; closing the screen cancels it.

### 13. Shared scrollbar geometry keeps a two-row thumb target

Change only the shared `scrollbarGeometry` minimum. For overflowing content, clamp the proportional rounded thumb height to at least two rows and at most the available track height. A one-row track remains a one-row thumb because geometry cannot exceed its track; every track of two or more rows receives a minimum two-row thumb.

Keep thumb travel and position derived from the resulting height, so top and bottom positions still land exactly at the track ends. Drag conversion, grab offsets, track paging, appearance, style, wheel speed, and rail ownership continue consuming the same geometry contract without surface-specific branches.

### 14. The visible selection owns copy and cut dispatch

Latch a pointer gesture that begins inside the prompt to the editor for its full lifetime. The deferred press still distinguishes a click from a drag, but the first distinct motion dispatches the original press and current motion to the editor instead of promoting the gesture into complete-frame selection. Subsequent motion and release remain editor-owned even outside the prompt bounds, where the editor's established clamping selects to its nearest text edge. This gives drag, word, line, and keyboard selection one editable-range contract: `Ctrl+C` copies and collapses it, `Ctrl+X` copies and deletes it, and paste replaces it without automatic copy-on-select.

Keep complete-frame selection for gestures that begin outside the editor. Its explicit-copy operation becomes reusable by both `Ctrl+C` and the general `app.message.copy` action. When that action fires, consume and submit an active frame selection first; only when no frame or editor selection exists may it invoke the last-agent-message workflow. A frame selection is non-editable, so `Ctrl+X` copies and clears it rather than deleting transcript, status, or application-message content. `/copy` remains an explicit last-agent-message workflow.

The acknowledgement must describe the operation that actually occurred. Successful selected-text copy uses `copied N chars to clipboard`; prompt cut does not show a copy acknowledgement under its established behavior; last-agent fallback retains its existing last-message notice. Selection-present paths must never emit `Copied last agent message to clipboard` or `No agent messages to copy yet.`

### 15. Selectable text shares one component-owned blue surface

Add one shared text-selection painter in the UI component layer. It owns the established blue background currently used by Agent transcript and ordinary prompt selection, applies that background over a terminal-cell range, preserves the recipient's foreground, attributes, hyperlinks, and grapheme boundaries, and restores the prior styling after the selected span. Recipients pass only their line, selected columns, and optional width measure; they do not embed the blue RGB or reconstruct its reset sequence.

Route Agent complete-frame selection, ordinary prompt-editor selection, Settings search-editor selection, Changelog, and startup `What's New` through this painter. Keep atomic-chip focus on its established reverse-video contract, because it represents one indivisible editor item rather than ordinary selected text. Keep list, value-menu, and dialog active-row `highlight` styling separate, because those rows represent navigation focus rather than copied text.

The shared painter is presentation-only. It does not change selection ownership, extraction, copy-on-select, explicit copy or cut, acknowledgement, scrolling, or pointer behavior. Changelog therefore receives the same blue selected-text surface as Agent content without inheriting session-specific clipboard logic.

### 16. Resize feedback has a focused minimum-display threshold

Treat the resize curtain as a delayed fallback rather than the first response to every geometry report. On the first resize of a focused attach client, retain the last coherent frame, send the new geometry to the viewed child, and arm the curtain for 120 milliseconds. If a surface matching the latest geometry arrives before that threshold, discard the pending curtain and repaint the coherent frame directly at full intensity. If the threshold expires first, replace the frame with the centered `Resize C x R` curtain; repeated geometry reports update its dimensions and recovery target without restarting the initial threshold, so a prolonged interactive resize still receives stable feedback. Once a matching frame arrives after the established settle gate, retain the existing whole-frame faint reveal and recovery bound.

Track outer-terminal focus from the already enabled focus-reporting mode. A resize received while the A1 terminal tab is unfocused still updates host and child geometry, but it does not arm or show the curtain. Losing focus cancels any pending or visible curtain and restores a coherent cached frame; gaining focus requests one complete repaint. This prevents Windows Terminal from storing a resize overlay in an inactive terminal tab and flashing it when the reader returns.

Do not debounce the wire resize itself. Every accepted geometry change continues to update create geometry, generation, strip layout, and child PTY size immediately. Only host-owned curtain presentation is delayed or suppressed, so prompt wrapping and child layout still converge on the latest dimensions.

## Risks

- Broadly replacing utility checks can accidentally allow a singleton tab to own Agent session metadata or become renameable. Provider-policy tests cover every registered kind and server tests cover those capability boundaries.
- Hidden singleton tabs have durable registry positions even while absent from one client's strip. Reveal must use the generic final-live-slot operation before the client shows them, while an already shown singleton must retain a dragged slot.
- Standby promotion and cold creation must produce identical visible ordering; both paths receive the same append regression coverage.
- Readers who relied on prompt multi-click auto-copy must use explicit `Ctrl+C`; focused regressions preserve that route and prove complete-frame copy-on-select still applies to transcript, prompt-row, message, and status selections.
- Paste replacement is asynchronous and may reserve a hidden marker; shell-level coverage starts with external clipboard text, selects a prompt word through pointer input, and proves the final draft contains the replacement rather than the selected source.
- A shared native renderer can accidentally count ANSI bytes as visible cells or split a wide grapheme. Component tests cover plain text, semantic color boundaries, truecolor and 256-color modes, separator removal, and narrow clipping before the palette integration assertions.
- A centered Settings overlay can leak faint styling into the modal or clear dimming after the panel. ANSI-aware component tests cover intensity restoration, panel-width filling, tail-style replay, centering, and exact frame dimensions.
- A fixed model window can push Thinking Level guidance off a short terminal. The selector computes its visible model rows from the modal's available height and retains selection-relative windowing.
- Changelog selection can conflict with rail dragging or the resident interrupt chord. Pointer tests cover rail precedence, and input tests prove `Ctrl+C` copies only when a selection exists before restoring the host's established no-selection behavior.
- Styled Markdown and hyperlink rows can make byte offsets diverge from terminal cells. Selection and extraction use shared ANSI-aware text primitives and regressions cover wrapped, styled, multi-row, word, and line selections.
- A route-host or dialog-specific background can drift from the native reference again. Governance checks reject raw dialog RGB in the Settings host, while component tests cover truecolor, 256-color, panel fill, selected-row restoration, and native palette parity.
- An Agent whose child remains alive but never draws will retain its startup preview instead of exposing a terminal cursor. Holder and child failure paths must still resolve that request visibly, and repeated blank surfaces must not renew or bypass the gate.
- A transient Changelog acknowledgement can obscure document text or leak into copied content if treated as a document row. It must remain a presentation overlay, avoid the scrollbar cell, and clear through a repaint after the shared one-second lifetime.
- Increasing the minimum thumb height reduces travel on short tracks and can shift drag rounding. Geometry tests must cover very long content, one-row and two-row tracks, top and bottom clamping, hit rows, and drag-to-end behavior.
- Changing prompt drag ownership can regress cross-frame selection or leave pointer state split between editor and viewport. Gesture tests must cover wrapped rows, leaving the prompt bounds, atomic chips, release cleanup, and frame selection that begins outside the editor.
- The general copy action can duplicate clipboard submission if it consumes a frame selection and still invokes the last-message workflow. Dispatch must have one explicit claimed/unclaimed result and tests must reject both misleading success and no-message notices while a selection exists.
- Reusing menu-row `highlight` for copied text lets accent customization change Changelog selection independently from Agent selection. Text-selection tests must assert the shared blue component output while menu and dialog row highlights remain theme-owned.
- A shared background painter can erase Markdown foregrounds, OSC links, or combining graphemes if it slices ANSI bytes rather than terminal cells. Component and Changelog regressions must preserve those styles and exact frame width.
- Delaying the resize curtain can expose a stale cropped frame briefly. The threshold is bounded to 120 milliseconds, geometry forwarding remains immediate, and a matching surface bypasses the curtain only when it is coherent for the latest generation.
- Resetting the threshold on every drag report would move the curtain flash to the end of a resize instead of removing it. Repeated focused reports must preserve the first deadline while retargeting settle and recovery to the latest geometry.
- An inactive Windows Terminal tab can receive geometry reports without being visible. Focus loss must cancel and repaint any existing curtain, background resizes must never arm one, and focus gain must restore a complete frame before the user interacts.
