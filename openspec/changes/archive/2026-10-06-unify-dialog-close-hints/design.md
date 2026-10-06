## Context

See `proposal.md` for motivation. Bare A1 already has one semantic shortcut renderer shared by owned and adapted Pi surfaces, but each producer still supplies its own dismissal key/action pair. Models and Thinking supply `Esc close`; other producers supply variants such as `Escape cancel`, `Esc to cancel`, or `Esc exit`, while Session Tree and Resume Session do not include dismissal in their ordinary guidance. The cancellable operation loader and some authentication flows still obtain their rows from dependency-owned components, and the startup trust prompt intentionally cannot load the post-trust component graph.

The modal inventory is the completeness authority for top-level and nested shell surfaces. Owned full-screen routes are covered separately by their shortcut registries and host tests. The in-flight dialog Ctrl+C work changes input routing but deliberately preserves existing visible action wording; this change must reconcile with it if it reaches `develop`, without making Ctrl+C visible or altering its behavior.

## Goals / Non-Goals

**Goals:**

- Establish one semantic authority for the exact close entry `Esc close` and use it at every A1-rendered dismissible modal depth and owned full-screen route.
- Make omitted close controls explicit and keep the close entry complete at widths that can display it.
- Keep inventory and focused rendering tests strong enough that a new or regressed dialog cannot silently choose different dismissal wording.

**Non-Goals:**

- Changing what Escape, Ctrl+C, a custom binding, operation abortion, or nested cancellation does.
- Rewording non-dismissal Escape guidance in autocomplete, shell help, transcript status, or ordinary editor surfaces.
- Rewriting extension-owned custom geometry or changing the pinned `a1 pi` comparison presentation.

## Decisions

### 1. Model close guidance as canonical semantic data

The framework-neutral presentation layer will expose one immutable close-hint entry whose rendered text is `Esc close`. Owned UI and Pi-backed renderers will consume that entry rather than reconstructing its key or action strings. The close entry will be appended exactly once after state-specific entries.

This keeps key/action coloring and casing in the existing semantic renderer while preventing producer-level drift. A global text replacement was rejected because it would conflate dismissal with non-dialog Escape uses, depend on already-rendered ANSI text, and could alter extension-owned or comparison output.

### 2. Preserve the close suffix through each surface's existing overflow policy

One-line producers will reserve the complete close suffix before clipping their preceding entries whenever at least `Esc close` fits. Wrapping producers will treat the close entry as an indivisible final chunk. A surface too narrow for the complete entry will retain its current ANSI-safe clipping behavior. State-specific guidance such as confirmations, transient errors, or operation progress will compose the same final close entry rather than temporarily reverting to a variant or omitting dismissal.

A mandatory extra footer row on every surface was rejected because it would change modal heights, viewport allocation, and snapshots unnecessarily. The owner retains its established one-line, two-line, or wrapped geometry while the shared close entry remains an atomic suffix.

### 3. Normalize at owned producer and adapter boundaries, not in dependencies

Owned Settings/reference routes, local selector ports, Session Tree, Resume Session, extension-hosted prompts, and the operation surface will explicitly compose canonical semantic guidance. Where a dependency-owned component currently authors dismissal text internally, the A1 adapter will own the relevant hint row through a bounded local adapter or source-synchronized port, updating the pinned-source ledger when required. It will not patch installed package files or rewrite arbitrary rendered rows.

Generic selector adapters will add a footer only when the surface is dismissible. Non-dismissible loaders such as reload remain without a manufactured close action. Extension-owned custom replacements and overlays remain unchanged unless A1 itself renders their close row.

### 4. Treat `close` as presentation language, not an outcome rename

`Esc close` names dismissal of the visible surface. Existing callbacks and outcomes remain cancellation, operation abort, startup exit, parent restoration, or silent top-level close as appropriate. Tests will assert both the canonical visible text and the unchanged callback/result lifecycle.

This avoids broad controller renames and preserves compatibility with the pending Ctrl+C alias work. The implicit alias remains absent from guidance.

### 5. Keep the startup and comparison boundaries explicit

The pre-resource trust prompt will use an equivalent fixed-color literal assembled by its startup-safe renderer, because importing the post-trust presentation graph would violate its isolation contract. Bare-A1 adapters receive the new guidance; constructors and render paths used only by `a1 pi` retain pinned bytes.

## Risks / Trade-offs

- [Dependency-owned dialogs expose unstable child layouts] → Prefer local typed ports or source-synchronized copies with ledger anchors and focused lifecycle tests; do not index and mutate anonymous rendered rows.
- [Reserving the close suffix hides an optional trailing action at constrained widths] → Preserve the owner's clipping/wrapping order for preceding actions and test ordinary plus narrow widths; dismissal remains the guaranteed control.
- [A transient state accidentally replaces the whole shortcut row] → Include ordinary, confirmation, error/progress, and nested-state fixtures in inventory-backed coverage.
- [Reconciliation with the Ctrl+C change causes overlapping edits] → Merge current `origin/develop` before implementation, retain its input-routing behavior, and limit this change to presentation plus missing hint composition.
- [“Close” obscures operation-specific cancellation semantics] → Keep operation messages/results and abort behavior unchanged; the canonical label consistently describes leaving the visible dialog.

## Migration Plan

No data migration is required. Implement and validate against the current target, reconcile any integrated dialog-input changes, and roll back by reverting the presentation commit; persisted settings and session data are unaffected.
