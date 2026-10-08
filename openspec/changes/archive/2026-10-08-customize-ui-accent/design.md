## Context

See `proposal.md` for motivation. Bare A1 currently calls `applyConfiguredPiTheme("dark")`, while comparison mode uses Pi's configured theme. The theme adapter loads complete built-in or custom theme documents into one active `Theme`, exposes it through `piTheme()`, and notifies listeners after replacement or watched-file reload. Most owned and retained UI paints the semantic `accent` token through that facade. The owned settings manager already provides versioned profile-local scalar choices and live change notifications.

Pi's dark resource currently maps `accent` to a variable named `violet`, and tests record its current ANSI bytes. Other roles such as general Markdown code, syntax types, custom-message labels, and thinking levels may independently use purple hues. Those roles are not the primary accent contract and must not be recolored by comparing resolved colors or following the current variable graph. Markdown headings and list markers are explicit exceptions because they visually structure assistant answers and owned secondary section titles.

## Goals / Non-Goals

**Goals:**
- Offer a small accessible accent palette in bare A1 and apply it live.
- Use an explicit purple palette entry as the initial accent so every displayed choice has the same projection behavior.
- Ensure one semantic accent choice reaches every bare-A1 consumer, with coordinated neighboring-hue border and secondary tones for headings and active filter values, neutral text-colored filled state markers, half-strength low-emphasis selection and visible user-prompt tones, secondary/filter-tone list markers and hotkeys, and hover-only sticky/jump surfaces.
- Survive ordinary Pi accent value, variable, and theme-resource changes without stale copied palettes.
- Detect an incompatible future Pi semantic-theme change during the controlled upgrade process.

**Non-Goals:**
- Expose Pi's complete theme selector in bare A1 or create generated user theme files.
- Recolor every role whose current resolved value appears purple.
- Change backgrounds other than selected rows and visible user prompts, Markdown roles other than headings and list markers, syntax palettes, thinking-level scales, HTML exports, installer progress, or self-update progress.
- Change `a1 pi`, Pi settings storage, project themes, or extension-owned color decisions that do not request the semantic accent.

## Decisions

### 1. Persist one A1-owned semantic preference

Add `accentColor` to the owned setting declarations in a new `Appearance` section after `Generic`, then move the existing `quitAnimation` declaration into that section after the accent. `Generic` remains first with `updateCheck` as its sole entry. The accent's ordered choices are `purple`, `blue`, `cyan`, `green`, `orange`, and `pink`; its default is `purple`; and its application is live. Advance the settings document version with a forward migration, and migrate the earlier implementation's stored `default` value to `purple`; existing and unknown values otherwise remain intact. Existing validation makes unknown stored values fall back safely to `purple`.

The setting remains A1-owned because bare A1 deliberately hides Pi's full-theme setting and the preference changes the owned presentation policy rather than Pi's theme selection grammar. It is not exposed by `a1 pi` and never writes Pi's settings document.

### 2. Project the accent at the central theme boundary

Keep an unmodified base `Theme`, a separately stored accent preference, and a derived active theme. Every palette choice returns a transparent `Theme` projection that delegates all behavior to the base except:

- `fg("accent", text)` and `getFgAnsi("accent")` use the selected color;
- `style(..., { fg: "accent" })` uses the selected concrete color;
- `colors.accent` reports the selected concrete color for extension and color-math consumers.

Keyboard-shortcut documents use a dedicated Markdown-theme wrapper that paints only inline key-code spans with `mdHeading`, leaving general Markdown code untouched. The same projection also replaces both `mdListBullet` and `mdHeading` with the same brighter neighboring-hue secondary tone used by section/Markdown headings, active dialog-filter values, and hotkey spans, `border` with a darker neighboring-hue tone that is visibly distinct from titles, `selectedBg` with roughly half the prior chroma and a value closer to the terminal background, emulating a half-opacity tint despite terminals lacking alpha compositing, and `userMessageBg` with a still quieter tint. Resting scrolled-out sticky prompts and jump-to-bottom badges retain neutral `toolPendingBg`; their hovered states use the projected selection tone. `fg`/`getFgAnsi`/`style` cover accent, headings, list markers, and the derived border, while `bg`/`getBgAnsi`/`style` cover both derived surfaces. This keeps ordered-list numbers, bullets, hotkeys, and active filters visually aligned for every palette. All other properties, methods, token bytes, mode, appearance, source identity, and background behavior delegate to the base. This avoids serializing a complete theme, preserves terminal-default and indexed colors for every untouched role, and also composes with an in-memory theme instance.

