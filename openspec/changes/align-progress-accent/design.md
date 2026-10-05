# Design

## Context

The self-updater and dependency-free installer each embed the same truecolor opening sequence for `#8abeb7`. Pi 1.0 moved the controls visible in A1's shell to a violet semantic accent, so the duplicated progress literals no longer match. Importing Pi directly into the installer would restore visual coupling at the cost of the installer's deliberately empty dependency graph and would still be unavailable before the target package has been acquired.

## Goals

- Render install and self-update completion with the same release accent used by pinned Pi controls.
- Establish one repository authority for the progress accent and refresh it as part of future Pi pin upgrades.
- Preserve installer isolation and every non-color progress/output contract.

## Non-goals

- Loading arbitrary user theme files or querying terminal colors during bootstrap.
- Changing scrollbar-specific track/thumb roles, the muted progress track, or percentage styling.
- Changing progress timing, milestones, geometry, glyphs, or terminal cleanup.

## Decisions

### Ship one release-synchronized progress palette

Add a small dependency-free palette module under the installer package tree and include that same file in both the main A1 package and the installer tarball. The self-update renderer and installer renderer will import its completed-segment styling rather than embedding separate RGB escapes. Both published artifacts therefore execute the same bytes for this color role.

The palette represents the pinned release's default semantic `accent` role, not the obsolete scrollbar-specific teal and not an independently selected product color. Track and percentage styles remain owned by the existing renderers.

### Regenerate the palette from the pinned Pi theme

Extend the Pi synchronization path to resolve the pinned theme's accent through the supported theme implementation and write the minimal palette module deterministically. The normal Pi-upgrade proposal flow will run this step after changing the pin. A focused drift check will compare the committed palette against the current pinned theme, so a changed pin cannot silently retain an old progress accent.

The generated module will carry provenance identifying the pinned Pi package version/source used to derive it. It will contain only static ANSI styling data and no dependency import, filesystem lookup, or terminal query, keeping fresh installation available before A1 and Pi are present.

### Keep package boundaries explicit

The root package's file allowlist and the installer package's file allowlist will both declare the palette asset. Installer package validation will continue requiring a minimal, dependency-free surface and will verify that the packed executable can resolve the asset. Main-package smoke coverage will verify self-update can resolve the identical asset from the installed layout.

### Validate semantics rather than another literal

Focused tests will compare both renderers' completed segments with the generated shared accent styling and compare the generated resource with the pinned Pi semantic accent. Assertions for the muted track, percentage, reset, complete frame geometry, cleanup, and redirected output remain in place. Tests will not replace the old RGB literal with a new hardcoded RGB literal as the behavior contract.

## Risks / Trade-offs

- **The standalone installer cannot know an arbitrary user theme before installation** → The shared asset follows the pinned release's default semantic accent; loading user configuration remains outside bootstrap scope.
- **An extra installer asset could weaken the minimal package guarantee** → Declare exactly one palette module and retain exact packed-file and zero-runtime-dependency checks.
- **A Pi upgrade could bypass palette refresh** → Put deterministic generation in the existing Pi-upgrade flow and add a drift test against the installed pin.
- **Color-mode differences could make byte comparisons brittle** → Derive and test the same declared color mode used by the static progress renderer while asserting the semantic accent source separately.

## Rollback

Reverting the shared module imports, package allowlist entries, synchronization step, and spec deltas restores the two fixed-color renderers. No user data, settings, transaction format, or migration is involved.
