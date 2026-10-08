## Context

See `proposal.md` for motivation. Bare A1 currently calls `applyConfiguredPiTheme("dark")`, while comparison mode uses Pi's configured theme. The theme adapter loads complete built-in or custom theme documents into one active `Theme`, exposes it through `piTheme()`, and notifies listeners after replacement or watched-file reload. Most owned and retained UI paints the semantic `accent` token through that facade. The owned settings manager already provides versioned profile-local scalar choices and live change notifications.

Pi's dark resource currently maps `accent` to a variable named `violet`, and tests record its current ANSI bytes. Other roles such as Markdown code, syntax types, custom-message labels, and thinking levels may independently use purple hues. Those roles are not the primary accent contract and must not be recolored by comparing resolved colors or following the current variable graph.

## Goals / Non-Goals

**Goals:**
- Offer a small accessible accent palette in bare A1 and apply it live.
- Preserve exact active-theme behavior when the preference is `default`.
- Ensure one semantic accent choice reaches every bare-A1 consumer of the owned theme facade.
- Survive ordinary Pi accent value, variable, and theme-resource changes without stale copied palettes.
- Detect an incompatible future Pi semantic-theme change during the controlled upgrade process.

**Non-Goals:**
- Expose Pi's complete theme selector in bare A1 or create generated user theme files.
- Recolor every role whose current resolved value appears purple.
- Change selected backgrounds, Markdown/syntax palettes, thinking-level scales, HTML exports, installer progress, or self-update progress.
- Change `a1 pi`, Pi settings storage, project themes, or extension-owned color decisions that do not request the semantic accent.

## Decisions

### 1. Persist one A1-owned semantic preference

Add `accentColor` to the owned setting declarations in a new `Appearance` section after `Generic`. Its ordered choices are `default`, `blue`, `cyan`, `green`, `orange`, and `pink`; its default is `default`; and its application is live. Advance the settings document version with a no-op forward migration so existing and unknown values remain intact. Existing validation makes unknown stored values fall back safely to `default`.

The setting remains A1-owned because bare A1 deliberately hides Pi's full-theme setting and the preference changes the owned presentation policy rather than Pi's theme selection grammar. It is not exposed by `a1 pi` and never writes Pi's settings document.

### 2. Project the accent at the central theme boundary

Keep an unmodified base `Theme`, a separately stored accent preference, and a derived active theme. `default` returns the base object unchanged. A named preference returns a transparent `Theme` projection that delegates all behavior to the base except:

- `fg("accent", text)` and `getFgAnsi("accent")` use the selected color;
- `style(..., { fg: "accent" })` uses the selected concrete color;
- `colors.accent` reports the selected concrete color for extension and color-math consumers.

All other properties, methods, token bytes, mode, appearance, source identity, and background behavior delegate to the base. This avoids serializing a complete theme, preserves terminal-default and indexed colors for every untouched role, and also composes with an in-memory theme instance.

Palette entries are A1-owned appearance-aware OKHSL values: each named choice has dark and light variants with the established accent lightness for that appearance. The current bare product uses dark, but appearance-aware entries keep the projection valid if base-theme selection is enabled later. The palette is keyed by stable preference IDs, not Pi variable names or current RGB bytes.

Theme loading, watched-file reload, and instance replacement always update the base and then derive the active projection once. Changing the preference reprojects from the stored base rather than from the previous projection, preventing cumulative transforms. One notification follows each effective replacement.

Mutating `BUILTIN_THEME_RESOURCES`, replacing matching colors, rewriting `vars.violet`, or writing generated custom themes was rejected because each couples user intent to an incidental upstream representation and can silently recolor unrelated roles.

### 3. Keep one accent-aware facade for bare-A1 consumers

Owned components continue to use `piTheme()`. Any select-list theme factory used by bare A1 that currently closes over Pi's package-global theme is replaced with an owned factory that resolves `piTheme()` at paint time. The extension UI bridge continues to expose the active projected theme. Add an architecture regression that prevents direct package-global select-list theme imports from returning to owned rendering paths.

The package-global base theme remains initialized for public Pi components that use non-accent roles internally. Focused inventory tests cover every package component used by the owned shell that directly consumes accent; any future consumer that bypasses the facade must fail by name during Pi synchronization rather than silently retaining the old color.

### 4. Apply and repaint live only in bare A1

Bare composition sets the preference from the already resolved profile settings immediately after installing the base dark theme and before constructing visible shell content. It subscribes to settings changes and updates the theme projection only when the effective accent value changes. Comparison/settings-free composition explicitly keeps `default` and retains existing Pi behavior.

A theme change invalidates transcript/layout caches and requests a forced render so existing and newly constructed components repaint in the same session. The settings screen itself reads the live facade, so its accent row, title, markers, and menus update without closing the screen. Disposal removes both settings and theme subscriptions.

### 5. Preserve default parity and add future-change evidence

Existing pinned-theme parity remains authoritative under `default`; expected Pi bytes are not rewritten to the new palette. Separate customization tests verify named choices in truecolor and 256-color modes, `fg`/`style`/ANSI/color introspection, non-accent byte preservation, live replacement, watcher/instance reapplication, settings persistence/migration, and comparison isolation.

A synthetic base theme with a deliberately different accent proves that `default` inherits the new value while a named preference still projects its declared color. The pinned token inventory remains exact and fails if Pi removes, renames, or adds a theme role without review. This is the desired response to an incompatible upstream contract change: fail during upgrade, not silently preserve stale purple assumptions.

## Risks / Trade-offs

- **[A package component bypasses the owned theme facade]** → Inventory direct accent consumers and prohibit package-global select-list theme helpers on owned paths; cover representative complete frames and extension access.
- **[A selected hue lacks contrast on a future base appearance]** → Keep reviewed dark/light variants and contrast assertions against the corresponding base backgrounds; an unsupported appearance fails validation rather than guessing.
- **[A live change leaves cached rows in the previous color]** → Treat accent changes as theme changes, clear theme-sensitive caches, and force a complete render.
- **[Global theme state leaks between comparison and owned compositions or tests]** → Set the preference explicitly at composition boundaries and restore/reset it in fixtures.
- **[Users interpret all purple syntax as accent]** → Label and document the control as the semantic UI accent; broader brand-palette customization requires an explicit role list in a separate change.

## Migration Plan

1. Add the versioned setting and tests with `default` preserving current behavior.
2. Add the central base-theme projection and accent-aware select-list facade.
3. Wire bare composition, live invalidation, disposal, and comparison isolation.
4. Run focused settings, theme parity, shell-frame, extension, architecture, typecheck, and build validation before interactive review.

Rollback removes the live projection and declaration. Unknown-key preservation lets a newer stored `accentColor` remain inert in an older build without damaging the profile.