Palette entries store only each named choice's A1-owned dark and light primary accent. One exported color transform accepts any concrete accent, converts it to OKHSL, and derives border, secondary-heading/filter, half-strength selection, and quieter user-message tones through appearance-aware hue, saturation, and lightness offsets. Direction follows the input hue sector rather than a palette ID; magenta and blue sectors receive stronger secondary shifts so purple and blue preserve the same clear H1/H2 hierarchy as the other accents. This makes a future custom accent use the complete family automatically without adding per-role literals. The current bare product uses dark, while appearance-aware derivation remains valid if base-theme selection or custom colors are enabled later.

Theme loading, watched-file reload, and instance replacement always update the base and then derive the active projection once from the primary accent. Projections are cached by base-theme identity and accent, and projected instances retain a link to their unmodified base; restoring a previously active in-memory theme therefore restores the exact wrapper identity without cumulative projection. Changing the preference reprojects from the stored base rather than from the previous projection. One notification follows each effective replacement.

Mutating `BUILTIN_THEME_RESOURCES`, replacing matching colors, rewriting `vars.violet`, or writing generated custom themes was rejected because each couples user intent to an incidental upstream representation and can silently recolor unrelated roles.

### 3. Keep one accent-aware facade for bare-A1 consumers

Owned components continue to use `piTheme()`. Any select-list, Markdown, or dialog-border factory used by bare A1 that currently closes over Pi's package-global theme is replaced with an owned factory that resolves `piTheme()` at paint time. Retained package dialogs receive a border-only projection through Pi's shared theme slot; comparison composition restores the unmodified base there. The extension UI bridge continues to expose the active projected theme. The settings value menu requests palette-preview squares from the same facade, while its current-value check stays on ordinary text color. Add an architecture regression that prevents direct package-global select-list theme imports from returning to owned rendering paths.

The package-global base theme remains initialized for public Pi components that use non-accent roles internally. Focused inventory tests cover every package component used by the owned shell that directly consumes accent; any future consumer that bypasses the facade must fail by name during Pi synchronization rather than silently retaining the old color.

### 4. Apply and repaint live only in bare A1

Bare composition sets the preference from the already resolved profile settings immediately after installing the base dark theme and before constructing visible shell content. It subscribes to settings changes and updates the theme projection only when the effective accent value changes. Comparison mode continues to use Pi's unmodified theme path and retains existing Pi behavior.

A theme change invalidates transcript/layout caches and every retained transcript component before requesting a forced render, so finalized Markdown markers as well as newly constructed components repaint in the same session. The settings screen itself reads the live facade, so its accent row, title, markers, and menus update without closing the screen. Disposal removes both settings and theme subscriptions.

### 5. Preserve unrelated-role and comparison parity

Pinned-theme parity remains authoritative for every role outside the explicit accent family, while `a1 pi` remains fully byte-identical to Pi. Customization tests verify all six choices in truecolor and 256-color modes, live keyboard-shortcut key spans, foreground/background/style/ANSI/color introspection, accent-family projection including headings, filters, and list markers plus neutral text-colored state markers, neighboring-hue border separation, owned and retained dialog rules, all-other-role byte preservation, subtle selection contrast, neutral resting and accent-hover sticky/jump controls, live replacement, watcher/instance reapplication, settings persistence/migration, neutral checkmarks, palette previews, section placement, and comparison isolation.

Synthetic base-theme replacement proves that a selected palette entry remains stable while unrelated roles follow the replacement. The pinned token inventory remains exact and fails if Pi removes, renames, or adds a theme role without review. This is the desired response to an incompatible upstream contract change: fail during upgrade, not silently preserve stale assumptions.

## Risks / Trade-offs

- **[A package component bypasses the owned theme facade]** → Inventory direct accent consumers and prohibit package-global select-list theme helpers on owned paths; cover representative complete frames and extension access.
- **[A selected hue lacks contrast on a future base appearance]** → Keep reviewed dark/light variants and contrast assertions against the corresponding base backgrounds; an unsupported appearance fails validation rather than guessing.
- **[A live change leaves cached rows in the previous color]** → Treat accent changes as theme changes, clear theme-sensitive caches, and force a complete render.
- **[Global theme state leaks between comparison and owned compositions or tests]** → Set the preference explicitly at composition boundaries and restore/reset it in fixtures.
- **[Users interpret all purple syntax as accent]** → Label and document the control as the semantic UI accent; broader brand-palette customization requires an explicit role list in a separate change.

## Migration Plan

1. Add the versioned setting and tests with `purple` as the initial explicit palette choice.
2. Add the central base-theme projection and accent-aware select-list facade.
3. Wire bare composition, live invalidation, disposal, and comparison isolation.
4. Run focused settings, theme parity, shell-frame, extension, architecture, typecheck, and build validation before interactive review.

Rollback removes the live projection and declaration. Unknown-key preservation lets a newer stored `accentColor` remain inert in an older build without damaging the profile.
