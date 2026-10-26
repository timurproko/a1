# Design

## Context

`src/ui/settings/declarations.ts` lists purple first and defaults to purple. Bare A1's theme projection already provides six named accent palettes and derives accent, border, secondary heading, and selection colors. Normal theme setup reads the global profile later; the trust preflight runs before project resources load. The bare trust renderer currently has hard-coded purple/blue values. The self-updater and dependency-free `@timurproko/a1-install` currently import generated pinned-purple progress strings, so neither consults the saved profile. A fresh install may have no profile at all.

## Goals / Non-Goals

**Goals:** Blue-first/default Settings presentation, consistent persisted selection across normal and pre-load A1-owned surfaces, safe blue first-install fallback, profile isolation, and preserved pre-trust security and installer independence.

**Non-goals:** Changing Pi's stock theme, comparison mode, project trust decisions, custom themes beyond the declared A1 accent selection, terminal neutral colors, progress geometry, child-output policy, or persistence format. Existing user choices other than an unstored old default remain unchanged; an omitted purple value from a previous version cannot be distinguished from an untouched default.

## Decisions

### 1. Treat the global profile as the sole early color authority

Resolve the same effective profile home and `.a1/agent/settings.json`/`a1.accentColor` namespace used by Settings. Read it before drawing an A1-owned pre-load surface, without evaluating any project-local configuration or starting Pi's resource pipeline. Accept only declared accent names, use the blue default when absent/invalid/unreadable, apply the existing compatibility transform for a legacy `default` choice where appropriate, and never write during presentation. Keep reads bounded and side-effect free. Do not infer a selected color from terminal foreground or a previous process. The installed updater and the standalone installer must agree on profile-home overrides, even for fresh installations.

### 2. Reuse semantic palette derivation rather than copying fixed ANSI

Normal bare A1 still projects the selected semantic palette through its theme. Pre-resource trust will use a startup-safe semantic palette derived from the same named accent family: accent for the title/choice, border for the rules, and existing neutral roles for explanatory text. Resolve with the active terminal appearance and color mode where available; avoid a new dependency on project themes or resource loading. Keep comparison trust's pinned presentation separate. For standalone installer, generate a small release-owned, dependency-free palette asset from the canonical A1 palette for each allowed name and relevant terminal mode; it can resolve a saved profile choice using Node built-ins only. Change the palette synchronization check to validate the owned defaults instead of blindly regenerating Pi's purple accent. The bundled palette is a fallback for a missing or unreadable settings file, not a source of user-specific state.

### 3. Bind meters to the setting at their entry points

Supply the effective color to the progress renderers for the run, rather than relying on process-global mutable theme state. Keep the bar's 40-cell layout, track/percentage neutrals, completion/cleanup, and non-TTY silence. Reading color must not interfere with update rollback, installation verification, or cancellation. If a standalone installer delegates to an older installed updater, the outer installer still owns the colored visible meter and must not expose the child meter.

### 4. Prove profile behavior and isolation at the pre-load boundary

Targeted tests cover default blue and menu ordering, explicit purple and other choices across restart, invalid/missing/oversized document fallback, alternate profile home, trust before resource loading, dark/light and supported terminal color modes, both meters, dependency-free installer packaging, and unaffected comparison presentation. Tests assert effective ANSI roles as well as visible text/geometry; existing meter and trust lifecycle tests continue covering restoration and failures. A live color change needs no retrofit of a preflight dialog already dismissed: subsequent early launches read the saved value, while normal running surfaces repaint through the existing live setting path.

## Risks / Trade-offs

- **[Early readers duplicate settings parsing]** → Architecture keeps the dependency-free installer, release foundation, and pre-trust Settings owner separate. Keep each read-only implementation small and bounded; fixture-test their results and generate all three palette assets from one named theme projection.
- **[Trust reads project state too soon]** → Pass only the resolved global profile identity; assert untrusted project settings have no effect.
- **[Default changes a formerly unstored purple preference]** → Preserve any explicit stored purple; report the unavoidable omitted-value ambiguity rather than fabricating a migration.
- **[Theme mismatch by mode]** → Test dark/light and color capability behavior against the named A1 palette, not hard-coded purple SGR bytes.

## Startup budget

Pre-trust palette resolution adds two reachable modules (`ui/settings/early-accent.ts` and its generated named palette). The startup reachability baseline is repinned from 200 files / 1,853,932 bytes to 202 files / 1,860,801 bytes; Pi's public-artifact budget and optional-module list are unchanged. The eager path does not import the interactive theme, project settings, installer, or release updater. This is an explicit first-prompt correctness cost, not an unrestricted size relaxation.

## Migration Plan

No schema bump or settings rewrite. Existing explicit values continue to resolve. An omitted value resolves to blue after upgrade; storing purple explicitly restores it. Rollback returns the previous default and generated color asset, without changing user data.
