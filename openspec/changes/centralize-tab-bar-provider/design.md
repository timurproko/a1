# Design

## Context

The attach core currently treats Agent as an implicit default and describes only Settings and Changelog through `UtilityKind`. The plus menu, command palette, shortcut dispatch, hidden/prewarmed state, context menus, and server each reconstruct part of the kind model. The server also has a second utility-kind table and an `insert_new_tab` branch that deliberately inserts Agents before a trailing utility tab. Standby promotion uses a different append path.

This creates two tab-bar problems. Behavior depends on which creation path ran, and adding a kind requires editing several tables and conditionals. The tab bar should instead consume one kind provider and apply one set of lifecycle and ordering rules.

The owned prompt has another interaction conflict. Editor-owned double-click and triple-click selection is currently included in fullscreen copy-on-select, so selecting a replacement target overwrites the clipboard before `Ctrl+V` reads it. The asynchronous paste path already replaces an editor selection correctly; it receives the wrong payload because selection release changed the clipboard first.

Native tab dialogs have also bypassed the owned shortcut-hint grammar. The Commands and Plus Menu footers are constants painted as one muted span, so keys and actions have no semantic color boundary and entries use middle dots instead of the shared two-space gap. The TypeScript dialog component already owns the desired semantic model, but the native attach renderer needs an equivalent reusable boundary rather than more dialog-specific ANSI assembly.

Owned Settings currently has two configure presentations. Resident Plus Menu is a centered floating surface over a dimmed screen, but Warnings, the Thinking Level selector, and generic structured values are rendered as a full-width panel docked at the bottom. The setting declaration should choose content and behavior, not a different frame style.

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

## Risks

- Broadly replacing utility checks can accidentally allow a singleton tab to own Agent session metadata or become renameable. Provider-policy tests cover every registered kind and server tests cover those capability boundaries.
- Hidden singleton tabs have durable registry positions even while absent from one client's strip. Reveal must use the generic final-live-slot operation before the client shows them, while an already shown singleton must retain a dragged slot.
- Standby promotion and cold creation must produce identical visible ordering; both paths receive the same append regression coverage.
- Readers who relied on prompt multi-click auto-copy must use explicit `Ctrl+C`; focused regressions preserve that route and prove complete-frame copy-on-select still applies to transcript, prompt-row, message, and status selections.
- Paste replacement is asynchronous and may reserve a hidden marker; shell-level coverage starts with external clipboard text, selects a prompt word through pointer input, and proves the final draft contains the replacement rather than the selected source.
- A shared native renderer can accidentally count ANSI bytes as visible cells or split a wide grapheme. Component tests cover plain text, semantic color boundaries, truecolor and 256-color modes, separator removal, and narrow clipping before the palette integration assertions.
- A centered Settings overlay can leak faint styling into the modal or clear dimming after the panel. ANSI-aware component tests cover intensity restoration, panel-width filling, tail-style replay, centering, and exact frame dimensions.
- A fixed model window can push Thinking Level guidance off a short terminal. The selector computes its visible model rows from the modal's available height and retains selection-relative windowing.
