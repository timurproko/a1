# Proposal

## Why

A1 currently defaults to purple in Settings, paints its pre-trust dialog with fixed purple accents and blue borders, and paints installation and self-update progress with a pinned purple ANSI value. These early surfaces cannot reflect a user's saved Accent color because the normal UI theme has not loaded yet. They should look like the rest of A1, including on first install when no settings exist.

## What Changes

- Put blue first in the Accent color choices and make it the default for a profile with no stored choice; keep the other named choices, including purple, available.
- Resolve the active profile's persisted A1 Accent color before A1-owned pre-resource UI is drawn, with a safe blue fallback when the settings document is absent, invalid, or unreadable. Do not read project settings or project resources to color trust.
- Apply that accent to the trust dialog's accent family (heading, rule, selected option) and to A1's self-update and standalone installer completed progress segment; keep neutral text, track, and percentage treatments unchanged.
- Preserve the dependency-free standalone installer, its no-profile first-install behavior, and the unchanged `a1 pi` comparison and vanilla Pi themes. A live Settings change affects the running UI and later pre-load presentations under the same profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Blue is the first and default Accent color; explicit stored choices continue to work and survive restart.
- `owned-pi-ui-foundation`: Pre-resource trust presentation uses the globally selected A1 accent family without loading untrusted project resources.
- `cli-self-update`: Self-update's progress meter uses the effective A1 profile accent.
- `silent-installer`: Fresh and delegated installation progress resolves the same profile selection with a blue fallback and no runtime dependency.

## Impact

Expected work spans settings declarations and default-sensitive tests; a bounded, profile-aware early accent projection; preflight trust rendering; self-update and standalone installer palette handling; and targeted startup/terminal presentation regressions. Progress width, wording, terminal restoration, trust behavior, settings persistence format, and comparison routes do not change.
